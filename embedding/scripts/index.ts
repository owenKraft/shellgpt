import dotenv from 'dotenv'
dotenv.config()

import { config } from '../config'
import { cloneRepo } from './clone'
import { extractContent } from './extract'
import { processFiles } from './process'
import { embedChunks } from './embed'
import fs from 'fs/promises'

async function main() {
  console.log('Starting embedding process...')
  console.log('Environment check:')
  console.log('- OpenAI API Key exists:', !!process.env.OPENAI_API_KEY)
  console.log('- Pinecone API Key exists:', !!process.env.PINECONE_API_KEY)
  
  try {
    // Ensure temp directories exist
    await fs.mkdir(config.processing.tempDir, { recursive: true })
    await fs.mkdir(config.processing.outputDir, { recursive: true })
    
    console.log(`Found ${config.repos.length} repositories to process`)
    
    for (const repo of config.repos) {
      console.log(`Processing ${repo.name}...`)
      
      try {
        // Clone repository
        const repoPath = await cloneRepo(repo, config.processing.tempDir)
        console.log(`Cloned ${repo.name}`)
        
        // Extract content
        console.log('Extracting files...')
        const files = await extractContent(repoPath, repo)
        console.log(`Found ${files.length} files to process`)
        
        // Process files into chunks
        console.log('Processing files...')
        const chunks = await processFiles(files, repo.name, repoPath, config.embedding)
        console.log(`Generated ${chunks.length} chunks`)
        
        // Generate and store embeddings
        await embedChunks(chunks, config)
        
        // Cleanup if configured
        if (config.processing.cleanupTemp) {
          console.log('Cleaning up...')
          await fs.rm(repoPath, { recursive: true, force: true })
          console.log('Cleanup complete')
        }
      } catch (error) {
        console.error(`Error processing ${repo.name}: ${error instanceof Error ? error.message : String(error)}`)
        // Continue with next repo instead of stopping completely
        continue
      }
    }
    
    console.log('Embedding process complete!')
  } catch (error) {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
}) 