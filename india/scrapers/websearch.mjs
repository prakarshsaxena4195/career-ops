// india/scrapers/websearch.mjs

const DDGURL = 'https://html.duckduckgo.com/html/';

const QUERIES = [
  { query: 'site:cutshort.io "Senior Product Manager" Bangalore', source: 'cutshort' },
  { query: 'site:wellfound.com "Senior Product Manager" Bangalore', source: 'wellfound' },
  { query: 'site:instahire.in "Senior Product Manager" Bangalore', source: 'instahire' },
];

function extractResults(html) {
  const jobs = [];
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
