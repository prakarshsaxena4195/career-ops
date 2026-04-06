// india/scan-india.mjs
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

import { scrapeLinkedIn } from './scrapers/linkedin.mjs';
import { scrapeNaukri } from './scrapers/naukri.mjs';
import { scrapeCareers } from './scrapers/careers.mjs';
import { scrapeWebSearch } from './scrapers/websearch.mjs';
import { filterJobs, loadSearchParams } from './filter.mjs';
import { loadStore, saveStore, isNew, markSeen } from './dedup.mjs';
import { sendJob, sendSummary } from './telegram.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const LOG_PATH = join(__dirname, '../logs/india-scan.log');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_PATH, line + '\n', 'utf8');
}

function loadJson(name) {
  return JSON.parse(readFileSync(join(__dirname, `../config/${name}`), 'utf8'));
}

// Run scraper safely — returns { jobs, errors } regardless of failure
async function runScraper(label, fn) {
  try {
    log(`Starting ${label}...`);
    const raw = await fn();
    const jobs = Array.isArray(raw) ? raw : (raw.jobs ?? []);
    const errors = Array.isArray(raw) ? [] : (raw.errors ?? []);
    log(`${label}: ${jobs.length} raw listings, ${errors.length} sub-errors`);
    return { jobs, errors };
  } catch (err) {
    log(`${label} FAILED: ${err.message}`);
    return { jobs: [], errors: [`${label} (${err.message.slice(0, 80)})`] };
  }
}

async function main() {
  ensureDir(join(__dirname, '../logs'));
  ensureDir(join(__dirname, '../data'));

  log(`=== India Scan Start${DRY_RUN ? ' [DRY RUN]' : ''} ===`);

  const params = loadSearchParams();
  const companies = loadJson('companies_india.json');
  const store = loadStore();

  const allErrors = [];
  const bySource = { linkedin: 0, naukri: 0, careers: 0, websearch: 0 };

  // Scrapers run sequentially — LinkedIn and Naukri share the Chrome profile
  // and cannot run in parallel (would conflict over the same profile lock)
  const liResult = await runScraper('linkedin', () => scrapeLinkedIn());
  const nkResult = await runScraper('naukri', () => scrapeNaukri());
  const caResult = await runScraper('careers', () => scrapeCareers(companies));
  const wsResult = await runScraper('websearch', () => scrapeWebSearch());

  allErrors.push(
    ...liResult.errors,
    ...nkResult.errors,
    ...caResult.errors,
    ...wsResult.errors,
  );

  const allRaw = [
    ...liResult.jobs,
    ...nkResult.jobs,
    ...caResult.jobs,
    ...wsResult.jobs,
  ];

  log(`Total raw: ${allRaw.length} — filtering for Senior PM / Bangalore...`);
  const filtered = filterJobs(allRaw, params);
  log(`Filtered: ${filtered.length} matching`);

  let newCount = 0;
  for (const job of filtered) {
    if (isNew(job, store)) {
      markSeen(job, store);
      bySource[job.source] = (bySource[job.source] ?? 0) + 1;
      newCount++;
      await sendJob(job, DRY_RUN);
    }
  }

  if (!DRY_RUN) saveStore(store);

  await sendSummary({ newCount, bySource, errors: allErrors, dryRun: DRY_RUN });

  log(`=== Scan Complete: ${newCount} new jobs found ===`);
}

main().catch(err => {
  console.error('Fatal error in scan-india.mjs:', err);
  process.exit(1);
});
