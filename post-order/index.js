// index.js
import readline from 'readline';
import { postOrder } from './orderPoster.js';
import { cancelOrders } from './orderCanceller.js';
import { roundToNearestStep, apiOddsToReadable, impliedToDecimalOdds } from './oddsUtils.js';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline.question
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function postNewOrder() {
  try {
    // Gather input from user
    const marketHash = await askQuestion('Enter market hash: ');
    const outcomeChoice = await askQuestion('Are you betting on outcome 1? (yes/no): ');
    const isMakerBettingOutcomeOne = outcomeChoice.toLowerCase() === 'yes';
    
    const betSizeStr = await askQuestion('Enter bet size in USDC (e.g., 10): ');
    const betSize = parseFloat(betSizeStr);
    
    if (isNaN(betSize) || betSize <= 0) {
      throw new Error('Invalid bet size. Must be a positive number.');
    }
    
    const impliedOddsStr = await askQuestion('Enter implied odds (e.g., 0.5 for 50%): ');
    const impliedOdds = parseFloat(impliedOddsStr);
    
    if (isNaN(impliedOdds) || impliedOdds <= 0 || impliedOdds >= 1) {
      throw new Error('Invalid implied odds. Must be between 0 and 1.');
    }
    
    // Round odds to nearest step on ladder
    const roundedOddsAPI = roundToNearestStep(impliedOdds);
    const roundedOddsReadable = apiOddsToReadable(roundedOddsAPI);
    const decimalOdds = impliedToDecimalOdds(roundedOddsReadable);
    
    console.log(`\nRounded odds: ${(roundedOddsReadable * 100).toFixed(2)}% implied (${decimalOdds.toFixed(2)} decimal)`);
    
    const confirmStr = await askQuestion('Proceed with posting order? (yes/no): ');
    if (confirmStr.toLowerCase() !== 'yes') {
      console.log('Order posting cancelled.');
      return;
    }
    
    console.log('\nPosting order...');
    
    // Post the order using the rounded odds
    const response = await postOrder(
      marketHash,
      isMakerBettingOutcomeOne,
      betSize,
      roundedOddsReadable
    );
    
    console.log('\nAPI Response:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error(`Error posting order: ${error.message}`);
  }
}

async function cancelOrder() {
  try {
    const orderHashInput = await askQuestion('Enter order hash to cancel: ');
    const orderHash = orderHashInput.trim();
    
    if (!orderHash) {
      throw new Error('Order hash is required.');
    }
    
    const confirmStr = await askQuestion(`Proceed with cancelling order ${orderHash}? (yes/no): `);
    if (confirmStr.toLowerCase() !== 'yes') {
      console.log('Order cancellation aborted.');
      return;
    }
    
    console.log('\nCancelling order...');
    
    // Cancel the order
    const response = await cancelOrders([orderHash]);
    
    console.log('\nAPI Response:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error(`Error cancelling order: ${error.message}`);
  }
}

async function main() {
  try {
    console.log('SX Bet Order Management');
    console.log('=======================');
    console.log('1. Post new order');
    console.log('2. Cancel order');
    console.log('3. Exit');
    
    const choice = await askQuestion('\nSelect an option (1-3): ');
    
    switch (choice) {
      case '1':
        await postNewOrder();
        break;
      case '2':
        await cancelOrder();
        break;
      case '3':
        console.log('Exiting program.');
        break;
      default:
        console.log('Invalid option. Please select 1, 2, or 3.');
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

main();