export type TradeMode = 'synthetic' | 'manual' | 'live' | 'delayed' | 'replay';

export interface TradeConfig {
  mode: TradeMode;
  host: string;
  apiPort: number;
  webPort: number;
  exchangeTimezone: 'Asia/Kolkata';
  databaseUrl: string;
  capabilities: {
    liveBroker: boolean;
    liveMarketData: boolean;
    automaticAgents: boolean;
  };
}

function positivePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port configuration: ${value}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv): TradeConfig {
  const rawMode = env.TRADE_MODE ?? 'manual';
  const mode: TradeMode = ['synthetic', 'manual', 'live', 'delayed', 'replay'].includes(rawMode)
    ? rawMode as TradeMode
    : 'synthetic';

  return {
    mode,
    host: env.HOST === '127.0.0.1' || env.HOST === 'localhost' ? env.HOST : 'localhost',
    apiPort: positivePort(env.API_PORT, 3000),
    webPort: positivePort(env.WEB_PORT, 3001),
    exchangeTimezone: 'Asia/Kolkata',
    databaseUrl: env.DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5433/trade',
    capabilities: {
      liveBroker: mode === 'live' && Boolean(env.KITE_API_KEY),
      liveMarketData: mode === 'live' && Boolean(env.MARKET_DATA_TOKEN),
      automaticAgents: Boolean(env.LLM_API_KEY)
    }
  };
}

export function utcNow(now: () => Date = () => new Date()): Date {
  return new Date(now().toISOString());
}
