// india/filter.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadSearchParams() {
  const path = join(__dirname, '../config/search_params.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function matchesTitle(title, params) {
  const lower = title.toLowerCase();
  const hasPositive = params.positive_titles.some(kw => lower.includes(kw.toLowerCase()));
  const hasNegative = params.negative_titles.some(kw => lower.includes(kw.toLowerCase()));
  return hasPositive && !hasNegative;
}

export function matchesLocation(location, params) {
  if (!location) return true;
  const lower = location.toLowerCase();
  return params.locations.some(loc => lower.includes(loc.toLowerCase()));
}

export function filterJobs(jobs, params) {
  return jobs.filter(job =>
    matchesTitle(job.title, params) && matchesLocation(job.location, params)
  );
}
