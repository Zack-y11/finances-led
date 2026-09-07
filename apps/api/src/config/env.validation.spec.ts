import { validateEnvironment } from './env.validation.js';

const required = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/finance_ledger',
  DEV_USER_ID: '1b58fb29-1f33-43d8-bdf0-b70844c20045',
};

describe('validateEnvironment AI provider', () => {
  it('defaults AI_PROVIDER to openrouter', () => {
    const env = validateEnvironment(required);
    expect(env.AI_PROVIDER).toBe('openrouter');
  });

  it('normalizes deprecated openai to openrouter', () => {
    const env = validateEnvironment({
      ...required,
      AI_PROVIDER: 'openai',
    });
    expect(env.AI_PROVIDER).toBe('openrouter');
  });

  it('rejects unknown AI providers', () => {
    expect(() =>
      validateEnvironment({
        ...required,
        AI_PROVIDER: 'anthropic',
      }),
    ).toThrow('AI_PROVIDER must be openrouter or openai');
  });
});
