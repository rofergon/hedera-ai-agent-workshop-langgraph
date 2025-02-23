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
  modelName = modelName || process.env.OPENROUTER_BASE_URL;
  baseURL = baseURL || process.env.OPENROUTER_API_KEY;
  apiKey = apiKey || process.env.OPENROUTER_MODEL;
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
        configuration: {
          baseURL,
        },
      });
      break;
    default:
      throw new Error(`Unsupported LLM type: ${llmType}`);
  }
}

export {
  createInstance,
};
