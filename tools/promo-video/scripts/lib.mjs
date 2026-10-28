import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function dependency(name) {
  const local = createRequire(import.meta.url);
  try { return local(name); } catch (error) {
    if (!process.env.HAZLO_NODE_MODULES) throw error;
    return local(path.join(process.env.HAZLO_NODE_MODULES, name));
  }
}
export const chromeOptions = {
  headless: true,
  chromiumSandbox: true,
  ...(process.env.HAZLO_CHROME ? { executablePath: process.env.HAZLO_CHROME } : { channel: 'chrome' }),
  args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
};
