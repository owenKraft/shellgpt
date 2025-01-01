import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ScrapedContent } from '../types';

puppeteer.use(StealthPlugin());

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeProjectSite(url: string): Promise<ScrapedContent | null> {
  const browser = await puppeteer.launch({ headless: true });
  try {
    console.log(`  Scraping project site: ${url}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Generic content extraction for arbitrary sites
    const content = await page.evaluate(() => {
      // Remove script tags, style tags, and hidden elements
      const elementsToRemove = document.querySelectorAll('script, style, [style*="display: none"]');
      elementsToRemove.forEach(el => el.remove());

      // Get main content areas
      const mainContent = document.querySelector('main, article, .content, #content, .main, #main')
        || document.body;

      // Get text content, preserving some structure
      const textContent = (mainContent as HTMLElement).innerText;

      // Clean up the text
      return textContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    });

    return {
      url,
      title: await page.$eval('title', el => el.textContent || url),
      content,
      source: 'project-site',
      metadata: {
        type: 'documentation'
      }
    };
  } catch (error) {
    console.error(`  Failed to scrape project site ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

async function scrapePackageDetails(url: string, index: number): Promise<ScrapedContent | ScrapedContent[]> {
  const browser = await puppeteer.launch({ headless: true });
  try {
    console.log(`[${index}] Scraping package: ${url}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const title = await page.$eval('.package-title h1', el => el.textContent?.trim() || '');
    console.log(`  Title: ${title}`);

    const content = await page.evaluate(() => {
      const description = document.querySelector('.package-description')?.textContent || '';
      const releaseNotes = document.querySelector('.version-release-notes')?.textContent || '';
      const fileList = Array.from(document.querySelectorAll('#file-lists li'))
        .map(li => li.textContent?.trim())
        .filter(Boolean)
        .join('\n');
      const cmdlets = Array.from(document.querySelectorAll('.package-cmdlets .cmdlet'))
        .map(cmd => cmd.textContent?.trim())
        .filter(Boolean)
        .join('\n');
      return `Description:\n${description}\n\nRelease Notes:\n${releaseNotes}\n\nFiles:\n${fileList}\n\nCmdlets:\n${cmdlets}`;
    });

    // Get project URL using the correct attribute
    const projectUrl = await page.$eval(
      'a[data-track="outbound-project-url"]',
      el => el.href
    ).catch(() => '');

    const [packageName, packageVersion] = url.split('/').slice(-2);

    const result: ScrapedContent = {
      url,
      title,
      content,
      source: 'powershell-gallery',
      metadata: {
        packageName,
        packageVersion,
        projectUrl
      }
    };

    // If project site exists, scrape it too
    if (projectUrl) {
      console.log('  Found project URL:', projectUrl);
      const projectContent = await scrapeProjectSite(projectUrl);
      if (projectContent) {
        return [result, projectContent];
      }
    }

    return result;
  } catch (error) {
    console.error(`  Error scraping ${url}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

export async function scrapeTopPackages(): Promise<ScrapedContent[]> {
  console.log('\nStarting PowerShell Gallery scraping...');
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.powershellgallery.com/stats/packages', 
      { waitUntil: 'networkidle0', timeout: 60000 });

    console.log('Fetching package URLs...');
    // Get all package URLs from the stats table, ensuring we get detail pages only
    const packageUrls = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const link = row.querySelector('td:nth-child(2) a') as HTMLAnchorElement;
        if (!link) return null;
        const baseUrl = link.href;
        // Ensure we're getting a package detail page URL
        if (!baseUrl.includes('/packages/') || baseUrl === 'https://www.powershellgallery.com/packages') {
          return null;
        }
        // Get the latest version URL
        const latestVersionLink = row.querySelector('tbody tr:first-child a') as HTMLAnchorElement;
        return latestVersionLink ? latestVersionLink.href : baseUrl;
      }).filter((url): url is string => url !== null)
        .slice(0, 100); // Limit to first 100 packages
    });

    console.log(`Found ${packageUrls.length} package URLs`);

    const results: ScrapedContent[] = [];
    for (let i = 0; i < packageUrls.length; i++) {
      try {
        await delay(1000); // Rate limiting
        const content = await scrapePackageDetails(packageUrls[i], i + 1);
        results.push(...(Array.isArray(content) ? content : [content]));
        console.log(`  Successfully scraped package ${i + 1}/${packageUrls.length}`);
      } catch (error) {
        console.error(`Failed to scrape package ${i + 1}:`, error);
        continue;
      }
    }

    console.log(`\nCompleted PowerShell Gallery scraping. Scraped ${results.length} pages total.`);
    return results;
  } finally {
    await browser.close();
  }
} 