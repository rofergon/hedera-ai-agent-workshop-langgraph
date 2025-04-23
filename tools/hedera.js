import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { TopicCreateTransaction, TopicMessageSubmitTransaction, AccountId, Hbar, TransferTransaction, AccountBalanceQuery } from '@hashgraph/sdk';
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

export const createHederaTools = (client) => {
  // Herramienta para transferir HBAR
  const transferHbarTool = tool({
    name: 'hedera_transfer_hbar',
    description: 'Transfiere HBAR a una cuenta destino',
    schema: z.object({
      toAccountId: z.string().describe('ID de la cuenta destino'),
      amount: z.number().or(z.string()).describe('Cantidad de HBAR a transferir')
    }),
    func: async ({ toAccountId, amount }) => {
      console.log(`Ejecutando transferencia de ${amount} HBAR a ${toAccountId}`);
      try {
        const result = await transferHbar({ toAccountId, amount, client });
        return JSON.stringify(result);
      } catch (error) {
        console.error("Error en herramienta transferHbarTool:", error);
        return JSON.stringify({
          success: false,
          error: error.message
        });
      }
    }
  });

  // Herramienta para consultar balance
  const getBalanceTool = tool({
    name: 'hedera_get_balance',
    description: 'Consulta el balance de HBAR de una cuenta',
    schema: z.object({
      accountId: z.string().optional().describe('ID de la cuenta (opcional)')
    }),
    func: async ({ accountId }) => {
      console.log(`Consultando balance${accountId ? ` de ${accountId}` : ''}`);
      try {
        const result = await getHbarBalance({ accountId, client });
        return JSON.stringify(result);
      } catch (error) {
        console.error("Error en herramienta getBalanceTool:", error);
        return JSON.stringify({
          success: false,
          error: error.message
        });
      }
    }
  });

  console.log("Herramientas creadas correctamente con nombres:", 
    [transferHbarTool.name, getBalanceTool.name]);

  // Lista de todas las herramientas disponibles
  return [transferHbarTool, getBalanceTool];
};

/**
 * Transfiere HBAR de la cuenta operadora a la cuenta destino
 * @param {Object} params - Parámetros para la transferencia
 * @param {string} params.toAccountId - ID de la cuenta destino
 * @param {number|string} params.amount - Cantidad de HBAR a transferir
 * @param {Object} params.client - Cliente Hedera inicializado
 */
export async function transferHbar(params) {
  try {
    const { toAccountId, amount, client } = params;
    console.log("Ejecutando transferencia HBAR:", { toAccountId, amount });
    
    // Verificar parámetros
    if (!toAccountId || !amount || !client) {
      throw new Error("Faltan parámetros requeridos para la transferencia");
    }
    
    // Obtener el ID de la cuenta operadora
    const operatorId = client.operatorAccountId;
    if (!operatorId) {
      throw new Error("No se encontró la cuenta operadora en el cliente");
    }
    
    // Convertir amount a Hbar
    const amountHbar = typeof amount === 'string' 
      ? Hbar.fromString(amount.toString()) 
      : Hbar.from(amount);
    
    // Parsear la cuenta destino
    const recipientId = typeof toAccountId === 'string'
      ? AccountId.fromString(toAccountId)
      : toAccountId;
    
    console.log(`Transfiriendo ${amountHbar.toString()} de ${operatorId.toString()} a ${recipientId.toString()}`);
    
    // Crear transacción
    const transaction = new TransferTransaction()
      .addHbarTransfer(operatorId, amountHbar.negated())
      .addHbarTransfer(recipientId, amountHbar)
      .freezeWith(client);
    
    // Ejecutar transacción (la firma se maneja automáticamente porque estamos usando el operador)
    const txResponse = await transaction.execute(client);
    
    // Obtener recibo
    const receipt = await txResponse.getReceipt(client);
    const status = receipt.status.toString();
    
    console.log(`Transferencia completada con estado: ${status}`);
    console.log(`ID de transacción: ${txResponse.transactionId.toString()}`);
    
    return {
      success: status === "SUCCESS",
      status,
      txId: txResponse.transactionId.toString()
    };
  } catch (error) {
    console.error("Error en transferencia HBAR:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene el balance de HBAR de una cuenta
 * @param {Object} params - Parámetros para consultar el balance
 * @param {string} [params.accountId] - ID de la cuenta (opcional, usa la operadora por defecto)
 * @param {Object} params.client - Cliente Hedera inicializado
 */
export async function getHbarBalance(params) {
  try {
    const { accountId, client } = params;
    
    // Verificar cliente
    if (!client) {
      throw new Error("Cliente Hedera no proporcionado");
    }
    
    // Usar la cuenta operadora si no se especifica una cuenta
    const targetAccount = accountId 
      ? (typeof accountId === 'string' ? AccountId.fromString(accountId) : accountId)
      : client.operatorAccountId;
    
    if (!targetAccount) {
      throw new Error("No se pudo determinar la cuenta a consultar");
    }
    
    console.log(`Consultando balance de ${targetAccount.toString()}`);
    
    // Crear y ejecutar consulta de balance
    const query = new AccountBalanceQuery()
      .setAccountId(targetAccount);
    
    const balance = await query.execute(client);
    
    console.log(`Balance: ${balance.hbars.toString()}`);
    
    return {
      hbars: balance.hbars.toString(),
      tokens: balance.tokens._map.size > 0 ? balance.tokens.toJSON() : {}
    };
  } catch (error) {
    console.error("Error al consultar balance:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Exportar todas las funciones
export const hederaTools = {
  transferHbar,
  getHbarBalance
};
