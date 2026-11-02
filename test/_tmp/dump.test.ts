import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import app from '../../src/index';
import { mockGitHub, testEnv } from '../helpers';
const OUT = process.env.DUMP_DIR as string;
const paths: [string, string][] = JSON.parse(process.env.DUMP_PATHS as string);
it('dump', async () => {
  mockGitHub({ calendarDays: 400 });
  const env = testEnv();
  for (const [name, p] of paths) writeFileSync(`${OUT}/${name}.svg`, await (await app.request(p, {}, env)).text());
  writeFileSync(`${OUT}/index.html`, `<!doctype html><body style="background:#888;margin:0;padding:8px">${paths.map(([n]) => `<div style="display:inline-block;vertical-align:top;margin:6px"><img src="${n}.svg" style="max-width:860px"></div>`).join('')}</body>`);
});
