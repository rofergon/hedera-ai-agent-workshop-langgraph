#!/usr/bin/env node

import readline from 'node:readline/promises';
import process from 'node:process';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { queryJokeTool } from './tools/joke.js';
import { commandHcsCreateTopicTool, commandHcsSubmitTopicMessageTool } from './tools/hedera.js';
import { createInstance } from './api/openrouter-openai.js';

const llm = createInstance();
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

while (true) {
  console.log('You:\n');
  const userPrompt = await readUserPrompt();

  console.log('Agent:\n');
  const agentReply = await obtainAgentReply(userPrompt);
  console.log(agentReply);
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
