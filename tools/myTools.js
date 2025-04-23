import { AccountId, Hbar, TransferTransaction, AccountBalanceQuery } from '@hashgraph/sdk';
import { Tool } from "@langchain/core/tools";

// Tool for transferring HBAR
export class TransferHbarTool extends Tool {
  name = "transfer_hbar";
  description = "Transfer HBAR to a target account. Input must include toAccountId and amount.";
  client;

  constructor(client) {
    super();
    this.client = client;
  }

  async _call(input) {
    try {
      // Convert input string to object
      let params;
      try {
        params = typeof input === 'string' ? JSON.parse(input) : input;
      } catch (parseError) {
        console.error("Error parsing input JSON:", parseError, "Input was:", input);
        return JSON.stringify({ 
          success: false, 
          error: "Invalid input format. Expected JSON with toAccountId and amount." 
        });
      }

      const { toAccountId, amount } = params;
      
      if (!toAccountId || !amount) {
        return JSON.stringify({ 
          success: false, 
          error: "You must provide both toAccountId and amount" 
        });
      }

      console.log(`Transferring ${amount} HBAR to ${toAccountId}`);
      
      // Get operator account
      const operatorId = this.client.operatorAccountId;
      
      // Convert to correct formats
      const amountHbar = typeof amount === 'string' 
        ? Hbar.fromString(amount.toString())
        : Hbar.from(amount);
      
      const recipientId = typeof toAccountId === 'string'
        ? AccountId.fromString(toAccountId)
        : toAccountId;
      
      // Create transaction
      const transaction = new TransferTransaction()
        .addHbarTransfer(operatorId, amountHbar.negated())
        .addHbarTransfer(recipientId, amountHbar)
        .freezeWith(this.client);
      
      // Execute
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const status = receipt.status.toString();
      
      console.log(`Transfer completed: ${status}`);
      
      return JSON.stringify({
        success: status === "SUCCESS",
        status,
        txId: txResponse.transactionId.toString()
      });
    } catch (error) {
      console.error("Error in transfer:", error);
      return JSON.stringify({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

// Tool for checking HBAR balance
export class GetBalanceTool extends Tool {
  name = "get_balance";
  description = "Check the HBAR balance of an account. You can specify an accountId or leave it empty to check the operator account.";
  client;

  constructor(client) {
    super();
    this.client = client;
  }

  async _call(input) {
    try {
      // Handle input intelligently - detect if it's JSON or directly an account ID
      let params = {};
      
      if (typeof input === 'string') {
        if (input.trim() === '') {
          // Empty input - default to operator account
        } else if (input.match(/^0\.0\.[0-9]+$/)) {
          // Input is directly an account ID
          params.accountId = input.trim();
          console.log("Using direct account ID input:", params.accountId);
        } else {
          // Try to parse as JSON
          try {
            const cleanInput = input.trim().replace(/^\uFEFF/, '');
            params = JSON.parse(cleanInput);
          } catch (parseError) {
            // Not valid JSON, check if it contains an account ID
            const match = input.match(/0\.0\.[0-9]+/);
            if (match) {
              params.accountId = match[0];
              console.log("Extracted account ID from text:", params.accountId);
            } else {
              console.log("Input could not be parsed as JSON and does not contain a valid account ID:", input);
            }
          }
        }
      } else if (typeof input === 'object') {
        // Input is already an object
        params = input;
      }
        
      const { accountId } = params;
      
      // Determine the account to query
      const targetAccount = accountId
        ? (typeof accountId === 'string' ? AccountId.fromString(accountId) : accountId)
        : this.client.operatorAccountId;
      
      console.log(`Checking balance of ${targetAccount.toString()}`);
      
      // Execute query
      const query = new AccountBalanceQuery()
        .setAccountId(targetAccount);
      
      const balance = await query.execute(this.client);
      
      console.log(`Balance: ${balance.hbars.toString()}`);
      
      return JSON.stringify({
        hbars: balance.hbars.toString(),
        tokens: balance.tokens._map.size > 0 ? balance.tokens.toJSON() : {}
      });
    } catch (error) {
      console.error("Error checking balance:", error);
      return JSON.stringify({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

// Function to create all tools
export function createMyTools(client) {
  return [
    new TransferHbarTool(client),
    new GetBalanceTool(client)
  ];
} 