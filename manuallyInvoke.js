#!/usr/bin/env node

import { AIMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { allJokeTools } from './tools/joke.js';
import { allHederaTools } from './tools/hedera.js';

// Query response (1)
const msgReply =
  `OK. I shall entertain you with 2 jokes about a car and a bar.`;
const manualInvocationMsg = new AIMessage({
  content: msgReply,
  tool_calls: [
    {
      name: 'QRY_JOKE',
      args: {
        contains: 'car',
      },
      type: 'tool_call',
      id: '0x0001',
    },
    {
      name: 'QRY_JOKE',
      args: {
        contains: 'bar',
      },
      type: 'tool_call',
      id: '0x0002',
    },
  ],
});

const jokeToolNode = new ToolNode(allJokeTools);
const manualInvocationResults = await jokeToolNode.invoke({
  messages: [manualInvocationMsg],
});

console.log(manualInvocationResults);

// Query Response (2)

const msgReply2 =
  `I shall next create a new HCS topic.`
const manualInvocationMsg2 = new AIMessage({
  content: msgReply2,
  tool_calls: [
    {
      name: 'CMD_HCS_CREATE_TOPIC',
      args: {
        memo: 'A new topic for jokes! (created by Hedera AI Agent, via LangGraph)',
      },
      type: 'tool_call',
      id: '0x0003',
    },
  ],
});

const hederaToolNode = new ToolNode(allHederaTools);
const manualInvocationResults2 = await hederaToolNode.invoke({
  messages: [manualInvocationMsg2],
});

console.log(manualInvocationResults2);

// Query Response (3)

const toolCall0x0001Response =
  manualInvocationResults.messages.filter(
    (msg) => (msg.tool_call_id === '0x0001'))[0];
const toolCall0x0002Response =
  manualInvocationResults.messages.filter(
    (msg) => (msg.tool_call_id === '0x0002'))[0];
const toolCall0x0003Response =
  manualInvocationResults2.messages.filter(
    (msg) => (msg.tool_call_id === '0x0003'))[0];

const msgReply3 =
  `Finally, I shall next submit each joke as a message onto the HCS topic.`
const manualInvocationMsg3 = new AIMessage({
  content: msgReply3,
  tool_calls: [
    {
      name: 'CMD_HCS_SUBMIT_TOPIC_MESSAGE',
      args: {
        topicId: JSON.parse(toolCall0x0003Response.content).topicId, // NOTE retrieved from 0x0003,
        message: JSON.parse(toolCall0x0001Response.content).joke, // NOTE retrieved from 0x0001,
      },
      type: 'tool_call',
      id: '0x0004',
    },
    {
      name: 'CMD_HCS_SUBMIT_TOPIC_MESSAGE',
      args: {
        topicId: JSON.parse(toolCall0x0003Response.content).topicId, // NOTE retrieved from 0x0003,
        message: JSON.parse(toolCall0x0002Response.content).joke, // NOTE retrieved from 0x0002,
      },
      type: 'tool_call',
      id: '0x0005',
    },
  ],
});

const manualInvocationResults3 = await hederaToolNode.invoke({
  messages: [manualInvocationMsg3],
});

console.log(manualInvocationResults3);
