# Design: India Market Adaptation for career-ops

**Date:** 2026-04-06
**Status:** Approved
**Scope:** Add autonomous background job scanner for Senior PM roles in Bangalore, with Telegram notifications. Purely additive — no existing files modified.

---

## 1. Objective

Extend career-ops to discover Senior Product Manager roles in Bangalore/Bengaluru from Indian companies and job portals, running autonomously every 2 hours via Windows Task Scheduler, and delivering real-time alerts via Telegram.

---

## 2. Architecture

Self-contained `india/` module. Zero changes to existing modes, configs, or scripts.

```
career-ops/
├── india/
│   ├── scan-india.mjs           # Orchestrator — runs scrapers, deduplicates, notifies
│   ├── scrapers/
│   │   ├── linkedin.mjs         # Playwright + Chrome profile → LinkedIn Jobs
│   │   ├── naukri.mjs           # Playwright + Chrome profile → Naukri
│   │   ├── careers.mjs          # Playwright headless → Indian company career pages
│   │   └── websearch.mjs        # DuckDuckGo HTML search → Cutshort, Wellfound, etc.
│   ├── telegram.mjs             # Telegram Bot API — per-job + summary messages
│   └── dedup.mjs                # Read/write dedup store
├── config/
│   ├── companies_india.json     # Indian company career page URLs + selector hints
│   ├── search_params.json       # Role title variants, location filter, negative keywords
│   └── telegram_config.json     # Bot token + chat ID (gitignored)
├── data/
│   └── scan-history-india.json  # Seen job URLs with first-seen timestamp
├── logs/
│   └── india-scan.log           # Appended per run (date, source, counts, errors)
└── setup-task-scheduler.bat     # One-time Windows Task Scheduler registration
```

### Runtime Flow

```
scan-india.mjs (entry point)
  ├── Load config/search_params.json + config/companies_india.json
  ├── Run scrapers in sequence:
  │   ├── linkedin.mjs     → raw job array
  │   ├── naukri.mjs       → raw job array
  │   ├── careers.mjs      → raw job array (per company in companies_india.json)
  │   └── websearch.mjs    → raw job array
  ├── Filter all results (title/location filters from search_params.json)
  ├── Deduplicate via dedup.mjs (check + write scan-history-india.json)
  ├── For each new job → telegram.mjs sendJob()
  ├── telegram.mjs sendSummary() (only if ≥1 new job found)
  └── Append to logs/india-scan.log
```

---

## 3. Scheduling

**Mechanism:** Windows Task Scheduler (native, survives reboots, runs without terminal open)

**Minimum Node.js version:** 18.0.0 (required for native `.mjs` ESM support without flags)

**Trigger:** Every 2 hours, daily, starting from first run

**Action:** `node C:\Users\saxen\career-ops\india\scan-india.mjs`

**Setup:** `setup-task-scheduler.bat` registers the task via `schtasks /create` — run once as Administrator. Includes `/RL HIGHEST` flag so it runs even when PC is locked.

**Logging:** Each run appends a timestamped entry to `logs/india-scan.log`.

---

## 4. Scraping Strategy

### 4a. LinkedIn Jobs — Playwright + Chrome Profile

- Launch Chrome using existing user profile: `C:\Users\saxen\AppData\Local\Google\Chrome\User Data`
- Navigate to LinkedIn Jobs search with encoded query params:
  - `keywords=Senior+Product+Manager&location=Bangalore&f_E=4` (Senior level filter)
  - Second pass: `location=Bengaluru`
- Scroll to load all visible results (up to 25 per page, 2 pages max)
- Extract per listing: `title`, `company`, `location`, `jobUrl`
- Human delays: random 1.5–3s between scroll actions
- Close browser after extraction

### 4b. Naukri.com — Playwright + Chrome Profile

- Same Chrome profile (existing Naukri session)
- Navigate to Naukri search: `naukri.com/senior-product-manager-jobs-in-bangalore`
- Extract per listing: `title`, `company`, `location`, `jobUrl`
- Human delays applied

### 4c. Indian Company Career Pages — Playwright Headless

Companies defined in `config/companies_india.json` (see Section 8 for authoritative list — 17 companies):

Flipkart, Swiggy, Zomato, CRED, PhonePe, Paytm, Razorpay, Zerodha, Dream11, Urban Company, Meesho, ShareChat, Groww, Dunzo, Ola, Porter, Licious

**Extraction strategy per company:**

Each company entry in `companies_india.json` includes optional `listing_selector` and `title_selector` fields:

- If `listing_selector` is provided: use it to locate job listing elements, extract `title` from `title_selector` within each, and `href` from the nearest anchor.
- If no selector is provided (fallback): extract all `<a>` anchor tags from the page, then filter by title keywords from `search_params.json` to identify job links.

Per company: navigate to `careers_url`, apply selector strategy, apply title + location filter locally.

### 4d. Other Portals — DuckDuckGo HTML Search

`websearch.mjs` uses Node.js built-in `fetch` to query DuckDuckGo's HTML endpoint — no API key required, no browser needed:

```
GET https://html.duckduckgo.com/html/?q=site:cutshort.io+"Senior+Product+Manager"+Bangalore
```

Queries run for each portal:
- `site:cutshort.io "Senior Product Manager" Bangalore`
- `site:wellfound.com "Senior Product Manager" Bangalore`
- `site:instahire.in "Senior Product Manager" Bangalore`

Response HTML is parsed with regex to extract result titles and URLs. No Playwright dependency for this scraper.

---

## 5. Filtering

Defined in `config/search_params.json`.

**Positive title keywords** (at least one must match, case-insensitive):
```
Senior Product Manager, Sr PM, Sr. PM, SPM, Sr. Product Manager,
Senior PM, Lead Product Manager, Principal Product Manager
```

**Negative title keywords** (any match = exclude):
```
Junior, Intern, Associate, Fresher, Entry, 0-2 years, Data Scientist,
Engineering Manager, Marketing, Sales, Finance
```

**Location filter** (at least one must match):
```
Bangalore, Bengaluru, Karnataka, Remote
```

---

## 6. Deduplication

**Store:** `data/scan-history-india.json`

**Key:** Normalized job URL, computed as:
1. Parse URL
2. Remove all query parameters
3. Remove hash fragment (e.g., `#/` in Swiggy, `#!/joblist` in Flipkart)
4. Lowercase the full URL
5. For Naukri URLs: extract the numeric job ID from the path (e.g., `/job-listings-senior-product-manager-12345678` → key is `naukri/12345678`) to handle redirect wrappers and tracking variants

**Value:** `{ firstSeen: ISO timestamp, title, company }`

Before sending any Telegram alert: check if key exists in store. If new: write to store immediately, then notify. If seen: skip silently.

The store is append-only (URLs are never removed) to prevent re-alerting old jobs.

---

## 7. Telegram Notifications

**Per new job** (one message per listing):
```
🎯 New Senior PM Role!

🏢 [Company]
📋 [Job Title]
📍 [Location]
🔗 [Apply URL]
```

**End-of-scan summary** (sent once per run, only if ≥1 new job found):
```
📊 Scan Complete · [DD Mon, HH:MM]

✅ [N] new Senior PM roles found
🔍 LinkedIn: [n] · Naukri: [n] · Company pages: [n] · Portals: [n]
⏭ Next scan in 2 hours

Run /career-ops pipeline to evaluate with ATS scores
```

**If one or more sources failed**, an additional error line is appended to the summary:
```
⚠️ Failed sources: LinkedIn (session expired), Naukri (timeout)
```

**Zero new jobs:** No message sent (avoids notification noise).

**Scraper errors:** If a source fails, scan continues with remaining sources. Failed source names and error reasons are collected and included in the summary error line and in the log.

---

## 8. Configuration Files

### `config/telegram_config.json` (gitignored)
```json
{
  "bot_token": "YOUR_BOT_TOKEN",
  "chat_id": "YOUR_CHAT_ID"
}
```

### `config/search_params.json`
```json
{
  "positive_titles": ["Senior Product Manager", "Sr PM", "Sr. PM", "SPM", "Lead Product Manager"],
  "negative_titles": ["Junior", "Intern", "Associate", "Fresher", "Entry"],
  "locations": ["Bangalore", "Bengaluru", "Karnataka", "Remote"],
  "linkedin_experience_filter": "4",
  "max_pages_per_source": 2
}
```

### `config/companies_india.json`

Each entry has: `name`, `careers_url`, `enabled`, and optional `listing_selector` + `title_selector`. If selectors are omitted, the fallback anchor-scraping strategy is used.

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

---

## 9. Dependencies

**Minimum Node.js version:** 18.0.0

New packages to add to `package.json`:

```json
{
  "playwright-extra": "^4.3.6",
  "puppeteer-extra-plugin-stealth": "^2.11.2"
}
```

`playwright` is already a dependency (used by `generate-pdf.mjs`) — no version change needed.

`websearch.mjs` uses Node.js built-in `fetch` (available since Node 18) — no additional package needed.

---

## 10. Out of Scope

- ATS score computation in background (Option A chosen — raw discovery only)
- Resume auto-application
- Multi-city support
- LinkedIn/Naukri credential login (Chrome profile used instead)
- Modifying any existing career-ops modes or scripts
- External search API subscriptions (Serper, SerpAPI, Bing Search)

---

## 11. Success Criteria

- Background scan runs every 2 hours without any terminal or Claude Code session open
- LinkedIn and Naukri scraped using existing Chrome profile (no login prompts)
- All 17 Indian company career pages attempted per run; at least 5 successfully scraped
- New jobs trigger individual Telegram messages within 5 minutes of discovery
- No duplicate alerts across runs (dedup store prevents re-alerting)
- Scraper failure in one source does not abort the full run
- Failed sources reported in Telegram summary and log
- Setup reproducible via `setup-task-scheduler.bat` (one command, run as Administrator)
