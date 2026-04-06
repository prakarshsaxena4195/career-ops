// india/dedup.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = join(__dirname, '../data/scan-history-india.json');

export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    url.search = '';
    return url.toString().toLowerCase();
  } catch {
    return rawUrl.toLowerCase();
  }
}

export function normalizeNaukriUrl(rawUrl) {
  const match = rawUrl.match(/(\d{6,})/);
  if (match) return `naukri/${match[1]}`;
  return normalizeUrl(rawUrl);
}

export function loadStore() {
  if (!existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export function saveStore(store) {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function getKey(job) {
  return job.source === 'naukri'
    ? normalizeNaukriUrl(job.jobUrl)
    : normalizeUrl(job.jobUrl);
}

export function isNew(job, store) {
  return !store[getKey(job)];
}

export function markSeen(job, store) {
  store[getKey(job)] = {
    firstSeen: new Date().toISOString(),
    title: job.title,
    company: job.company,
  };
  return store;
}
