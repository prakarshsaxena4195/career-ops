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
    // Fallback: all anchors — filtering happens in the orchestrator
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
