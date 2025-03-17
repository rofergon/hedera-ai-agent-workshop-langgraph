#!/usr/bin/env node

import readline from 'node:readline/promises';
import process from 'node:process';
import { interrupt, Command, MemorySaver, MessagesAnnotation, StateGraph, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { allJokeTools as jokeTools } from './tools/joke.js';
import { allHederaTools as hederaTools } from './tools/hedera.js';
import { createInstance as createLlmInstance } from './api/openrouter-openai.js';

const tools = [...jokeTools, ...hederaTools];
const llm = createLlmInstance();
const llmWithTools = llm.bindTools(tools);
const toolsNode = new ToolNode(tools);

async function agentNode(state) {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

async function approveNode(state) {
  const lastMsg = state.messages.at(-1);
  const commandToolCalls = toolCallsWithCommands(lastMsg?.tool_calls || []);
  if (commandToolCalls.length < 1) {
    // We only have query tool calls, user permission not requested
    return new Command({
      goto: 'tools',
    });
  }

  // We have 1 or more command tool calls, use permission is requested
  const readableSummaryOfToolCalls = constructReadableSummaryOfToolCalls(commandToolCalls);
  const interruptMsg = `Please review the following tool call(s):
${readableSummaryOfToolCalls}

Do you approve? (y/N)`;

  const interruptResponse = interrupt(interruptMsg);

  const isApproved = (interruptResponse.trim().charAt(0).toLowerCase() === 'y');
  if (isApproved) {
    // proceed to the tools node
    return new Command({
      goto: 'tools',
    });
  } else {
    // proceed to the END node
    const rejectionMessages = commandToolCalls.map((toolCall) => (
      new ToolMessage({
        status: 'error',
        content: `User rejected "${toolCall.name}" tool call.`,
        tool_call_id: toolCall.id,
      })
    ));
    rejectionMessages.push(new AIMessage(
      `User rejected the following tool call(s):
${readableSummaryOfToolCalls}`
    ));
    return new Command({
      goto: END,
      update: {
        messages: rejectionMessages,
      },
    });
  }
}

async function agentRouter(state) {
  const lastMsg = state.messages.at(-1);
  if (hasToolCalls(lastMsg)) {
    return 'approve';
  }
  return END;
}

function hasToolCalls(msg) {
  return msg?.tool_calls?.length > 0;
}

function toolCallsWithCommands(toolCalls) {
  return toolCalls.filter(
    (toolCall) => (toolCall.name?.startsWith('CMD_')),
  );
}

function constructReadableSummaryOfToolCalls(toolCalls) {
  const len = toolCalls.length;
  const texts = toolCalls.map((toolCall, idx) => (
    `(${idx + 1}/${len}): ${toolCall.name} with inputs: ${JSON.stringify(toolCall.args, undefined, 2)}`
  ));
  return texts.join('\n\n');
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode('agent', agentNode)
  .addNode('tools', toolsNode)
  .addNode('approve', approveNode, {
    ends: ['tools', END],
  })
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', agentRouter, ['approve', END])
  .addEdge('tools', 'agent');

const checkpointSaver = new MemorySaver();
const agent = workflow.compile({
  checkpointer: checkpointSaver,
});
const graphConfig = {
  configurable: { thread_id: '0x0005' },
};

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
    graphConfig,
  );

  const agentReply = reply.messages.at(-1).content;
  return agentReply;
}

async function readUserInterruptResponse() {
  const line = await rlp.question('');
  return line.trim();
}

async function obtainAgentInterruptResponse(userInterruptResponse) {
  const interruptCommand = new Command({
    resume: userInterruptResponse,
  });
  const reply = await agent.invoke(
    interruptCommand,
    graphConfig,
  );

  const agentReply = reply.messages.at(-1).content;
  return agentReply;
}

while (true) {
  const state = await agent.getState(graphConfig);
  const resumableInterrupts = [];
  state.tasks.forEach((task) => {
    task.interrupts.forEach((intt) => {
      if (intt.resumable) {
        resumableInterrupts.push(intt);
      }
    });
  });
  const hasInterrupts = resumableInterrupts.length > 0;
  if (hasInterrupts) {
    // There are interrupts from the previous task, obtain interrupt responses instead
    console.log('Agent (permission):\n');
    resumableInterrupts.forEach((intt) => {
      console.log(intt.value);
    });

    console.log('You (permission):\n');
    const userInterruptResponse = await readUserInterruptResponse();
    const agentResponse = await obtainAgentInterruptResponse(userInterruptResponse);

    console.log('Agent:\n');
    console.log(agentResponse);
  } else {
    // There are no interrupts from the previous task, continue normal user prompting
    console.log('You:\n');
    const userPrompt = await readUserPrompt();

    console.log('Agent:\n');
    const agentReply = await obtainAgentReply(userPrompt);
    console.log(agentReply);
  }
}
