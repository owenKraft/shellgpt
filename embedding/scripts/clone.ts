import simpleGit from 'simple-git'
import fs from 'fs/promises'
import path from 'path'
import { RepoConfig } from '../config/types'

export async function cloneRepo(repo: RepoConfig, tempDir: string) {
  const repoPath = path.join(tempDir, repo.name)
  
  try {
    // Check if directory exists
    const exists = await fs.access(repoPath).then(() => true).catch(() => false)
    
    if (exists) {
      console.log(`Repository directory already exists at ${repoPath}, cleaning up...`)
      await fs.rm(repoPath, { recursive: true, force: true })
    }
    
    // Ensure directory exists
    await fs.mkdir(repoPath, { recursive: true })
    
    // Clone the repository
    const git = simpleGit()
    await git.clone(repo.url, repoPath)
    
    // Checkout specific branch if specified
    if (repo.branch) {
      await git.cwd(repoPath).checkout(repo.branch)
    }
    
    return repoPath
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`)
  }
} 