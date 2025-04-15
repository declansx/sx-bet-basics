// tradeFetcher.js - Module for fetching trades from SX Bet API

/**
 * Fetches trades from the SX Bet API based on provided parameters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - API response with trades data
 */
export async function fetchTrades(params = {}) {
    try {
      const baseUrl = 'https://api.sx.bet/trades';
      const queryParams = new URLSearchParams();
      
      // Add provided parameters to query string
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Handle arrays like marketHashes
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value);
          }
        }
      });
      
      const queryString = queryParams.toString();
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(`API returned non-success status: ${data.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching trades:', error);
      throw error;
    }
  }
  
  /**
   * Fetches all pages of trades based on provided parameters
   * @param {Object} params - Query parameters
   * @param {number} maxRecords - Maximum number of records to fetch
   * @returns {Promise<Array>} - Array of all fetched trades
   */
  export async function fetchAllTrades(params = {}, maxRecords = 100) {
    try {
      let allTrades = [];
      let nextKey = null;
      let pageSize = Math.min(100, maxRecords); // API default is 100
      
      // Create a copy of params to avoid modifying the original
      const queryParams = { ...params, pageSize };
      
      do {
        if (nextKey) {
          queryParams.paginationKey = nextKey;
        }
        
        const response = await fetchTrades(queryParams);
        const trades = response.data.trades || [];
        
        allTrades = [...allTrades, ...trades];
        nextKey = response.data.nextKey;
        
        // Stop if we've reached the maximum number of records
        if (allTrades.length >= maxRecords) {
          allTrades = allTrades.slice(0, maxRecords);
          break;
        }
        
      } while (nextKey && allTrades.length < maxRecords);
      
      return allTrades;
    } catch (error) {
      console.error('Error fetching all trades:', error);
      throw error;
    }
  }
  
  /**
   * Calculate the timestamp for X hours ago
   * @param {number} hours - Number of hours
   * @returns {number} - Unix timestamp in seconds
   */
  export function getTimestampHoursAgo(hours) {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const hoursInSeconds = hours * 60 * 60;
    return now - hoursInSeconds;
  }