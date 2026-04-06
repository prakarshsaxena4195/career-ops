// india/scrapers/linkedin.mjs
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const CHROME_PROFILE = 'C:\\Users\\saxen\\AppData\\Local\\Google\\Chrome\\User Data';

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
          const jobUrl = href.split('?')[0];
          jobs.push({ title, company, location, jobUrl, source: 'linkedin' });
        }
      }

      await randomDelay(2000, 4000);
    }
  } finally {
    await context.close();
  }

  return jobs;
}
