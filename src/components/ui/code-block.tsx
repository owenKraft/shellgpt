import { Button } from "./button"
import { Download, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Highlight } from "prism-react-renderer"

interface CodeBlockProps {
  code: string
  language: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [hasCopied, setHasCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
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
    <div>
      <div className="relative">
        <Highlight
          code={code}
          language={language}
          theme={undefined}
        >
          {({ className: prismClassName, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${prismClassName} bg-black rounded-lg p-4 mb-1.5 overflow-x-auto border`} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
      <div className="flex gap-1.5 justify-end">
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
    </div>
  )
} 