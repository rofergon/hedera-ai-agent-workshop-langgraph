#!/usr/bin/env bun

import readline from 'node:readline/promises';
import process from 'node:process';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent, ToolNode } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { allJokeTools } from './tools/joke.js';
import { createInstance as createLlmInstance } from './api/openrouter-openai.js';
import { createInstance as createInstance } from './api/hedera-client.js'
import { convertMcpToLangchainTools } from '@h1deya/langchain-mcp-tools';

const mcpServers = {
  hederaMirrorNode: {
    command: 'npx',
    args: ['-y', 'openapi-mcp-server@1.2.0-beta05', './hedera-mn.openapi.yml']
  },
};

const { tools: mcpLangChainTools } = await convertMcpToLangchainTools(mcpServers);
const tools = [...mcpLangChainTools];
const toolsNode = new ToolNode(tools);

const checkpointSaver = new MemorySaver();
const llm = createLlmInstance();
const agent = createReactAgent({
  llm,
  tools: toolsNode,
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
