import { Config } from './types'

export const config: Config = {
  repos: [
    // {
    //   url: 'https://github.com/MicrosoftDocs/PowerShell-Docs',
    //   name: 'powershell-docs',
    //   includePaths: ['reference/7.4']
    // },
    {
        url: 'https://github.com/pdqcom/PowerShell-Scanners',
        name: 'powershell-docs',
        includePaths: ['PowerShell Scanners']
      },
  ],
  embedding: {
    chunkSize: 1500,
    chunkOverlap: 200,
    modelName: 'text-embedding-ada-002',
    batchSize: 100
  },
  processing: {
    tempDir: './temp/repos',
    outputDir: './temp/processed',
    cleanupTemp: true
  },
  pinecone: {
    indexName: process.env.PINECONE_INDEX || 'powershell-scripts'
  }
} 