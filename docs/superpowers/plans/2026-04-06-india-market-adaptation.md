# India Market Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an autonomous background scanner that discovers Senior PM roles in Bangalore every 2 hours from LinkedIn, Naukri, and 17 Indian company career pages, and delivers Telegram alerts without any Claude Code session running.

**Architecture:** A self-contained `india/` module with a central orchestrator (`scan-india.mjs`) that runs scrapers sequentially, filters results, deduplicates against a JSON store, and sends per-job + summary Telegram messages. Windows Task Scheduler triggers the script every 2 hours. Zero changes to existing career-ops files.

**Tech Stack:** Node.js 18+ (ESM .mjs), Playwright (existing dep), playwright-extra + stealth plugin (new), Telegram Bot API via `fetch`, `node:test` for unit tests, Windows Task Scheduler for scheduling.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `india/filter.mjs` | Create | Pure filtering logic — title/location matching (testable) *(plan-level addition: spec describes this logic inside the orchestrator; extracted here for testability)* |
| `india/dedup.mjs` | Create | URL normalization + JSON dedup store read/write (testable) |
| `india/telegram.mjs` | Create | Format + send Telegram messages (format logic testable) |
| `india/scrapers/websearch.mjs` | Create | DuckDuckGo HTML fetch — no Playwright |
| `india/scrapers/careers.mjs` | Create | Playwright headless — 17 Indian company career pages |
| `india/scrapers/naukri.mjs` | Create | Playwright + Chrome profile — Naukri |
| `india/scrapers/linkedin.mjs` | Create | Playwright + Chrome profile + stealth — LinkedIn Jobs |
| `india/scan-india.mjs` | Create | Orchestrator — load config, run scrapers, filter, dedup, notify |
| `config/companies_india.json` | Create | 17 Indian company career page URLs |
| `config/search_params.json` | Create | Title/location filter keywords |
| `config/telegram_config.json` | Create | Bot token + chat ID (gitignored) |
| `data/scan-history-india.json` | Create | Empty dedup store — `{}` |
| `setup-task-scheduler.bat` | Create | One-time Windows Task Scheduler registration |
| `tests/filter.test.mjs` | Create | Unit tests for filter.mjs |
| `tests/dedup.test.mjs` | Create | Unit tests for dedup.mjs |
| `tests/telegram.test.mjs` | Create | Unit tests for telegram.mjs formatters |
| `package.json` | Modify | Add playwright-extra, stealth plugin, test script |
| `.gitignore` | Modify | Add telegram_config.json, scan-history-india.json |

---

## Task 1: Scaffolding — directories, configs, dependencies

**Files:**
- Create: `config/companies_india.json`
- Create: `config/search_params.json`
- Create: `config/telegram_config.json`
- Create: `data/scan-history-india.json`
- Create: `logs/.gitkeep`
- Create: `tests/.gitkeep`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create `config/companies_india.json`**

```json
[
  { "name": "Flipkart", "careers_url": "https://www.flipkartcareers.com/#!/joblist", "enabled": true },
  { "name": "Swiggy", "careers_url": "https://careers.swiggy.com/#/", "enabled": true },
  { "name": "Zomato", "careers_url": "https://www.zomato.com/careers", "enabled": true },
  { "name": "CRED", "careers_url": "https://careers.cred.club/", "enabled": true },
  { "name": "PhonePe", "careers_url": "https://careers.phonepe.com/", "enabled": true },
  { "name": "Razorpay", "careers_url": "https://razorpay.com/jobs/", "enabled": true },
  { "name": "Zerodha", "careers_url": "https://zerodha.com/careers/", "enabled": true },
  { "name": "Dream11", "careers_url": "https://www.dream11.com/about/careers", "enabled": true },
  { "name": "Meesho", "careers_url": "https://meesho.io/jobs", "enabled": true },
  { "name": "Groww", "careers_url": "https://groww.in/careers", "enabled": true },
  { "name": "Urban Company", "careers_url": "https://www.urbancompany.com/careers", "enabled": true },
  { "name": "Paytm", "careers_url": "https://paytm.com/about-us/careers", "enabled": true },
  { "name": "Ola", "careers_url": "https://www.olacabs.com/careers", "enabled": true },
  { "name": "ShareChat", "careers_url": "https://careers.sharechat.com/", "enabled": true },
  { "name": "Dunzo", "careers_url": "https://www.dunzo.com/careers", "enabled": true },
  { "name": "Porter", "careers_url": "https://porter.in/careers", "enabled": true },
  { "name": "Licious", "careers_url": "https://www.licious.in/careers", "enabled": true }
]
```

- [ ] **Step 2: Create `config/search_params.json`**

```json
{
  "positive_titles": [
    "Senior Product Manager",
    "Sr PM",
    "Sr. PM",
    "SPM",
    "Sr. Product Manager",
    "Senior PM",
    "Lead Product Manager",
    "Principal Product Manager"
  ],
  "negative_titles": [
    "Junior",
    "Intern",
    "Associate",
    "Fresher",
    "Entry",
    "0-2 years",
    "Data Scientist",
    "Engineering Manager",
    "Marketing",
    "Sales",
    "Finance"
  ],
  "locations": ["Bangalore", "Bengaluru", "Karnataka", "Remote"],
  "linkedin_experience_filter": "4",
  "max_pages_per_source": 2
}
```

- [ ] **Step 3: Create `config/telegram_config.json`**

```json
{
  "bot_token": "PASTE_YOUR_BOT_TOKEN_HERE",
  "chat_id": "PASTE_YOUR_CHAT_ID_HERE"
}
```

- [ ] **Step 4: Create `data/scan-history-india.json`**

```json
{}
```

- [ ] **Step 5: Create `logs/.gitkeep` and `tests/.gitkeep`** (empty files, just touch them)

- [ ] **Step 6: Update `.gitignore`** — add these lines at the end:

```
# India scanner
config/telegram_config.json
data/scan-history-india.json
logs/india-scan.log
```

- [ ] **Step 7: Update `package.json`** — add dependencies and test script:

```json
{
  "name": "career-ops",
  "version": "1.0.0",
  "description": "AI-powered job search pipeline built on Claude Code",
  "scripts": {
    "verify": "node verify-pipeline.mjs",
    "normalize": "node normalize-statuses.mjs",
    "dedup": "node dedup-tracker.mjs",
    "merge": "node merge-tracker.mjs",
    "pdf": "node generate-pdf.mjs",
    "sync-check": "node cv-sync-check.mjs",
    "scan-india": "node india/scan-india.mjs",
    "scan-india:dry": "node india/scan-india.mjs --dry-run",
    "test": "node --test tests/*.test.mjs"
  },
  "keywords": ["ai", "job-search", "claude-code", "career", "automation"],
  "author": "Santiago Fernández de Valderrama <hi@santifer.io> (https://santifer.io)",
  "homepage": "https://santifer.io",
  "repository": {
    "type": "git",
    "url": "https://github.com/santifer/career-ops"
  },
  "license": "MIT",
  "dependencies": {
    "playwright": "^1.58.1",
    "playwright-extra": "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2"
  }
}
```

- [ ] **Step 8: Install new dependencies**

Run: `npm install`
Expected: `node_modules/playwright-extra` and `node_modules/puppeteer-extra-plugin-stealth` appear.

- [ ] **Step 9: Commit**

```bash
git add config/companies_india.json config/search_params.json data/scan-history-india.json logs/.gitkeep tests/.gitkeep .gitignore package.json package-lock.json
git commit -m "feat(india): scaffold config files and dependencies"
```

---

## Task 2: Filtering module (pure logic, fully tested)

**Files:**
- Create: `india/filter.mjs`
- Create: `tests/filter.test.mjs`

- [ ] **Step 1: Write failing tests — `tests/filter.test.mjs`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesTitle, matchesLocation, filterJobs } from '../india/filter.mjs';

const params = {
  positive_titles: ['Senior Product Manager', 'Sr PM', 'SPM'],
  negative_titles: ['Junior', 'Intern'],
  locations: ['Bangalore', 'Bengaluru', 'Remote'],
};

test('matchesTitle: accepts Senior Product Manager', () => {
  assert.equal(matchesTitle('Senior Product Manager - Growth', params), true);
});

test('matchesTitle: accepts Sr PM', () => {
  assert.equal(matchesTitle('Sr PM, Payments', params), true);
});

test('matchesTitle: rejects Junior PM', () => {
  assert.equal(matchesTitle('Junior Product Manager', params), false);
});

test('matchesTitle: rejects unrelated title', () => {
  assert.equal(matchesTitle('Software Engineer', params), false);
});

test('matchesTitle: case-insensitive', () => {
  assert.equal(matchesTitle('SENIOR PRODUCT MANAGER', params), true);
});

test('matchesLocation: accepts Bangalore', () => {
  assert.equal(matchesLocation('Bangalore, Karnataka', params), true);
});

test('matchesLocation: accepts Bengaluru', () => {
  assert.equal(matchesLocation('Bengaluru', params), true);
});

test('matchesLocation: rejects Mumbai', () => {
  assert.equal(matchesLocation('Mumbai, Maharashtra', params), false);
});

test('matchesLocation: null location passes through', () => {
  assert.equal(matchesLocation(null, params), true);
});

test('filterJobs: keeps matching, drops non-matching', () => {
  const jobs = [
    { title: 'Senior Product Manager', location: 'Bangalore', jobUrl: 'https://a.com/1', company: 'A', source: 'careers' },
    { title: 'Junior Product Manager', location: 'Bangalore', jobUrl: 'https://a.com/2', company: 'A', source: 'careers' },
    { title: 'Senior Product Manager', location: 'Mumbai',    jobUrl: 'https://a.com/3', company: 'B', source: 'careers' },
  ];
  const result = filterJobs(jobs, params);
  assert.equal(result.length, 1);
  assert.equal(result[0].jobUrl, 'https://a.com/1');
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `node --test tests/filter.test.mjs`
Expected: `ERR_MODULE_NOT_FOUND` (module doesn't exist yet)

- [ ] **Step 3: Implement `india/filter.mjs`**

First, create the `india/` directory if it doesn't exist.

```javascript
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
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `node --test tests/filter.test.mjs`
Expected: `10 passing` (all green)

- [ ] **Step 5: Commit**

```bash
git add india/filter.mjs tests/filter.test.mjs
git commit -m "feat(india): add filtering module with tests"
```

---

## Task 3: Deduplication module

**Files:**
- Create: `india/dedup.mjs`
- Create: `tests/dedup.test.mjs`

- [ ] **Step 1: Write failing tests — `tests/dedup.test.mjs`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, normalizeNaukriUrl, isNew, markSeen } from '../india/dedup.mjs';

test('normalizeUrl: strips query params', () => {
  assert.equal(
    normalizeUrl('https://example.com/job?ref=linkedin&utm_source=google'),
    'https://example.com/job'
  );
});

test('normalizeUrl: strips hash fragment', () => {
  assert.equal(
    normalizeUrl('https://careers.swiggy.com/#/job/123'),
    'https://careers.swiggy.com/'
  );
});

test('normalizeUrl: lowercases', () => {
  assert.equal(
    normalizeUrl('https://Example.COM/Job'),
    'https://example.com/job'
  );
});

test('normalizeNaukriUrl: extracts job ID', () => {
  assert.equal(
    normalizeNaukriUrl('https://www.naukri.com/job-listings-senior-product-manager-12345678'),
    'naukri/12345678'
  );
});

test('normalizeNaukriUrl: falls back to normalizeUrl for no ID', () => {
  const result = normalizeNaukriUrl('https://www.naukri.com/jobs');
  assert.equal(result, 'https://www.naukri.com/jobs');
});

test('isNew: true for unseen URL', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job', source: 'linkedin' };
  assert.equal(isNew(job, store), true);
});

test('isNew: false after markSeen', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job', source: 'linkedin', title: 'PM', company: 'Acme' };
  markSeen(job, store);
  assert.equal(isNew(job, store), false);
});

test('markSeen: normalizes URL before storing', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job?ref=test', source: 'linkedin', title: 'PM', company: 'Acme' };
  markSeen(job, store);
  assert.ok(store['https://example.com/job']);
  assert.ok(!store['https://example.com/job?ref=test']);
});

test('markSeen: stores title and company', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job', source: 'linkedin', title: 'Sr PM', company: 'Swiggy' };
  markSeen(job, store);
  assert.equal(store['https://example.com/job'].title, 'Sr PM');
  assert.equal(store['https://example.com/job'].company, 'Swiggy');
});

test('markSeen naukri: uses job ID key', () => {
  const store = {};
  const job = {
    jobUrl: 'https://www.naukri.com/job-listings-senior-product-manager-99887766',
    source: 'naukri',
    title: 'Sr PM',
    company: 'Flipkart',
  };
  markSeen(job, store);
  assert.ok(store['naukri/99887766']);
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `node --test tests/dedup.test.mjs`
Expected: `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: Implement `india/dedup.mjs`**

```javascript
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
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `node --test tests/dedup.test.mjs`
Expected: `10 passing`

- [ ] **Step 5: Commit**

```bash
git add india/dedup.mjs tests/dedup.test.mjs
git commit -m "feat(india): add dedup module with URL normalization and tests"
```

---

## Task 4: Telegram notifier

**Files:**
- Create: `india/telegram.mjs`
- Create: `tests/telegram.test.mjs`

- [ ] **Step 1: Write failing tests — `tests/telegram.test.mjs`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatJob, formatSummary } from '../india/telegram.mjs';

test('formatJob: includes company', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://careers.swiggy.com/123' });
  assert.ok(text.includes('Swiggy'));
});

test('formatJob: includes title', () => {
  const text = formatJob({ title: 'Senior PM - Growth', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://x.com' });
  assert.ok(text.includes('Senior PM - Growth'));
});

test('formatJob: includes location', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://x.com' });
  assert.ok(text.includes('Bangalore'));
});

test('formatJob: includes URL', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://careers.swiggy.com/123' });
  assert.ok(text.includes('https://careers.swiggy.com/123'));
});

test('formatJob: uses Bangalore when location is null', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: null, jobUrl: 'https://x.com' });
  assert.ok(text.includes('Bangalore'));
});

test('formatSummary: includes new count', () => {
  const text = formatSummary({ newCount: 3, bySource: { linkedin: 1, naukri: 1, careers: 1, websearch: 0 }, errors: [], dryRun: false });
  assert.ok(text.includes('3 new Senior PM roles'));
});

test('formatSummary: includes per-source breakdown', () => {
  const text = formatSummary({ newCount: 2, bySource: { linkedin: 2, naukri: 0, careers: 0, websearch: 0 }, errors: [], dryRun: false });
  assert.ok(text.includes('LinkedIn: 2'));
});

test('formatSummary: shows error line when failures exist', () => {
  const text = formatSummary({ newCount: 1, bySource: { linkedin: 0, naukri: 1, careers: 0, websearch: 0 }, errors: ['LinkedIn (session expired)'], dryRun: false });
  assert.ok(text.includes('⚠️'));
  assert.ok(text.includes('LinkedIn (session expired)'));
});

test('formatSummary: no error line when no failures', () => {
  const text = formatSummary({ newCount: 1, bySource: { linkedin: 1, naukri: 0, careers: 0, websearch: 0 }, errors: [], dryRun: false });
  assert.ok(!text.includes('⚠️'));
});

test('formatSummary: marks dry run in output', () => {
  const text = formatSummary({ newCount: 0, bySource: { linkedin: 0, naukri: 0, careers: 0, websearch: 0 }, errors: [], dryRun: true });
  assert.ok(text.includes('DRY RUN'));
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `node --test tests/telegram.test.mjs`
Expected: `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: Implement `india/telegram.mjs`**

```javascript
// india/telegram.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const path = join(__dirname, '../config/telegram_config.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function sendMessage(text, config) {
  const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: config.chat_id, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}

export function formatJob(job) {
  return [
    '🎯 <b>New Senior PM Role!</b>',
    '',
    `🏢 ${job.company}`,
    `📋 ${job.title}`,
    `📍 ${job.location || 'Bangalore'}`,
    `🔗 ${job.jobUrl}`,
  ].join('\n');
}

export function formatSummary({ newCount, bySource, errors, dryRun }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const lines = [
    `📊 <b>Scan Complete</b> · ${dateStr}${dryRun ? ' (DRY RUN)' : ''}`,
    '',
    `✅ ${newCount} new Senior PM roles found`,
    `🔍 LinkedIn: ${bySource.linkedin ?? 0} · Naukri: ${bySource.naukri ?? 0} · Company pages: ${bySource.careers ?? 0} · Portals: ${bySource.websearch ?? 0}`,
    '⏭ Next scan in 2 hours',
    '',
    'Run /career-ops pipeline to evaluate with ATS scores',
  ];

  if (errors.length > 0) {
    lines.push('');
    lines.push(`⚠️ Failed sources: ${errors.join(', ')}`);
  }

  return lines.join('\n');
}

export async function sendJob(job, dryRun = false) {
  const text = formatJob(job);
  if (dryRun) {
    console.log('[DRY RUN] Job:\n' + text + '\n');
    return;
  }
  const config = loadConfig();
  await sendMessage(text, config);
}

export async function sendSummary(stats, dryRun = false) {
  const text = formatSummary(stats);
  if (dryRun) {
    console.log('[DRY RUN] Summary:\n' + text + '\n');
    return;
  }
  if (stats.newCount === 0) return; // silent on zero new jobs
  const config = loadConfig();
  await sendMessage(text, config);
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `node --test tests/telegram.test.mjs`
Expected: `10 passing`

- [ ] **Step 5: Run all tests together**

Run: `npm test`
Expected: all tests pass across filter, dedup, telegram

- [ ] **Step 6: Commit**

```bash
git add india/telegram.mjs tests/telegram.test.mjs
git commit -m "feat(india): add Telegram notifier with format tests"
```

---

## Task 5: DuckDuckGo WebSearch scraper

**Files:**
- Create: `india/scrapers/websearch.mjs`

No unit tests for this module — it makes live HTTP requests. Verified manually in Task 9 via `--dry-run`.

- [ ] **Step 1: Create `india/scrapers/` directory**

- [ ] **Step 2: Implement `india/scrapers/websearch.mjs`**

```javascript
// india/scrapers/websearch.mjs

const DDGURL = 'https://html.duckduckgo.com/html/';

const QUERIES = [
  { query: 'site:cutshort.io "Senior Product Manager" Bangalore', source: 'cutshort' },
  { query: 'site:wellfound.com "Senior Product Manager" Bangalore', source: 'wellfound' },
  { query: 'site:instahire.in "Senior Product Manager" Bangalore', source: 'instahire' },
];

function extractResults(html) {
  const jobs = [];
  // DDG HTML: result links are in <a class="result__a" href="...">title</a>
  const linkRe = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;
  while ((match = linkRe.exec(html)) !== null) {
    const [, url, rawTitle] = match;
    if (url && rawTitle) {
      jobs.push({ url: url.trim(), title: rawTitle.trim() });
    }
  }
  return jobs;
}

export async function scrapeWebSearch() {
  const jobs = [];

  for (const { query, source } of QUERIES) {
    const body = new URLSearchParams({ q: query });
    let html;

    try {
      const res = await fetch(DDGURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        console.error(`[websearch] ${source}: HTTP ${res.status}`);
        continue;
      }

      html = await res.text();
    } catch (err) {
      console.error(`[websearch] ${source} fetch failed: ${err.message}`);
      continue;
    }

    const results = extractResults(html);
    for (const { url, title } of results) {
      jobs.push({
        title,
        company: source,
        location: 'Bangalore',
        jobUrl: url,
        source: 'websearch',
      });
    }
  }

  return jobs;
}
```

- [ ] **Step 3: Commit**

```bash
git add india/scrapers/websearch.mjs
git commit -m "feat(india): add DuckDuckGo websearch scraper"
```

---

## Task 6: Company career pages scraper (Playwright headless)

**Files:**
- Create: `india/scrapers/careers.mjs`

Verified manually in Task 9 via `--dry-run`.

- [ ] **Step 1: Implement `india/scrapers/careers.mjs`**

```javascript
// india/scrapers/careers.mjs
import { chromium } from 'playwright';

function randomDelay(min = 1500, max = 3000) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

async function resolveHref(href, baseUrl) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

async function scrapeCompany(page, company) {
  const jobs = [];

  await page.goto(company.careers_url, { waitUntil: 'networkidle', timeout: 30000 });
  await randomDelay(1500, 3000);

  if (company.listing_selector && company.title_selector) {
    const listings = await page.$$(company.listing_selector);
    for (const listing of listings) {
      const titleEl = await listing.$(company.title_selector);
      const title = titleEl ? (await titleEl.innerText()).trim() : null;
      const anchor = await listing.$('a');
      const href = anchor ? await anchor.getAttribute('href') : null;
      const jobUrl = await resolveHref(href, company.careers_url);
      if (title && jobUrl) {
        jobs.push({ title, company: company.name, location: 'Bangalore', jobUrl, source: 'careers' });
      }
    }
  } else {
    // Fallback: all anchors — filtering happens later in the orchestrator
    const anchors = await page.$$('a[href]');
    for (const anchor of anchors) {
      const title = (await anchor.innerText().catch(() => '')).trim();
      const href = await anchor.getAttribute('href');
      const jobUrl = await resolveHref(href, company.careers_url);
      if (title && jobUrl && title.length > 3 && title.length < 120) {
        jobs.push({ title, company: company.name, location: 'Bangalore', jobUrl, source: 'careers' });
      }
    }
  }

  return jobs;
}

export async function scrapeCareers(companies) {
  const allJobs = [];
  const errors = [];

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    for (const company of companies.filter(c => c.enabled)) {
      try {
        const jobs = await scrapeCompany(page, company);
        allJobs.push(...jobs);
        console.log(`  [careers] ${company.name}: ${jobs.length} listings`);
      } catch (err) {
        const msg = `${company.name} (${err.message.slice(0, 80)})`;
        errors.push(msg);
        console.error(`  [careers] FAILED: ${msg}`);
      }
    }
  } finally {
    await browser.close();
  }

  return { jobs: allJobs, errors };
}
```

- [ ] **Step 2: Commit**

```bash
git add india/scrapers/careers.mjs
git commit -m "feat(india): add company career pages scraper (Playwright headless)"
```

---

## Task 7: Naukri scraper (Playwright + Chrome profile)

**Files:**
- Create: `india/scrapers/naukri.mjs`

- [ ] **Step 1: Implement `india/scrapers/naukri.mjs`**

```javascript
// india/scrapers/naukri.mjs
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const CHROME_PROFILE = 'C:\\Users\\saxen\\AppData\\Local\\Google\\Chrome\\User Data';
const SEARCH_URL = 'https://www.naukri.com/senior-product-manager-jobs-in-bangalore';

function randomDelay(min = 1500, max = 3000) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

export async function scrapeNaukri() {
  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    headless: false,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--profile-directory=Default',
    ],
  });

  const jobs = [];

  try {
    const page = await context.newPage();
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await randomDelay(2000, 4000);

    // Naukri job listing selectors (current as of 2026)
    const listings = await page.$$('article.jobTuple, div.job-tuple, .srp-jobtuple-wrapper');
    console.log(`  [naukri] found ${listings.length} listing elements`);

    for (const listing of listings) {
      const titleEl = await listing.$('a.title, .jobTupleHeader a, h2.title a');
      const companyEl = await listing.$('.comp-name, .companyInfo a');
      const locationEl = await listing.$('.loc, .locWdth, .ellipsis.fleft');

      const title = titleEl ? (await titleEl.innerText()).trim() : null;
      const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown';
      const location = locationEl ? (await locationEl.innerText()).trim() : 'Bangalore';
      const href = titleEl ? await titleEl.getAttribute('href') : null;

      if (title && href) {
        const jobUrl = href.startsWith('http') ? href : `https://www.naukri.com${href}`;
        jobs.push({ title, company, location, jobUrl, source: 'naukri' });
      }
    }
  } finally {
    await context.close();
  }

  return jobs;
}
```

- [ ] **Step 2: Commit**

```bash
git add india/scrapers/naukri.mjs
git commit -m "feat(india): add Naukri scraper using Chrome profile"
```

---

## Task 8: LinkedIn scraper (Playwright + Chrome profile + stealth)

**Files:**
- Create: `india/scrapers/linkedin.mjs`

- [ ] **Step 1: Implement `india/scrapers/linkedin.mjs`**

```javascript
// india/scrapers/linkedin.mjs
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const CHROME_PROFILE = 'C:\\Users\\saxen\\AppData\\Local\\Google\\Chrome\\User Data';

// Two location variants to cover both spellings
const SEARCH_URLS = [
  'https://www.linkedin.com/jobs/search/?keywords=Senior%20Product%20Manager&location=Bangalore%2C%20Karnataka%2C%20India&f_E=4&f_JT=F',
  'https://www.linkedin.com/jobs/search/?keywords=Senior%20Product%20Manager&location=Bengaluru%2C%20Karnataka%2C%20India&f_E=4&f_JT=F',
];

function randomDelay(min = 1500, max = 3000) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

async function scrollAndLoad(page, passes = 3) {
  for (let i = 0; i < passes; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await randomDelay(1000, 2000);
  }
}

export async function scrapeLinkedIn() {
  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    headless: false,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--profile-directory=Default',
    ],
  });

  const jobs = [];

  try {
    const page = await context.newPage();

    for (const url of SEARCH_URLS) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await randomDelay(2000, 3500);
      await scrollAndLoad(page, 3);

      // LinkedIn job card selectors
      const cards = await page.$$('li.jobs-search-results__list-item, .job-card-container, .base-card');
      console.log(`  [linkedin] ${url.includes('Bengaluru') ? 'Bengaluru' : 'Bangalore'}: ${cards.length} cards`);

      for (const card of cards) {
        const titleEl = await card.$('.job-card-list__title, .base-search-card__title, h3.base-search-card__title');
        const companyEl = await card.$('.job-card-container__company-name, .base-search-card__subtitle, h4');
        const locationEl = await card.$('.job-card-container__metadata-item, .job-search-card__location, .base-search-card__metadata');
        const anchor = await card.$('a[href*="/jobs/view/"]');

        const title = titleEl ? (await titleEl.innerText()).trim() : null;
        const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown';
        const location = locationEl ? (await locationEl.innerText()).trim() : 'Bangalore';
        const href = anchor ? await anchor.getAttribute('href') : null;

        if (title && href) {
          // Strip tracking params — keep only the clean job URL
          const jobUrl = href.split('?')[0];
          jobs.push({ title, company, location, jobUrl, source: 'linkedin' });
        }
      }

      await randomDelay(2000, 4000); // pause between location variants
    }
  } finally {
    await context.close();
  }

  return jobs;
}
```

- [ ] **Step 2: Commit**

```bash
git add india/scrapers/linkedin.mjs
git commit -m "feat(india): add LinkedIn scraper using Chrome profile and stealth"
```

---

## Task 9: Orchestrator — scan-india.mjs

**Files:**
- Create: `india/scan-india.mjs`

- [ ] **Step 1: Implement `india/scan-india.mjs`**

```javascript
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
```

- [ ] **Step 2: Add your Telegram bot token and chat ID**

Open `config/telegram_config.json` and replace the placeholders with your real values:
```json
{
  "bot_token": "YOUR_ACTUAL_BOT_TOKEN",
  "chat_id": "YOUR_ACTUAL_CHAT_ID"
}
```

- [ ] **Step 3: Run a dry run to verify the full pipeline (no Telegram messages sent, no dedup writes)**

Run: `npm run scan-india:dry`

Expected output:
```
[...] === India Scan Start [DRY RUN] ===
[...] Starting linkedin...
[...] Starting naukri...
[...] Starting careers...
[...] Starting websearch...
[...] Total raw: N — filtering for Senior PM / Bangalore...
[...] Filtered: M matching
[DRY RUN] Job:
🎯 New Senior PM Role!
...
[DRY RUN] Summary:
📊 Scan Complete · ...
[...] === Scan Complete: M new jobs found ===
```

Chrome will open briefly for LinkedIn and Naukri — this is expected.

- [ ] **Step 4: Verify no errors in the output** — if a scraper fails, troubleshoot before proceeding to Task 10

- [ ] **Step 5: Run a live scan (sends real Telegram messages)**

Run: `npm run scan-india`

Check your Telegram channel — you should receive individual job messages followed by a summary.

- [ ] **Step 6: Commit**

```bash
git add india/scan-india.mjs
git commit -m "feat(india): add orchestrator with dry-run support"
```

---

## Task 10: Windows Task Scheduler setup

**Files:**
- Create: `setup-task-scheduler.bat`

- [ ] **Step 1: Create `setup-task-scheduler.bat`**

```batch
@echo off
setlocal

echo ================================================
echo  Career-Ops India Scan — Task Scheduler Setup
echo ================================================
echo.

:: Check Node.js version
for /f "tokens=1" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
if "%NODE_VER%"=="" (
    echo ERROR: Node.js not found. Install Node.js 18+ first.
    pause
    exit /b 1
)
echo Node.js version: %NODE_VER%

set TASK_NAME=CareerOpsIndiaScan
set SCRIPT_PATH=C:\Users\saxen\career-ops\india\scan-india.mjs
set NODE_EXE=node

echo.
echo Creating scheduled task: %TASK_NAME%
echo Script: %SCRIPT_PATH%
echo Schedule: Every 2 hours
echo.

schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "%NODE_EXE% \"%SCRIPT_PATH%\"" ^
  /sc hourly ^
  /mo 2 ^
  /rl HIGHEST ^
  /f

if %errorlevel% == 0 (
    echo.
    echo SUCCESS: Task created.
    echo.
    echo Useful commands:
    echo   Run now:  schtasks /run /tn "%TASK_NAME%"
    echo   Status:   schtasks /query /tn "%TASK_NAME%"
    echo   Delete:   schtasks /delete /tn "%TASK_NAME%" /f
    echo.
    echo Logs: career-ops\logs\india-scan.log
) else (
    echo.
    echo FAILED: Could not create task.
    echo Make sure you ran this script as Administrator.
)

echo.
pause
endlocal
```

- [ ] **Step 2: Run `setup-task-scheduler.bat` as Administrator**

Right-click the file → "Run as administrator"

Expected output:
```
SUCCESS: Task created.
Run now: schtasks /run /tn "CareerOpsIndiaScan"
```

- [ ] **Step 3: Trigger a test run via Task Scheduler**

Run in terminal: `schtasks /run /tn "CareerOpsIndiaScan"`

Wait 1–2 minutes. Check:
- `logs/india-scan.log` has a new entry
- Telegram received job messages + summary

- [ ] **Step 4: Commit**

```bash
git add setup-task-scheduler.bat
git commit -m "feat(india): add Task Scheduler setup script"
```

---

## Task 11: Final — push to GitHub

- [ ] **Step 1: Verify all tests pass**

Run: `npm test`
Expected: all passing

- [ ] **Step 2: Push to your fork**

```bash
git push origin main
```

---

## Troubleshooting Reference

| Problem | Fix |
|---|---|
| LinkedIn shows login page | Chrome profile session expired — log in manually via Chrome, then re-run |
| Naukri shows captcha | Same — open Naukri in Chrome, solve captcha, then re-run |
| `playwright-extra` import error | Run `npm install` again |
| Task Scheduler shows "Last Run Result: 0x1" | Check `logs/india-scan.log` for the error; often a path issue |
| No Telegram messages | Verify `config/telegram_config.json` has real token and chat ID |
| `Cannot find module` errors | Ensure you're running from `C:\Users\saxen\career-ops` as working directory |
| Chrome profile locked | Close all Chrome windows before running the scraper |
