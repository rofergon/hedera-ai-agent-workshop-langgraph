import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

function createInstance(params) {
  let {
    modelName,
    apiKey,
  } = params || {};
  modelName = modelName || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  apiKey = apiKey || process.env.OPENAI_API_KEY;

  console.log('OpenAI createInstance', {
    modelName,
    apiKey: apiKey ? apiKey.substring(0, 12) + '...' : 'undefined',
  });

  const llm = new ChatOpenAI({
    modelName,
    apiKey,
    maxTokens: 1000,
    temperature: 0.9,
  });

  return llm;
}

export {
  createInstance,
};
