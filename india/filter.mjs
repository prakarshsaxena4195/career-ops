// india/filter.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadSearchParams() {
  const configPath = join(__dirname, '../config/search_params.json');
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (err) {
    throw new Error(`search_params.json missing or malformed at ${configPath}: ${err.message}`);
  }
}

export function matchesTitle(title, params) {
  const lower = title.toLowerCase();
  const hasPositive = params.positive_titles.some(kw => lower.includes(kw.toLowerCase()));
  const hasNegative = params.negative_titles.some(kw => lower.includes(kw.toLowerCase()));
  return hasPositive && !hasNegative;
}

export function matchesLocation(location, params) {
  if (location == null) return true;
  const lower = location.toLowerCase();
  return params.locations.some(loc => lower.includes(loc.toLowerCase()));
}

export function filterJobs(jobs, params) {
  return jobs.filter(job =>
    matchesTitle(job.title, params) && matchesLocation(job.location, params)
  );
}
