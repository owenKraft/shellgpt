export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  source: string;
  metadata: {
    packageName?: string;
    packageVersion?: string;
    commandName?: string;
    projectUrl?: string;
    type?: string;
  };
}

export type ProcessedChunk = {
  content: string;
  metadata: {
    url: string;
    title: string;
    source: ScrapedContent['source'];
    packageName?: string;
    packageVersion?: string;
    commandName?: string;
  };
}; 