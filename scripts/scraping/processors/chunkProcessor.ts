import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ScrapedContent, ProcessedChunk } from '../types';

export async function processContent(content: ScrapedContent): Promise<ProcessedChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments(
    [content.content],
    [{
      url: content.url,
      title: content.title,
      source: content.source,
      ...content.metadata
    }]
  );

  return docs.map(doc => ({
    content: doc.pageContent,
    metadata: doc.metadata as ProcessedChunk['metadata']
  }));
} 