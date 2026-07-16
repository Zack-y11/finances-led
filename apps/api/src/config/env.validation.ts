type EnvironmentConfig = Record<string, unknown>;

type ValidatedEnvironment = EnvironmentConfig & {
  DATABASE_URL: string;
  DEV_USER_ID: string;
  PORT: number;
  HOST: string;
  CORS_ORIGIN: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(
  config: EnvironmentConfig,
  key: string,
): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requireString(config: EnvironmentConfig, key: string): string {
  const value = readString(config, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function parsePort(config: EnvironmentConfig): number {
  const rawPort = readString(config, 'PORT') ?? '3001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

function parseHttpUrl(value: string, key: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
    return value;
  } catch {
    throw new Error(`${key} must be a valid http(s) URL`);
  }
}

function parseDatabaseUrl(config: EnvironmentConfig): string {
  const databaseUrl = requireString(config, 'DATABASE_URL');
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      throw new Error('invalid protocol');
    }
    return databaseUrl;
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
}

function parseDevUserId(config: EnvironmentConfig): string {
  const userId = requireString(config, 'DEV_USER_ID');
  if (!uuidPattern.test(userId)) {
    throw new Error('DEV_USER_ID must be a UUID');
  }
  return userId;
}

export function validateEnvironment(
  config: EnvironmentConfig,
): ValidatedEnvironment {
  return {
    ...config,
    DATABASE_URL: parseDatabaseUrl(config),
    DEV_USER_ID: parseDevUserId(config),
    PORT: parsePort(config),
    HOST: readString(config, 'HOST') ?? '0.0.0.0',
    CORS_ORIGIN: parseHttpUrl(
      readString(config, 'CORS_ORIGIN') ?? 'http://localhost:3000',
      'CORS_ORIGIN',
    ),
  };
}
