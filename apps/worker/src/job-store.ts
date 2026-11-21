import type { PoolClient } from 'pg';
import type { JobClaim } from '../../../packages/contracts/src/jobs.js';

export async function claimNextJob(client: PoolClient, now: Date, leaseSeconds = 60): Promise<JobClaim | null> {
  const leaseToken = crypto.randomUUID();
  const result = await client.query(`
    UPDATE jobs
    SET status = 'running', attempts = attempts + 1,
        lease_token = $1,
        lease_expires_at = $2,
        updated_at = $3
    WHERE job_id = (
      SELECT job_id FROM jobs
      WHERE status = 'pending'
         OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < $3)
      ORDER BY available_at, created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING job_id, job_type, payload, attempts, lease_token
  `, [leaseToken, new Date(now.getTime() + leaseSeconds * 1000), now]);

  if (!result.rows[0]) return null;
  return {
    jobId: result.rows[0].job_id,
    jobType: result.rows[0].job_type,
    payload: result.rows[0].payload,
    attempt: result.rows[0].attempts,
    leaseToken: result.rows[0].lease_token
  };
}

export async function completeJob(client: PoolClient, jobId: string, leaseToken: string): Promise<boolean> {
  const result = await client.query(`
    UPDATE jobs SET status = 'completed', lease_token = NULL, lease_expires_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
    WHERE job_id = $1 AND lease_token = $2
  `, [jobId, leaseToken]);
  return (result.rowCount ?? 0) === 1;
}

export async function failJob(client: PoolClient, jobId: string, leaseToken: string, error: string): Promise<void> {
  await client.query(`
    UPDATE jobs
    SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
        available_at = CASE WHEN attempts >= max_attempts THEN available_at ELSE CURRENT_TIMESTAMP + INTERVAL '30 seconds' END,
        lease_token = NULL,
        lease_expires_at = NULL,
        last_error = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE job_id = $1 AND lease_token = $2
  `, [jobId, leaseToken, error]);
}
