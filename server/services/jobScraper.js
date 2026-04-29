const cheerio = require('cheerio');

/**
 * Fetches and parses job listings from DOU.ua based on the search query.
 * Returns an array of direct URLs to individual job postings.
 *
 * @param {string} searchQuery - The job title or keywords to search for (e.g., 'frontend developer')
 * @returns {Promise<string[]>} - An array of URLs pointing to specific job listings
 */
async function scrapeDOUListings(searchQuery) {
  try {
    const url = `https://jobs.dou.ua/vacancies/?search=${encodeURIComponent(searchQuery)}`;
    console.log(`[DOU] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.warn(`[DOU] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Collects vacancy URLs (max 5)
    const vacancyUrls = [];
    $('a.vt').each((i, el) => {
      if (vacancyUrls.length >= 5) return false;
      const href = $(el).attr('href');
      if (href) vacancyUrls.push(href);
    });

    // Fallback to alternative selectors if .vt is not found
    if (vacancyUrls.length === 0) {
      $('a[href*="/vacancies/"]').each((i, el) => {
        if (vacancyUrls.length >= 5) return false;
        const href = $(el).attr('href');
        if (href && href.includes('/vacancies/') && !vacancyUrls.includes(href) && /\d+/.test(href)) {
          vacancyUrls.push(href);
        }
      });
    }

    console.log(`[DOU] Found ${vacancyUrls.length} vacancy URLs`);
    return vacancyUrls;
  } catch (error) {
    console.error('[DOU] Scraping error:', error.message);
    return [];
  }
}

/**
 * Scrapes detailed information from a single DOU vacancy page.
 * Returns the text content of the requirements and description sections.
 *
 * @param {string} url - The URL of the job posting to scrape
 * @returns {Promise<string>} - The combined text of requirements and description
 */
async function scrapeDOUVacancy(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return '';

    const html = await response.text();
    const $ = cheerio.load(html);

    // DOU stores job descriptions in div.b-typo.vacancy-section
    const description = $('.b-typo.vacancy-section').text() ||
      $('.vacancy-section').text() ||
      $('[class*="vacancy"]').text() ||
      '';

    return description.trim().substring(0, 3000); // Обмежуємо розмір
  } catch (error) {
    console.error(`[DOU] Error scraping ${url}:`, error.message);
    return '';
  }
}

/**
 * Fetches and parses job listings from Work.ua based on the search query.
 *
 * @param {string} searchQuery - The job title or keywords to search for (e.g., 'frontend developer')
 * @returns {Promise<string[]>} - An array of text contents from individual job postings
 */
async function scrapeWorkUaListings(searchQuery) {
  try {
    const formattedQuery = encodeURIComponent(searchQuery.replace(/\s+/g, '+'));
    const url = `https://www.work.ua/jobs-${formattedQuery}/`;
    console.log(`[Work.ua] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.warn(`[Work.ua] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Collect vacancy URLs (max 5)
    const vacancyUrls = [];
    $('a[href^="/jobs/"]').each((i, el) => {
      const href = $(el).attr('href');
      // Look for links of the form /jobs/1234567/
      if (href && href.match(/^\/jobs\/\d+\/$/) && !vacancyUrls.includes(href)) {
        vacancyUrls.push(`https://www.work.ua${href}`);
      }
    });

    console.log(`[Work.ua] Found ${vacancyUrls.length} vacancy URLs`);

    // Scrape details for the first 3-4 vacancies
    const detailsPromises = vacancyUrls.slice(0, 4).map(async (vUrl) => {
      try {
        const vResp = await fetch(vUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        if (!vResp.ok) return '';
        const vHtml = await vResp.text();
        const v$ = cheerio.load(vHtml);

        // Extract job description text
        const description = v$('#job-description').text() || v$('.job-description').text() || v$('body').text();

        // Truncate to keep only the most relevant section with requirements
        return description.trim().substring(0, 3000);
      } catch (err) {
        return '';
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter(t => t.length > 50);

  } catch (error) {
    console.error('[Work.ua] Scraping error:', error.message);
    return [];
  }
}

/**
 * Fetches and parses job listings from Robota.ua using their public API.
 *
 * @param {string} searchQuery - The job title or keywords to search for
 * @returns {Promise<string[]>} - An array of text contents from individual job postings
 */
async function scrapeRobotaUaListings(searchQuery) {
  try {
    const searchUrl = `https://api.rabota.ua/vacancy/search?keyWords=${encodeURIComponent(searchQuery)}`;
    console.log(`[Robota.ua] Fetching API: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[Robota.ua] HTTP ${response.status}`);
      return [];
    }

    const searchData = await response.json();
    const documents = searchData.documents || [];

    // Get the first 4 vacancies
    const ids = documents.slice(0, 4).map(doc => doc.id);
    console.log(`[Robota.ua] Found ${ids.length} vacancy IDs`);

    const detailsPromises = ids.map(async (id) => {
      try {
        const detailUrl = `https://api.rabota.ua/vacancy?id=${id}`;
        const detailResp = await fetch(detailUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          }
        });
        if (!detailResp.ok) return '';
        const detailData = await detailResp.json();

        // The job description comes as an HTML string
        const htmlDescription = detailData.description || '';
        const $ = cheerio.load(htmlDescription);
        const text = $('body').text() || htmlDescription.replace(/<[^>]*>?/gm, '');

        return text.trim().substring(0, 3000);
      } catch (err) {
        return '';
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter(t => t.length > 50);

  } catch (error) {
    console.error('[Robota.ua] Scraping error:', error.message);
    return [];
  }
}

/**
 * Aggregates job listings from multiple sources (DOU, Work.ua, Robota.ua).
 *
 * @param {string[]} searchKeywords - Keywords for job search
 * @param {string} position - Original position title from the resume
 * @returns {Promise<{rawTexts: string[], sources: string[]}>} - Aggregated raw text data and source information
 */
async function scrapeJobListings(searchKeywords, position) {
  const searchQuery = searchKeywords.length > 0
    ? searchKeywords.slice(0, 2).join(' ')
    : position;

  console.log(`[JobScraper] Search query: "${searchQuery}"`);

  // Scrape DOU, Work.ua, and Robota.ua in parallel
  const [douUrls, workUaTexts, robotaTexts] = await Promise.all([
    scrapeDOUListings(searchQuery),
    scrapeWorkUaListings(searchQuery),
    scrapeRobotaUaListings(searchQuery),
  ]);

  const rawTexts = [...workUaTexts, ...robotaTexts];
  const sources = [];

  if (workUaTexts.length > 0) {
    sources.push(`https://www.work.ua/jobs-${encodeURIComponent(searchQuery.replace(/\s+/g, '+'))}/`);
  }
  if (robotaTexts.length > 0) {
    sources.push(`https://robota.ua/zapros/${encodeURIComponent(searchQuery.replace(/\s+/g, '-'))}/ukraine`);
  }

  // DOU — scrape details of the first 3 vacancies
  const douDetailPromises = douUrls.slice(0, 3).map(url => scrapeDOUVacancy(url));
  const douDetails = await Promise.all(douDetailPromises);

  for (const detail of douDetails) {
    if (detail.length > 50) {
      rawTexts.push(detail);
    }
  }
  sources.push(...douUrls.slice(0, 3));

  console.log(`[JobScraper] Total raw texts: ${rawTexts.length}, sources: ${sources.length}`);

  return { rawTexts, sources };
}

module.exports = {
  scrapeJobListings,
};
