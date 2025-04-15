// index.js - Entry point for trade fetching application

import { fetchAllTrades, getTimestampHoursAgo } from './tradeFetcher.js';
import { toNominalAmount, toImpliedOdds, toDecimalOdds } from './utils.js';

// Function to format trade data for display
function formatTrade(trade) {
  const betTime = new Date(trade.betTime * 1000).toLocaleString();
  const impliedOdds = toImpliedOdds(trade.odds);
  const decimalOdds = toDecimalOdds(impliedOdds);
  const stake = toNominalAmount(trade.stake);
  
  return {
    bettor: trade.bettor,
    marketHash: trade.marketHash,
    stake: stake.toFixed(2),
    impliedOdds: (impliedOdds * 100).toFixed(2) + '%',
    decimalOdds: decimalOdds.toFixed(2),
    betTime,
    maker: trade.maker,
    settled: trade.settled,
    bettingOutcomeOne: trade.bettingOutcomeOne,
    chainVersion: trade.chainVersion || 'N/A',
    baseToken: trade.baseToken
  };
}

// Main function to fetch and display trades
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const params = {};
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace('--', '');
      const value = args[i + 1];
      
      switch (key) {
        case 'bettor':
          params.bettor = value;
          break;
        case 'market':
          params.marketHashes = [value];
          break;
        case 'chain':
          params.chainVersion = value;
          break;
        case 'token':
          params.baseToken = value;
          break;
        case 'records':
          params.maxRecords = parseInt(value, 10);
          break;
        case 'hours':
          const hoursAgo = parseInt(value, 10);
          params.startDate = getTimestampHoursAgo(hoursAgo);
          break;
        default:
          console.warn(`Unknown parameter: ${key}`);
      }
    }
    
    const maxRecords = params.maxRecords || 100;
    delete params.maxRecords;
    
    console.log('Fetching trades with parameters:', params);
    
    // Fetch trades
    const trades = await fetchAllTrades(params, maxRecords);
    
    if (trades.length === 0) {
      console.log('No trades found matching the criteria.');
      return;
    }
    
    // Sort trades by betTime (most recent first)
    const sortedTrades = [...trades].sort((a, b) => b.betTime - a.betTime);
    
    // Format and display trades
    console.log(`\nRetrieved ${sortedTrades.length} trades:`);
    console.log('--------------------------------------------------');
    
    sortedTrades.forEach((trade, index) => {
      const formattedTrade = formatTrade(trade);
      console.log(`Trade #${index + 1}:`);
      Object.entries(formattedTrade).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('--------------------------------------------------');
    });
    
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the main function
main();

/*
Example usage:
node index.js --bettor 0x5aC843EecBf67669d4003aa49aE5e0136dc73365 --chain SXR --records 5 --hours 24

Command line arguments:
--bettor [wallet address]   : Filter by bettor address
--market [market hash]      : Filter by market hash
--chain [SXR or SXN]        : Filter by chain version
--token [contract address]  : Filter by base token contract address
--records [number]          : Maximum number of records to retrieve
--hours [number]            : Only fetch trades from the last X hours
*/