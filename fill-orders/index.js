// index.js
import { getActiveOrdersForMaker, fillOrder, calculateFillAmount, formatOdds } from './orderFiller.js';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

async function main() {
  try {
    console.log('SX Bet Order Filler');
    console.log('-------------------');
    
    // Ask for maker address
    const { makerAddress } = await inquirer.prompt([
      {
        type: 'input',
        name: 'makerAddress',
        message: 'Enter maker address:',
        validate: input => ethers.isAddress(input) ? true : 'Please enter a valid Ethereum address'
      }
    ]);
    
    console.log(`\nFetching active orders for maker ${makerAddress}...`);
    
    // Get active orders for the maker
    const activeOrders = await getActiveOrdersForMaker(makerAddress);
    
    if (activeOrders.length === 0) {
      console.log('No active orders found for this maker.');
      return;
    }
    
    console.log(`Found ${activeOrders.length} active orders.\n`);
    
    // Format orders for display
    const orderChoices = activeOrders.map((order, index) => {
      const odds = formatOdds(order.percentageOdds);
      const side = order.isMakerBettingOutcomeOne ? 'Outcome 1' : 'Outcome 2';
      
      return {
        name: `Order ${index + 1}: Market ${order.marketHash.substring(0, 8)}... | Side: ${side} | Odds: ${odds.decimalOdds} (${odds.impliedPercentage})`,
        value: index
      };
    });
    
    // Let user select an order
    const { selectedOrderIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedOrderIndex',
        message: 'Select an order to fill:',
        choices: orderChoices
      }
    ]);
    
    const selectedOrder = activeOrders[selectedOrderIndex];
    const formattedOdds = formatOdds(selectedOrder.percentageOdds);
    
    console.log('\nSelected Order Details:');
    console.log(`Market Hash: ${selectedOrder.marketHash}`);
    console.log(`Maker: ${selectedOrder.maker}`);
    console.log(`Side: ${selectedOrder.isMakerBettingOutcomeOne ? 'Outcome 1' : 'Outcome 2'}`);
    console.log(`Odds: ${formattedOdds.decimalOdds} (${formattedOdds.impliedPercentage})`);
    console.log(`Available Size: ${ethers.formatUnits(selectedOrder.totalBetSize, 6)} USDC`);
    
    // Ask for stake amount
    const { stakeAmount } = await inquirer.prompt([
      {
        type: 'input',
        name: 'stakeAmount',
        message: 'Enter amount of USDC to stake:',
        validate: input => {
          const num = parseFloat(input);
          return !isNaN(num) && num > 0 ? true : 'Please enter a valid amount';
        }
      }
    ]);
    
    // Calculate fill amount from maker's perspective
    const fillAmount = calculateFillAmount(stakeAmount, selectedOrder.percentageOdds);
    console.log(`\nCalculated fill amount from maker's perspective: ${ethers.formatUnits(fillAmount, 6)} USDC`);
    
    // Confirm filling order
    const { confirmFill } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmFill',
        message: 'Do you want to proceed with filling this order?',
        default: false
      }
    ]);
    
    if (!confirmFill) {
      console.log('Order filling cancelled.');
      return;
    }
    
    console.log('\nFilling order...');
    const result = await fillOrder([selectedOrder], [fillAmount]);
    
    console.log('\nOrder filled successfully!');
    console.log(`Fill Hash: ${result.fillHash}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);