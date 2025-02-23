#!/usr/bin/env node

import { AIMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { allJokeTools } from './tools/joke.js';
import { allHederaTools } from './tools/hedera.js';

const msgReply = `OK. I sahll entertain you with 2 jokes about a car and a bar.
I shall then create a new HCS topic, and submit each joke as a message onto it`;
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
