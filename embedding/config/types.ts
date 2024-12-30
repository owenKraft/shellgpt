export type RepoConfig = {
  url: string                
  name: string              
  branch?: string           
  includePaths?: string[]   
  excludePatterns?: string[] 
}

export type EmbeddingConfig = {
  chunkSize: number         
  chunkOverlap: number      
  modelName: string         
  batchSize: number        
}

export type ProcessingConfig = {
  tempDir: string          
  outputDir: string        
  cleanupTemp: boolean     
}

export type Config = {
  repos: RepoConfig[]
  embedding: EmbeddingConfig
  processing: ProcessingConfig
  pinecone: {
    indexName: string
    namespace?: string    
  }
} 