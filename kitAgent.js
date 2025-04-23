#!/usr/bin/env node

import readline from 'node:readline/promises';
import process from 'node:process';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent, ToolNode } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { allJokeTools } from './tools/joke.js';
import { createInstance as createLlmInstance } from './api/openrouter-openai.js';
import { createInstance as createHederaClient } from './api/hedera-client.js';
// Import our custom tools
import { createMyTools } from './tools/myTools.js';

// Initialize Hedera client
console.log("Initializing Hedera client...");
let hederaClient;
try {
  hederaClient = createHederaClient();
  console.log("Hedera client initialized successfully");
} catch (error) {
  console.error("Error initializing Hedera client:", error);
  process.exit(1);
}

// Initialize tools
console.log("Initializing tools...");
let myTools = [];
try {
  myTools = createMyTools(hederaClient);
  console.log("Custom tools created:", myTools.map(t => t.name));
} catch (error) {
  console.error("Error creating custom tools:", error);
}

// Combine all tools
console.log("Configuring agent...");
const tools = [...allJokeTools, ...myTools];
const toolsNode = new ToolNode(tools);

const checkpointSaver = new MemorySaver();
const llm = createLlmInstance();

// System message to guide the agent's behavior
const systemMessage = new SystemMessage(
  "You are a helpful assistant that can perform operations on the Hedera network. " +
  "You have access to the following tools:\n" +
  "- transfer_hbar: To transfer HBAR to an account. Always use JSON format for parameters.\n" +
  "- get_balance: To check the balance of an account. You can just provide the account ID directly.\n\n" +
  "When a user asks for a balance, you can directly use their account ID without wrapping it in JSON.\n" +
  "When a user asks to transfer HBAR, use proper JSON format with 'toAccountId' and 'amount' fields.\n" +
  "Keep your responses concise and professional."
);

// Create the agent
const agent = createReactAgent({
  llm,
  tools: toolsNode,
  checkpointSaver,
  systemMessage
});

// Configure command line interface
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
  try {
    console.log("Processing request...");
    const reply = await agent.invoke({
      messages: [systemMessage, new HumanMessage(userPrompt)],
    }, {
      configurable: { thread_id: '0x0001' },
    });

    const agentReply = reply.messages[reply.messages.length - 1].content;
    return agentReply;
  } catch (error) {
    console.error("Error getting agent response:", error);
    return "Sorry, an error occurred while processing your request.";
  }
}

// Main loop
console.log("Agent ready. Type your message and press Enter twice to send.");
while (true) {
  console.log('You:\n');
  const userPrompt = await readUserPrompt();

  console.log('Agent:\n');
  const agentReply = await obtainAgentReply(userPrompt);
  console.log(agentReply);
}
