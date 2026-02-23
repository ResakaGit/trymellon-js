#!/usr/bin/env node
/**
 * Run actionlint on .github/workflows. If actionlint is not in PATH, downloads
 * the binary from GitHub releases to scripts/.cache/actionlint and runs it.
 * Usage: node scripts/run-actionlint.cjs [args...]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const https = require('https');

const CACHE_DIR = path.join(__dirname, '.cache', 'actionlint');
const BINARY_PATH = path.join(CACHE_DIR, 'actionlint');
const VERSION = '1.7.10';
const REPO = 'rhysd/actionlint';

function getPlatformAsset() {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  if (os === 'windows') return { ext: 'zip', name: `actionlint_${VERSION}_windows_${arch}.zip` };
  return { ext: 'tar.gz', name: `actionlint_${VERSION}_${os}_${arch}.tar.gz` };
}

function runActionlint(binary, args) {
  const result = spawnSync(binary, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(result.status ?? 1);
}

function tryPath(p) {
  try {
    if (fs.statSync(p).isFile()) return p;
  } catch (_) {}
  return null;
}

function download(url, filename) {
  return new Promise((resolve, reject) => {
    const file = path.join(CACHE_DIR, filename);
    const stream = fs.createWriteStream(file);
    https.get(url, { headers: { 'User-Agent': 'Node' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        download(res.headers.location, filename).then(resolve).catch(reject);
        return;
      }
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(file); });
    }).on('error', reject);
  });
}

function extractTarGz(archivePath, outDir) {
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', outDir], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('tar extract failed');
}

function extractZip(archivePath, outDir) {
  const result = spawnSync('unzip', ['-o', archivePath, '-d', outDir], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('unzip failed');
}

(async () => {
  const args = (function resolveArgs() {
    const raw = process.argv.slice(2);
    if (raw.length === 0) {
      const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
      return fs.existsSync(workflowsDir)
        ? fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).map((f) => path.join('.github', 'workflows', f))
        : ['.github/workflows'];
    }
    const args = [];
    for (const a of raw) {
      const full = path.isAbsolute(a) ? a : path.join(process.cwd(), a);
      if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
        const files = fs.readdirSync(full).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
        for (const f of files) args.push(path.join(a, f));
      } else {
        args.push(a);
      }
    }
    return args.length ? args : ['.github/workflows'];
  })();
  const fromCache = tryPath(BINARY_PATH);
  if (fromCache) {
    runActionlint(fromCache, args);
    return;
  }
  const fromPath = spawnSync('actionlint', ['-version'], { encoding: 'utf8', stdio: 'pipe' });
  if (fromPath.status === 0) {
    runActionlint('actionlint', args);
    return;
  }
  const { name, ext } = getPlatformAsset();
  const url = `https://github.com/${REPO}/releases/download/v${VERSION}/${name}`;
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.error('Downloading actionlint from GitHub...');
  const archivePath = await download(url, name);
  if (ext === 'tar.gz') {
    extractTarGz(archivePath, CACHE_DIR);
    let binPath = path.join(CACHE_DIR, 'actionlint');
    if (!fs.existsSync(binPath)) {
      const entries = fs.readdirSync(CACHE_DIR, { withFileTypes: true });
      const subdir = entries.find((e) => e.isDirectory() && e.name.startsWith('actionlint'));
      if (subdir) binPath = path.join(CACHE_DIR, subdir.name, 'actionlint');
    }
    if (binPath !== BINARY_PATH && fs.existsSync(binPath)) {
      fs.renameSync(binPath, BINARY_PATH);
    }
  } else {
    extractZip(archivePath, CACHE_DIR);
    const exe = path.join(CACHE_DIR, 'actionlint.exe');
    if (fs.existsSync(exe)) fs.renameSync(exe, BINARY_PATH);
  }
  try { fs.unlinkSync(archivePath); } catch (_) {}
  fs.chmodSync(BINARY_PATH, 0o755);
  runActionlint(BINARY_PATH, args);
})().catch((err) => {
  console.error('run-actionlint:', err.message);
  process.exit(1);
});
