#!/usr/bin/env node

import readline from 'node:readline/promises';
import process from 'node:process';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { queryJokeTool } from './tools/joke.js';
import { commandHcsCreateTopicTool, commandHcsSubmitTopicMessageTool } from './tools/hedera.js';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Usar directamente ChatOpenAI sin pasar por createInstance
const llm = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  apiKey: process.env.OPENAI_API_KEY,
  maxTokens: 1000,
  temperature: 0.7,
});

console.log('Configurando agente con OpenAI', {
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
});

const tools = [queryJokeTool, commandHcsCreateTopicTool, commandHcsSubmitTopicMessageTool];
const checkpointSaver = new MemorySaver();
const agent = createReactAgent({
  llm,
  tools,
  checkpointSaver,
});

const rlp = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function readUserPrompt() {
  const lines = [];
  while (true) {
    const line = await rlp.question('');
    if (line == '' && lines[lines.length - 1] === '') {
      return lines.join('\n');
    }
    lines.push(line);
  }
}

async function obtainAgentReply(userPrompt) {
  const reply = await agent.invoke(
    {
      messages: [new HumanMessage(userPrompt)],
    },
    {
      configurable: { thread_id: '0x0001' },
    },
  );

  const agentReply = reply.messages[reply.messages.length - 1].content;
  return agentReply;
}

console.log('Agente iniciado. Escribe tu pregunta y presiona Enter dos veces para enviarla.');
console.log('Para salir, presiona Ctrl+C.');

while (true) {
  console.log('\nTú:\n');
  const userPrompt = await readUserPrompt();

  console.log('\nAgente:\n');
  try {
    const agentReply = await obtainAgentReply(userPrompt);
    console.log(agentReply);
  } catch (error) {
    console.error('Error al obtener respuesta del agente:', error.message);
  }
}

/*
const prompt = `Please generate a joke about a car.
Also generate one about a bar.`;
*/

// const reply = await agent.invoke(
//   {
//     messages: [new HumanMessage(prompt)],
//   },
//   {
//     configurable: { thread_id: '0x0001' },
//   },
// );

// console.log(reply.messages[reply.messages.length - 1].content);
