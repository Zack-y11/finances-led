import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({
  path: fileURLToPath(new URL('../../../.env.local', import.meta.url)),
  override: true,
  quiet: true,
});
