#!/usr/bin/env node

import { createInstance as createHederaClient } from './api/hedera-client.js';
import { Client, AccountId, Hbar, TransferTransaction, PrivateKey, AccountBalanceQuery } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function testHbarTransfer() {
  try {
    // 1. Initialize client manually to see if it works better
    console.log("Initializing Hedera client manually...");
    
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_ACCOUNT_PRIVATE_KEY;
    const privateKeyType = process.env.HEDERA_ACCOUNT_PRIVATE_KEY_TYPE || 'ECDSA';
    const network = process.env.HEDERA_ACCOUNT_NETWORK || 'testnet';
    
    console.log({
      network,
      accountId,
      privateKey: privateKey.substring(0, 10) + '...',
      privateKeyType
    });
    
    // Parse account ID
    const operatorId = AccountId.fromString(accountId);
    
    // Parse private key based on type
    let operatorKey;
    try {
      if (privateKeyType.toLowerCase() === 'ecdsa') {
        operatorKey = PrivateKey.fromStringECDSA(privateKey);
      } else {
        operatorKey = PrivateKey.fromStringED25519(privateKey);
      }
      console.log("Private key parsed correctly:", operatorKey.toString());
    } catch (error) {
      console.error("Error parsing private key:", error);
      process.exit(1);
    }
    
    // Create client based on network
    let client;
    switch (network) {
      case 'testnet':
        client = Client.forTestnet();
        break;
      case 'mainnet':
        client = Client.forMainnet();
        break;
      case 'previewnet':
        client = Client.forPreviewnet();
        break;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
    
    // Configure operator
    client.setOperator(operatorId, operatorKey);
    console.log("Client configured with operator:", client.operatorAccountId?.toString() || "Unknown");
    
    // 2. Check current balance - Use AccountBalanceQuery instead of getAccountBalance
    console.log("\nChecking balance...");
    const balanceQuery = new AccountBalanceQuery()
        .setAccountId(operatorId);
    const balance = await balanceQuery.execute(client);
    console.log(`Account balance ${operatorId}: ${balance.hbars.toString()}`);
    
    // 3. Perform simple transfer
    console.log("\nPerforming HBAR transfer...");
    const amount = Hbar.fromTinybars(50_000_000); // 0.5 HBAR for testing
    const destinationId = AccountId.fromString("0.0.5864846");
    
    const transaction = new TransferTransaction()
      .addHbarTransfer(operatorId, amount.negated())
      .addHbarTransfer(destinationId, amount)
      .freezeWith(client);
    
    // 4. Sign and execute transaction
    const signedTx = await transaction.sign(operatorKey);
    const txResponse = await signedTx.execute(client);
    
    // 5. Get transaction receipt
    const receipt = await txResponse.getReceipt(client);
    console.log(`\nTransfer ${receipt.status.toString()}`);
    console.log("Transaction hash:", txResponse.transactionId.toString());
    
    // 6. Check balance after transfer
    const newBalanceQuery = new AccountBalanceQuery()
        .setAccountId(operatorId);
    const newBalance = await newBalanceQuery.execute(client);
    console.log(`\nNew balance: ${newBalance.hbars.toString()}`);
    
    return "Test completed successfully";
  } catch (error) {
    console.error("\nError in test:", error);
    return `Error: ${error.message}`;
  }
}

// Execute the test
testHbarTransfer()
  .then(console.log)
  .catch(console.error)
  .finally(() => process.exit(0)); 