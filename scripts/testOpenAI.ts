import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

async function testOpenAI() {
  try {
    const embeddings = new OpenAIEmbeddings();
    const result = await embeddings.embedQuery('test');
    console.log('OpenAI connection successful');
  } catch (error) {
    console.error('OpenAI connection failed:', error);
  }
}

testOpenAI();