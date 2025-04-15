// index.js - Entry point for SX Bet order viewing application
import readline from 'readline';
import { fetchOrders, groupOrdersByOutcome } from './orderFetcher.js';
import { formatOrderForTaker } from './utils.js';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Displays orders in a table format
 * @param {Array} orders - Array of formatted orders
 * @param {number} outcome - Outcome number (1 or 2)
 */
function displayOrdersTable(orders, outcome) {
  if (!orders || orders.length === 0) {
    console.log(`\nNo orders found for Outcome ${outcome}`);
    return;
  }

  console.log(`\n============ OUTCOME ${outcome} ORDERS ============`);
  console.log('Order Hash (first 10 chars) | Implied Odds | Decimal Odds | Available Size (USDC) | Created At');
  console.log('---------------------------- | ------------ | ------------ | --------------------- | ----------');
  
  orders.forEach(order => {
    const shortHash = order.orderHash.substring(0, 10) + '...';
    console.log(
      `${shortHash} | ${order.impliedOddsFormatted} | ${order.decimalOdds} | ${order.availableBetSize} | ${order.createdAt}`
    );
  });
  console.log('');
}

/**
 * Main function to prompt for market hash and display orders
 */
async function main() {
  rl.question('Enter market hash: ', async (marketHash) => {
    if (!marketHash) {
      console.log('Market hash is required');
      rl.close();
      return;
    }

    try {
      console.log(`Fetching orders for market: ${marketHash}`);
      const orders = await fetchOrders(marketHash);
      
      if (!orders || orders.length === 0) {
        console.log('No orders found for this market');
        rl.close();
        return;
      }
      
      console.log(`Found ${orders.length} orders`);
      
      // Group and format orders by outcome
      const groupedOrders = groupOrdersByOutcome(orders);
      
      // Format orders for display
      const formattedOrders = {};
      for (const outcome in groupedOrders) {
        formattedOrders[outcome] = groupedOrders[outcome].map(formatOrderForTaker);
      }
      
      // Display tables for each outcome
      displayOrdersTable(formattedOrders[1], 1);
      displayOrdersTable(formattedOrders[2], 2);
      
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      rl.close();
    }
  });
}

// Run the application
main();