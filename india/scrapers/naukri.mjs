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
