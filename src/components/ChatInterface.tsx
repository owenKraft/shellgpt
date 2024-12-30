'use client'

import { useState, FormEvent, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from 'react-markdown'
import { Textarea } from "@/components/ui/textarea"
import { SYSTEM_PROMPT } from '@/lib/prompts'
import { CodeBlock } from "@/components/ui/code-block"
import { Spinner } from "@/components/ui/spinner"
import { Message } from "@/types/chat"
import { v4 as uuidv4 } from 'uuid'
import { cn } from "@/lib/utils"
import { Terminal } from 'lucide-react'

const USE_STREAMING = process.env.NEXT_PUBLIC_USE_STREAMING === 'true';

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleSubmit = async (e: FormEvent) => {
    if (USE_STREAMING) {
      return handleStreamingSubmit(e);
    }
    e.preventDefault()
    console.log('Submitted script request:', input)
    
    const currentQuestion = input
    setInput('')
    setIsThinking(true)

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: currentQuestion,
          systemPrompt: SYSTEM_PROMPT 
        }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      console.log('Generated script:', data.answer)
      addMessage('assistant', data.answer)
    } catch (error) {
      console.error('Error:', error)
      addMessage('assistant', 'An error occurred while generating the script.')
    } finally {
      setIsThinking(false)
    }
  }

  const handleStreamingSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const userMessage = input
    setInput('')
    setIsThinking(true)
    
    // Add user message to chat
    addMessage('user', userMessage)

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: userMessage,
          systemPrompt: SYSTEM_PROMPT,
          streaming: true,
          messages: messages  // Send conversation history
        }),
      })

      if (!response.ok) throw new Error('Network response was not ok')
      if (!response.body) throw new Error('No response body')

      let assistantMessage = ''
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // Move setIsThinking(false) here, before we start reading the stream
      setIsThinking(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        assistantMessage += chunk
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = assistantMessage
            return newMessages
          } else {
            return [...newMessages, {
              id: uuidv4(),
              role: 'assistant',
              content: assistantMessage,
              timestamp: Date.now()
            }]
          }
        })
      }
    } catch (error) {
      console.error('Error:', error)
      addMessage('assistant', 'An error occurred while generating the script.')
    } finally {
      setIsThinking(false)  // Keep this as a fallback for errors
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        // Insert a newline character at cursor position
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;
        
        const newValue = value.substring(0, start) + '\n' + value.substring(end);
        setInput(newValue);
        
        // Move cursor after the inserted newline and trigger resize
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
          // Trigger resize by dispatching input event
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }, 0);
        
        e.preventDefault();
        return;
      }
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const resetChat = () => {
    window.location.reload()
  }

  // Determine if we should show the chat layout
  const showChatLayout = messages.length > 0

  return (
    <div className={cn(
      "h-screen flex flex-col overflow-hidden",
      showChatLayout 
        ? "" 
        : "justify-center items-center"
    )}>
      {showChatLayout ? (
        <>
          {/* Fixed Header */}
          <header className="bg-background border-b border-border">
            <div className="max-w-3xl mx-auto w-full px-4">
              <div 
                className="flex items-center gap-2 h-12 cursor-pointer hover:opacity-80"
                onClick={resetChat}
              >
                <Terminal className="h-5 w-5 text-primary" />
                <h1 className="text-base font-bold">shellGPT</h1>
              </div>
            </div>
          </header>

          {/* Messages Area - Scrollable */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto relative scrollbar scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
              <div className="max-w-3xl mx-auto w-full px-4 py-3 space-y-4">
                {messages.map((message) => (
                  <Card 
                    key={message.id}
                    className={cn(
                      "shadow-none ",
                      message.role === 'user' 
                        ? "bg-background" 
                        : "bg-card"
                    )}
                  >
                    <CardContent className={cn(
                      "p-4",
                      message.role === 'user' && "text-right"
                    )}>
                      <p className="font-semibold">
                        {message.role === 'user' ? 'You' : (
                          <span className="flex items-center gap-1.5">
                            <Terminal className="h-4 w-4 text-primary" />
                            shellGPT
                          </span>
                        )}
                      </p>
                      {message.role === 'assistant' ? (
                        <div className="text-sm space-y-4">
                          <ReactMarkdown
                            components={{
                              a: ({ ...props }) => (
                                <a target="_blank" rel="noopener noreferrer" {...props} />
                              ),
                              code: ({ node, inline, className, children, ...props }: any) => {
                                const isParagraphChild = node.position?.start.line === node.position?.end.line;
                                
                                if (inline || isParagraphChild) {
                                  return (
                                    <code 
                                      className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-mono text-sm" 
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  )
                                }
                                
                                const language = (className || '').replace('language-', '') || 'powershell'
                                return (
                                  <CodeBlock 
                                    code={String(children).replace(/\n$/, '')} 
                                    language={language}
                                  />
                                )
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <div ref={messagesEndRef} />
                {isThinking && (
                  <Card className="bg-background">
                    <CardContent className="flex items-center gap-2">
                      <Spinner />
                      <span className="italic">Thinking...</span>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </main>

          {/* Input Area */}
          <div className="bg-background border-t border-border flex-shrink-0">
            <div className="max-w-3xl mx-auto w-full px-4 py-3">
              <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <Textarea
                  placeholder="What next?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-grow"
                  autoFocus
                />
                <Button type="submit" className="mb-[2px]">Submit</Button>
              </form>
            </div>
          </div>
        </>
      ) : (
        // Initial centered layout
        <Card className="w-full max-w-3xl shadow-none bg-transparent border-none">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">shellGPT</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <Textarea
                placeholder="Describe what you want your script to do"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow"
                autoFocus
              />
              <Button type="submit" className="self-end">Submit</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
