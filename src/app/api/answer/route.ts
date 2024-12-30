import { NextRequest } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { Message } from "@/types/chat";
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

async function getRelevantDocs(question: string) {
  console.log('\n--- RAG Context Retrieval ---');
  console.log('Query:', question);
  
  try {
    const embeddings = new OpenAIEmbeddings();
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
    const docs = await vectorStore.similaritySearch(question, 4);
    
    console.log(`\nFound ${docs.length} relevant chunks:`);
    docs.forEach((doc, i) => {
      console.log(`\nChunk ${i + 1}:`);
      console.log('Content:', doc.pageContent);
      console.log('Metadata:', doc.metadata);
    });
    
    if (docs.length === 0) {
      console.log('No relevant chunks found in the index.');
    }
    
    console.log('\n--- End RAG Context Retrieval ---\n');
    return docs;
  } catch (error) {
    console.error('Error retrieving relevant docs:', error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemPrompt, streaming, messages } = await req.json();
    
    if (!prompt) {
      return new Response('Script description is required', { status: 400 });
    }

    // Get relevant documents
    const relevantDocs = await getRelevantDocs(prompt);
    const contextText = relevantDocs.map(doc => doc.pageContent).join('\n\n');
    
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
      modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      streaming: streaming || false,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    if (streaming) {
      const stream = await model.stream(conversationMessages);
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                controller.enqueue(new TextEncoder().encode(chunk.content.toString()));
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
    return new Response(JSON.stringify({ answer: completion.content }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
