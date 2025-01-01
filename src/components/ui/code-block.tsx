import { Button } from "./button"
import { Download, Copy, Check } from "lucide-react"
import { useState } from "react"
import hljs from 'highlight.js/lib/core'
import powershell from 'highlight.js/lib/languages/powershell'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('powershell', powershell)

interface CodeBlockProps {
  code: string
  language: string
  inline?: boolean
}

export function CodeBlock({ code, language, inline = false }: CodeBlockProps) {
  const [hasCopied, setHasCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  if (inline) {
    return <code className="font-mono px-1">{code}</code>
  }

  // Do the highlighting synchronously, outside of any hooks
  let highlightedCode = code
  try {
    const languageMap: Record<string, string> = {
      'ps': 'powershell',
      'ps1': 'powershell',
      'powers': 'powershell',
    }
    const normalizedLanguage = languageMap[language.toLowerCase()] || language
    highlightedCode = hljs.highlight(code, { 
      language: normalizedLanguage,
      ignoreIllegals: true 
    }).value
  } catch (err) {
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