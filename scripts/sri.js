#!/usr/bin/env node
import { createReadStream, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist', 'index.global.js');

async function main() {
  const hash = createHash('sha384');
  await pipeline(createReadStream(distPath), hash);
  const digest = hash.digest('base64');
  const sri = `sha384-${digest}`;
  console.log(sri);
  const outPath = join(__dirname, '..', 'dist', 'sri.json');
  writeFileSync(outPath, JSON.stringify({ 'index.global.js': sri }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
