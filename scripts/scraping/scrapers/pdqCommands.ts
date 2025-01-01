import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ScrapedContent } from '../types';

puppeteer.use(StealthPlugin());

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function scrapePDQCommands(): Promise<ScrapedContent[]> {
  console.log('\nStarting PDQ PowerShell commands scraping...');
  const browser = await puppeteer.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    await page.goto('https://www.pdq.com/powershell/', { waitUntil: 'networkidle0', timeout: 60000 });

    // Get all command URLs from the main page
    const commandUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href^="/powershell/"]'));
      return links
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => href !== 'https://www.pdq.com/powershell/')
        .filter((href, index, self) => self.indexOf(href) === index); // Remove duplicates
    });

    console.log(`Found ${commandUrls.length} command URLs`);

    const results: ScrapedContent[] = [];
    for (let i = 0; i < commandUrls.length; i++) {
      try {
        await delay(1000); // Rate limiting
        const page = await browser.newPage();
        await page.goto(commandUrls[i], { waitUntil: 'networkidle0' });

        // Extract command details
        const content = await page.evaluate(() => {
          const title = document.querySelector('h1')?.textContent?.trim() || '';
          const syntax = Array.from(document.querySelectorAll('pre.syntax'))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
            .join('\n\n');
          const description = Array.from(document.querySelectorAll('div[data-testid="rich-text-container"] > p'))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
            .join('\n\n');
          const parameters = Array.from(document.querySelectorAll('div.indent'))
            .map(div => div.textContent?.trim())
            .filter(Boolean)
            .join('\n\n');
          const examples = Array.from(document.querySelectorAll('pre:not(.syntax)'))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
            .join('\n\n');
          const notes = document.querySelector('pre.notes')?.textContent?.trim() || '';

          return {
            title,
            content: [
              `Syntax:\n${syntax}`,
              `Description:\n${description}`,
              `Parameters:\n${parameters}`,
              `Examples:\n${examples}`,
              notes ? `Notes:\n${notes}` : ''
            ].filter(Boolean).join('\n\n')
          };
        });

        results.push({
          url: commandUrls[i],
          title: content.title,
          content: content.content,
          source: 'pdq-powershell',
          metadata: {
            commandName: content.title.split(' - ')[0]
          }
        });

        console.log(`  [${i + 1}/${commandUrls.length}] Scraped ${content.title}`);
      } catch (error) {
        console.error(`Failed to scrape ${commandUrls[i]}:`, error);
        continue;
      }
    }

    console.log(`\nCompleted PDQ PowerShell commands scraping. Scraped ${results.length} commands.`);
    return results;
  } finally {
    await browser.close();
  }
} 