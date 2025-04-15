// index.js
// Entry point for SX Bet API websocket subscription module

import readline from 'readline';
import dotenv from 'dotenv';
import { 
  initialize, 
  subscribeToOrderBook, 
  unsubscribeFromOrderBook, 
  isSubscribedToChannel,
  closeConnection
} from './websocket.js';

// Load environment variables
dotenv.config();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Display the main menu
 */
function showMenu() {
  console.clear();
  console.log('===== SX Bet API Websocket Module =====');
  console.log('1. Subscribe to order_book channel');
  console.log('2. Unsubscribe from current channel');
  console.log('3. Check subscription status');
  console.log('4. Exit');
  console.log('======================================');
  
  rl.question('Select an option (1-4): ', handleMenuSelection);
}

/**
 * Handle menu selection
 * @param {string} choice User's menu choice
 */
async function handleMenuSelection(choice) {
  switch (choice) {
    case '1':
      await handleSubscribe();
      break;
    case '2':
      await handleUnsubscribe();
      break;
    case '3':
      checkStatus();
      break;
    case '4':
      await exitApplication();
      return;
    default:
      console.log('Invalid option. Please try again.');
      setTimeout(showMenu, 1500);
      break;
  }
}

/**
 * Handle subscription to order_book channel
 */
async function handleSubscribe() {
  rl.question('Enter market hash: ', async (marketHash) => {
    if (!marketHash) {
      console.log('Market hash is required.');
      setTimeout(() => {
        rl.question('Press Enter to continue...', showMenu);
      }, 1000);
      return;
    }
    
    console.log('Connecting to SX Bet API...');
    
    try {
      await initialize();
      const success = await subscribeToOrderBook(marketHash);
      
      if (success) {
        console.log('Subscribed successfully.');
        console.log('Websocket messages are being logged to websocket_logs.txt');
      } else {
        console.log('Failed to subscribe to the channel.');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    setTimeout(() => {
      rl.question('Press Enter to continue...', showMenu);
    }, 1500);
  });
}

/**
 * Handle unsubscribing from the current channel
 */
async function handleUnsubscribe() {
  if (!isSubscribedToChannel()) {
    console.log('Not currently subscribed to any channel.');
    setTimeout(() => {
      rl.question('Press Enter to continue...', showMenu);
    }, 1500);
    return;
  }
  
  try {
    const success = await unsubscribeFromOrderBook();
    if (success) {
      console.log('Unsubscribed successfully.');
    } else {
      console.log('Failed to unsubscribe from the channel.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  setTimeout(() => {
    rl.question('Press Enter to continue...', showMenu);
  }, 1500);
}

/**
 * Check current subscription status
 */
function checkStatus() {
  const status = isSubscribedToChannel() 
    ? 'Currently subscribed to an order_book channel.' 
    : 'Not currently subscribed to any channel.';
  
  console.log(status);
  
  setTimeout(() => {
    rl.question('Press Enter to continue...', showMenu);
  }, 1500);
}

/**
 * Exit the application
 */
async function exitApplication() {
  console.log('Closing connection...');
  await closeConnection();
  console.log('Thank you for using SX Bet API Websocket Module!');
  rl.close();
  process.exit(0);
}

// Start the application
(async function main() {
  console.log('Starting SX Bet API Websocket Module...');
  showMenu();
})();