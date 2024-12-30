import fs from 'fs/promises'
import path from 'path'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { EmbeddingConfig } from '../config/types'

export type ProcessedChunk = {
  content: string
  metadata: {
    repo: string
    filePath: string
    startLine?: number
    endLine?: number
  }
}

export async function processFiles(
  files: string[], 
  repoName: string,
  repoPath: string,
  config: EmbeddingConfig
): Promise<ProcessedChunk[]> {
  const chunks: ProcessedChunk[] = []
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  })
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      console.log(`\nProcessing file: ${file}`)
      console.log('Content length:', content.length)
      
      if (content.length === 0) {
        console.warn('Warning: Empty file content')
        continue
      }
      
      const relativePath = path.relative(repoPath, file)
      
      const rawChunks = await splitter.createDocuments(
        [content],
        [{ 
          repo: repoName,
          filePath: relativePath
        }]
      )
      
      console.log(`Generated ${rawChunks.length} chunks`)
      console.log('First chunk preview:', rawChunks[0]?.pageContent.slice(0, 100))
      
      chunks.push(...rawChunks.map(chunk => ({
        content: chunk.pageContent,
        metadata: {
          repo: chunk.metadata.repo as string,
          filePath: chunk.metadata.filePath as string
        }
      })))
    } catch (error) {
      console.error(`Error processing file ${file}:`, error)
      continue
    }
  }
  
  return chunks
} 