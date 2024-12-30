import { OpenAIEmbeddings } from '@langchain/openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { ProcessedChunk } from './process'
import { Config } from '../config/types'

export async function embedChunks(chunks: ProcessedChunk[], config: Config) {
  console.log(`Preparing to embed ${chunks.length} chunks...`)
  
  try {
    const embeddings = new OpenAIEmbeddings({
      modelName: config.embedding.modelName
    })
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    })
    
    const index = pinecone.Index(config.pinecone.indexName)
    let processed = 0
    
    // Process in batches
    for (let i = 0; i < chunks.length; i += config.embedding.batchSize) {
      const batch = chunks.slice(i, i + config.embedding.batchSize)
      
      try {
        const vectors = await Promise.all(
          batch.map(async (chunk) => {
            if (!chunk.content) {
              console.warn('Warning: Empty chunk content detected')
              return null
            }
            
            const [embedding] = await embeddings.embedDocuments([chunk.content])
            return {
              id: `${chunk.metadata.repo}-${chunk.metadata.filePath}-${i}`,
              values: embedding,
              metadata: {
                ...chunk.metadata,
                content: chunk.content // Add content to metadata
              }
            }
          })
        )
        
        // Filter out null values from empty chunks
        const validVectors = vectors.filter(v => v !== null)
        
        if (validVectors.length > 0) {
          await index.upsert(validVectors)
          processed += validVectors.length
          console.log(`Processed ${processed}/${chunks.length} chunks`)
          console.log('Sample vector metadata:', validVectors[0]?.metadata)
        }
      } catch (error) {
        console.warn(`Error processing batch ${i}-${i + batch.length}: ${error instanceof Error ? error.message : String(error)}`)
        continue
      }
    }
    
    console.log(`Successfully embedded ${processed}/${chunks.length} chunks`)
  } catch (error) {
    console.error(`Embedding failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
} 