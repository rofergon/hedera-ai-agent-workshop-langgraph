import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

function createInstance(params) {
  let {
    modelName,
    baseURL,
    apiKey,
    llmType,
  } = params || {};
  modelName = modelName || process.env.OPENROUTER_MODEL;
  baseURL = baseURL || process.env.OPENROUTER_BASE_URL;
  apiKey = apiKey || process.env.OPENROUTER_API_KEY;
  llmType = llmType || modelName.split('/')[0];

  console.log('openRouter openAI createInstance', {
    modelName,
    baseURL,
    apiKey: apiKey.substring(0, 12) + '...',
    llmType,
  });

  let llm;
  switch (llmType) {
    case 'openai':
      llm = new ChatOpenAI({
        modelName,
        apiKey,
        modalities: ['text'],
        maxTokens: 1000,
        temperature: 0.9,
        configuration: {
          baseURL,
        },
      });
      break;
    default:
      throw new Error(`Unsupported LLM type: ${llmType}`);
  }

  return llm;
}

export {
  createInstance,
};
