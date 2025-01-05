import { Button } from "./button"
import { Download, Copy, Check } from "lucide-react"
import { useState, useEffect } from "react"
import hljs from 'highlight.js'
import powershell from 'highlight.js/lib/languages/powershell'
import { useTheme } from 'next-themes'

hljs.registerLanguage('powershell', powershell)

interface CodeBlockProps {
  code: string
  language?: string
  inline?: boolean
}

export function CodeBlock({ code, language, inline = false }: CodeBlockProps) {
  const { resolvedTheme } = useTheme()
  const [hasCopied, setHasCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  // Handle theme switching
  useEffect(() => {
    // Remove any existing highlight.js theme links
    document.querySelectorAll('link[data-hljs-theme]').forEach(el => el.remove())

    // Create and append the appropriate theme
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.setAttribute('data-hljs-theme', resolvedTheme || 'dark')
    
    if (resolvedTheme === 'light') {
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css'
    } else {
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css'
    }
    
    document.head.appendChild(link)
  }, [resolvedTheme])

  useEffect(() => {
    document.documentElement.classList.toggle('hljs-dark', resolvedTheme === 'dark')
    document.documentElement.classList.toggle('hljs-light', resolvedTheme === 'light')
  }, [resolvedTheme])

  if (inline) {
    return <code className="font-mono px-1">{code}</code>
  }

  // Do the highlighting synchronously
  let highlightedCode = code
  const languageMap: Record<string, string> = {
    'ps': 'powershell',
    'ps1': 'powershell',
    'powers': 'powershell',
  }

  // Handle undefined language case
  const normalizedLanguage = language ? (languageMap[language.toLowerCase()] || language) : 'plaintext'

  try {
    highlightedCode = hljs.highlight(code, { 
      language: normalizedLanguage,
      ignoreIllegals: true 
    }).value
  } catch {
    // Fallback to plain text if language isn't supported
    highlightedCode = code
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code to clipboard:', err)
    }
  }

  const downloadAsPs1 = () => {
    try {
      setIsDownloading(true)
      
      // Create blob with PowerShell content
      const blob = new Blob([code], { type: 'application/x-powershell' })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename - either use a timestamp or sanitize the first line of code
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `script-${timestamp}.ps1`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setTimeout(() => setIsDownloading(false), 2000)
    } catch (err) {
      console.error('Failed to download script:', err)
      setIsDownloading(false)
    }
  }

  return (
    <>
      <div className="relative">
        <pre className="rounded-lg p-4 mb-1.5 overflow-x-auto border">
          <code 
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
      <div className="flex gap-1.5 justify-end bg-transparent">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs text-muted-foreground hover:bg-transparent hover:text-primary flex items-center gap-1"
          onClick={copyToClipboard}
        >
          {hasCopied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs text-muted-foreground hover:bg-transparent hover:text-primary flex items-center gap-1"
          onClick={downloadAsPs1}
        >
          {isDownloading ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Downloading
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              Download .ps1
            </>
          )}
        </Button>
      </div>
    </>
  )
} 