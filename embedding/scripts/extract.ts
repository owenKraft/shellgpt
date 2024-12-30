import fs from 'fs/promises'
import path from 'path'
import { RepoConfig } from '../config/types'

export async function extractContent(repoPath: string, repo: RepoConfig) {
  const files: string[] = []
  
  // Helper function to check if path should be included
  const shouldIncludePath = (filePath: string) => {
    if (!repo.includePaths?.length) return true
    return repo.includePaths.some(includePath => 
      filePath.startsWith(includePath)
    )
  }
  
  // Helper function to check if file should be excluded
  const shouldExcludeFile = (filePath: string) => {
    if (!repo.excludePatterns?.length) return false
    return repo.excludePatterns.some(pattern => 
      new RegExp(pattern).test(filePath)
    )
  }
  
  // Recursive function to walk directory
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(repoPath, fullPath)
      
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && shouldIncludePath(relativePath) && !shouldExcludeFile(relativePath)) {
        files.push(fullPath)
      }
    }
  }
  
  await walk(repoPath)
  return files
} 