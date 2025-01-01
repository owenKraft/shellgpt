import { scrapeTopPackages } from './scrapers/powershellGallery';
import { scrapePDQCommands } from './scrapers/pdqCommands';
import { processContent } from './processors/chunkProcessor';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Starting web scraping process...');
    console.log('Initializing Pinecone...');

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
    const embeddings = new OpenAIEmbeddings();

    // Scrape PowerShell Gallery
    const galleryContent = await scrapeTopPackages();
    console.log(`\nProcessing ${galleryContent.length} PowerShell Gallery pages...`);
    
    // Scrape PDQ Commands
    const pdqContent = await scrapePDQCommands();
    console.log(`\nProcessing ${pdqContent.length} PDQ Command pages...`);

    // Process all content
    const allContent = [...galleryContent, ...pdqContent];
    console.log(`\nTotal pages to process: ${allContent.length}`);

    // Convert to Documents format
    const documents: Document[] = [];
    for (const content of allContent) {
      const chunks = await processContent(content);
      documents.push(...chunks.map(chunk => new Document({
        pageContent: chunk.content,
        metadata: chunk.metadata
      })));
    }

    // Store in Pinecone using PineconeStore
    console.log(`\nStoring ${documents.length} documents in Pinecone...`);
    await PineconeStore.fromDocuments(documents, embeddings, {
      pineconeIndex,
    });

    console.log('\nScraping and indexing completed successfully!');
    console.log(`Total documents stored: ${documents.length}`);
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

main(); 