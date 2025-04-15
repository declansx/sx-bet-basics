// orderFiller.js
import { ethers } from 'ethers';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Constants 
const SX_BET_API_URL = 'https://api.sx.bet';
const EIP712_FILL_HASHER = '0x845a2Da2D70fEDe8474b1C8518200798c60aC364';
const TOKEN_TRANSFER_PROXY = '0x38aef22152BC8965bf0af7Cf53586e4b0C4E9936';
const USDC_BASE_TOKEN = '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B';
const CHAIN_ID = 4162;
const DOMAIN_VERSION = '6.0';
const RPC_URL = 'https://rpc.sx-rollup.gelato.digital/';

/**
 * Fetches active orders for a specific maker
 * @param {string} maker - Ethereum address of the maker
 * @returns {Promise<Array>} - Array of active orders
 */
export async function getActiveOrdersForMaker(maker) {
  try {
    const response = await fetch(`${SX_BET_API_URL}/orders?maker=${maker}`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error('Failed to fetch orders');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching active orders:', error);
    throw error;
  }
}

/**
 * Calculates the fill amount from the taker's perspective
 * @param {string} takerBetAmount - Amount the taker wants to bet
 * @param {string} percentageOdds - The odds in percentage format
 * @returns {string} - Fill amount from maker's perspective
 */
export function calculateFillAmount(takerBetAmount, percentageOdds) {
  const takerBetAmountBN = ethers.parseUnits(takerBetAmount, 6); // USDC has 6 decimals
  const percentageOddsBN = ethers.getBigInt(percentageOdds);
  const base = ethers.getBigInt('100000000000000000000'); // 10^20
  
  // Formula: fillAmount = takerBetAmount * percentageOdds / (10^20 - percentageOdds)
  const denominator = base - percentageOddsBN;
  const fillAmount = (takerBetAmountBN * percentageOddsBN) / denominator;
  
  return fillAmount.toString();
}

/**
 * Creates the EIP712 payload for filling orders
 * @param {Array} orders - Orders to fill
 * @param {Array} takerAmounts - Amount to fill for each order
 * @param {string} taker - Address of the taker
 * @returns {Object} - EIP712 payload and fillSalt
 */
function createFillOrderPayload(orders, takerAmounts, taker) {
  const fillSalt = ethers.toBigInt('0x' + randomBytes(32).toString('hex')).toString();
  
  const payload = {
    types: {
      Details: [
        { name: "action", type: "string" },
        { name: "market", type: "string" },
        { name: "betting", type: "string" },
        { name: "stake", type: "string" },
        { name: "odds", type: "string" },
        { name: "returning", type: "string" },
        { name: "fills", type: "FillObject" },
      ],
      FillObject: [
        { name: "orders", type: "Order[]" },
        { name: "makerSigs", type: "bytes[]" },
        { name: "takerAmounts", type: "uint256[]" },
        { name: "fillSalt", type: "uint256" },
        { name: "beneficiary", type: "address" },
        { name: "beneficiaryType", type: "uint8" },
        { name: "cashOutTarget", type: "bytes32" },
      ],
      Order: [
        { name: "marketHash", type: "bytes32" },
        { name: "baseToken", type: "address" },
        { name: "totalBetSize", type: "uint256" },
        { name: "percentageOdds", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "salt", type: "uint256" },
        { name: "maker", type: "address" },
        { name: "executor", type: "address" },
        { name: "isMakerBettingOutcomeOne", type: "bool" },
      ],
    },
    primaryType: "Details",
    domain: {
      name: "SX Bet",
      version: DOMAIN_VERSION,
      chainId: CHAIN_ID,
      verifyingContract: EIP712_FILL_HASHER,
    },
    message: {
      action: "N/A",
      market: "N/A",
      betting: "N/A",
      stake: "N/A",
      odds: "N/A",
      returning: "N/A",
      fills: {
        makerSigs: orders.map(order => order.signature),
        orders: orders.map(order => ({
          marketHash: order.marketHash,
          baseToken: order.baseToken,
          totalBetSize: order.totalBetSize.toString(),
          percentageOdds: order.percentageOdds.toString(),
          expiry: order.expiry.toString(),
          salt: order.salt.toString(),
          maker: order.maker,
          executor: order.executor,
          isMakerBettingOutcomeOne: order.isMakerBettingOutcomeOne,
        })),
        takerAmounts,
        fillSalt,
        beneficiary: ethers.ZeroAddress,
        beneficiaryType: 0,
        cashOutTarget: ethers.ZeroHash,
      },
    },
  };
  
  return { payload, fillSalt };
}

/**
 * Fills an order on SX Bet
 * @param {Array} orders - Orders to fill
 * @param {Array} takerAmounts - Amount to fill for each order
 * @returns {Promise<Object>} - Fill result
 */
export async function fillOrder(orders, takerAmounts) {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Private key is not set in .env file');
    }
    
    const taker = '0xa6fa134f76496300419E6dbee487239F09d247aE';
    const wallet = new ethers.Wallet(privateKey);

    // Create EIP712 payload
    const { payload, fillSalt } = createFillOrderPayload(orders, takerAmounts, taker);

    // Sign the payload
    const signature = await wallet.signTypedData(
      payload.domain,
      payload.types,
      payload.message
    );

    // Create API payload
    const apiPayload = {
      orderHashes: orders.map(order => order.orderHash),
      takerAmounts,
      taker,
      takerSig: signature,
      fillSalt,
      action: "N/A",
      market: "N/A",
      betting: "N/A",
      stake: "N/A",
      odds: "N/A",
      returning: "N/A"
    };

    // Send request to SX Bet API
    const response = await fetch(`${SX_BET_API_URL}/orders/fill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(`Fill failed: ${JSON.stringify(result)}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error filling order:', error);
    throw error;
  }
}

/**
 * Formats odds for display
 * @param {string} percentageOdds - The odds in SX Bet format
 * @returns {Object} - Formatted odds information
 */
export function formatOdds(percentageOdds) {
  const impliedOdds = Number(percentageOdds) / 1e20;
  const decimalOdds = 1 / impliedOdds;
  return {
    impliedPercentage: (impliedOdds * 100).toFixed(2) + '%',
    decimalOdds: decimalOdds.toFixed(2)
  };
}