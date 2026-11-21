export interface JobClaim {
  jobId: string;
  jobType: string;
  payload: unknown;
  attempt: number;
  leaseToken: string;
}

export interface JobHandlerResult {
  succeeded: boolean;
  error?: string;
}
