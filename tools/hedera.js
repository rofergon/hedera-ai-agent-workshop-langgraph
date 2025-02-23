import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { createInstance } from '../api/hedera-client.js';

const client = createInstance();

/* CMD_HCS_CREATE_TOPIC */

const commandHcsCreateTopicDef = {
  name: 'CMD_HCS_CREATE_TOPIC',
  description: 'create a new HCS Topic',
  schema: z.object({
    memo: z
      .string()
      .describe('a memo for the topic with'),
  }),
};

async function commandHcsCreateTopicImpl(inputs) {
  console.log('CMD_HCS_CREATE_TOPIC invoked with inputs:', inputs);

  const { memo } = inputs;

  // return {
  //   txId: 'dummy-tx-id',
  //   topicId: `0.0.${Date.now()}`,
  // };

  const tx = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .freezeWith(client);

  const txId = tx.transactionId;
  const txSigned = await tx.signWithOperator(client);
  const txSubmitted = await txSigned.execute(client);
  const txReceipt = await txSubmitted.getReceipt(client);

  const topicId = txReceipt.topicId;

  return {
    txId: txId.toString(),
    topicId: topicId.toStringWithChecksum(client),
  };
}

const commandHcsCreateTopicTool = tool(commandHcsCreateTopicImpl,commandHcsCreateTopicDef);

/* CMD_HCS_SUBMIT_TOPIC_MESSAGE */

const commandHcsSubmitTopicMessageDef = {
  name: 'CMD_HCS_SUBMIT_TOPIC_MESSAGE',
  description: 'submit a message to an existing HCS topic',
  schema: z.object({
    topicId: z
      .string()
      .describe('the ID of the HCS topic to submit a message to'),
    message: z
      .string()
      .describe('the text of the message to submit'),
  }),
};

async function commandHcsSubmitTopicMessageImpl(inputs) {
  console.log('CMD_HCS_SUBMIT_TOPIC_MESSAGE invoked with inputs:', inputs);

  const { topicId, message } = inputs;

  // return {
  //   txId: 'dummy-tx-ID',
  //   topicId,
  //   topicSequenceNumber: Date.now(),
  // };

  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .freezeWith(client);

  const txId = tx.transactionId;
  const txSigned = await tx.signWithOperator(client);
  const txSubmitted = await txSigned.execute(client);
  const txReceipt = await txSubmitted.getReceipt(client);

  const topicSequenceNumber = txReceipt.topicSequenceNumber;

  return {
    txId: txId.toString(),
    topicSequenceNumber,
  };
}

const commandHcsSubmitTopicMessageTool = tool(commandHcsSubmitTopicMessageImpl, commandHcsSubmitTopicMessageDef);

const allHederaTools = [
  commandHcsCreateTopicTool,
  commandHcsSubmitTopicMessageTool,
];

export {
  commandHcsCreateTopicTool,
  commandHcsSubmitTopicMessageTool,
  allHederaTools,
};
