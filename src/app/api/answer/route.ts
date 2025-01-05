import { NextRequest } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { Message } from "@/types/chat";
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';

interface DocWithMetadata {
  pageContent: string;
  metadata: { url?: string; text?: string; [key: string]: any };
}

type DocScorePair = [DocWithMetadata, number];

async function analyzeRequest(question: string) {
  console.time('  ⌛ Analysis');
  try {
    const analyzer = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
    });

    const analysisPrompt = {
      role: 'system',
      content: `You are a PowerShell expert. Given a user's request, identify the most relevant PowerShell cmdlets and modules that would be needed to fulfill their request. Format your response as a comma-separated list. Be specific but concise.

                Example User: "I need to check if a service is running"
                Example Response: Get-Service, Test-Path, Start-Service, Stop-Service, Service Management

                Only provide the comma-separated list, no other text.`
    };

    const userPrompt = {
      role: 'user',
      content: question
    };

    const analysis = await analyzer.invoke([analysisPrompt, userPrompt]);
    return typeof analysis.content === 'string' 
      ? analysis.content.trim() 
      : question;
  } finally {
    console.timeEnd('  ⌛ Analysis');
  }
}

async function getRelevantDocs(question: string) {
  console.time('  ⌛ Context Retrieval');
  console.log('\n--- RAG Context Retrieval ---');
  console.log('Original Query:', question);

  // Get PowerShell-specific context
  const relevantConcepts = await analyzeRequest(question);
  console.log('Relevant PowerShell Concepts:', relevantConcepts);
  
  const RELEVANCE_THRESHOLD = 0.82;
  
  try {
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Split concepts into array and clean them
    const concepts = relevantConcepts
      .split(',')
      .map(c => c.trim().toLowerCase());
    
    // Create a query using just vector similarity
    const query = {
      vector: await embeddings.embedQuery(question + " " + relevantConcepts),
      topK: 6, // Get more results initially
      includeMetadata: true,
    };

    // Query Pinecone
    const results = await pineconeIndex.query(query);

    // Convert results to the format we need
    const docsWithScores: DocScorePair[] = results.matches?.map(match => [
      { pageContent: match.metadata?.text ?? '', metadata: match.metadata ?? {} } as DocWithMetadata,
      match.score ?? 0
    ]) || [];
    
    // Then update the map functions to use this type
    const enhancedDocsWithScores: DocScorePair[] = docsWithScores.map((pair) => {
      const [doc, score] = pair;
      const url = doc.metadata?.url?.toLowerCase() || '';
      
      console.log(`\nURL Relevance Check for ${url}:`);
      console.log('Checking concepts:', concepts);
      
      const matches = concepts.filter(concept => {
        const matches = url.includes(concept);
        console.log(`- Checking concept: "${concept}" -> ${matches ? 'MATCH' : 'no match'}`);
        return matches;
      });
      
      const conceptMatches = matches.length;
      const urlBoost = conceptMatches * 0.05;
      const enhancedScore = Math.min(score + urlBoost, 1.0);
      
      console.log(`- Original Score: ${(score * 100).toFixed(2)}%`);
      console.log(`- Matching concepts: ${matches.join(', ')}`);
      console.log(`- Total Matches: ${conceptMatches}`);
      console.log(`- URL Boost: ${(urlBoost * 100).toFixed(2)}%`);
      console.log(`- Final Score: ${(enhancedScore * 100).toFixed(2)}%`);
      
      return [doc, enhancedScore];
    });
    
    // Sort by enhanced scores
    enhancedDocsWithScores.sort((a, b) => b[1] - a[1]);
    
    console.log(`\nFound ${enhancedDocsWithScores.length} chunks (before filtering):`);
    enhancedDocsWithScores.forEach(([doc, score], i) => {
      const relevancePercent = score * 100;
      console.log(`\nChunk ${i + 1} (Relevance: ${relevancePercent.toFixed(2)}%):`);
      console.log('URL:', doc.metadata?.url);
      console.log('Meets threshold:', relevancePercent >= RELEVANCE_THRESHOLD * 100 ? 'Yes' : 'No');
    });
    
    // Filter docs and URLs based on relevance threshold
    const relevantDocsWithScores = enhancedDocsWithScores.filter(([, score]) => score >= RELEVANCE_THRESHOLD);
    const docs = relevantDocsWithScores.map(([doc]) => doc);

    // Keep URLs in order of relevance, removing duplicates
    const urls = relevantDocsWithScores
      .map(([doc]) => doc.metadata?.url)
      .filter((url, index, self) => 
        url && // Remove nulls/undefined
        self.indexOf(url) === index // Remove duplicates while preserving order
      ) as string[];

    console.log(`\nAfter filtering (${RELEVANCE_THRESHOLD * 100}% threshold):`);
    console.log(`Relevant chunks: ${docs.length}`);
    console.log(`Relevant URLs: ${urls.length}`);
    
    if (docs.length === 0) {
      console.log('No chunks met the relevance threshold.');
    }
    
    console.log('\n--- End RAG Context Retrieval ---\n');
    return { docs, urls };
  } finally {
    console.timeEnd('  ⌛ Context Retrieval');
  }
}

// Helper function to format URLs section
function formatLearnMoreSection(urls: string[]): string {
  if (urls.length === 0) return '';
  
  return `

**Learn more:**

${urls.map((url, index) => `${index + 1}. [${url}](${url})`).join('\n')}`;
}

export async function POST(req: NextRequest) {
  console.time('📝 Total Request');
  try {
    const { prompt, systemPrompt, streaming, messages } = await req.json();
    
    if (!prompt) {
      return new Response('Script description is required', { status: 400 });
    }

    // Get relevant documents and URLs
    const { docs, urls } = await getRelevantDocs(prompt);
    const contextText = docs.map(doc => doc.pageContent).join('\n\n');
    
    // Create conversation history with context
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `Additional context:\n${contextText}` },
      ...messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: prompt }
    ];

    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
      temperature: 0.2,
      streaming: streaming || false,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    console.time('  ⌛ LLM Generation');
    if (streaming) {
      const stream = await model.stream(conversationMessages);
      console.timeEnd('  ⌛ LLM Generation');
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                const content = chunk.content.toString();
                controller.enqueue(new TextEncoder().encode(content));
              }
              
              // After the stream is done, append Learn More section if we have URLs
              if (urls.length > 0) {
                const learnMoreText = formatLearnMoreSection(urls);
                controller.enqueue(new TextEncoder().encode(learnMoreText));
              }
              
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        }), {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }
    
    const completion = await model.invoke(conversationMessages);
    console.timeEnd('  ⌛ LLM Generation');
    let response = completion.content;

    // Add Learn More section for non-streaming response
    if (urls.length > 0) {
      response += formatLearnMoreSection(urls);
    }

    return new Response(JSON.stringify({ answer: response }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    console.timeEnd('📝 Total Request');
  }
}
