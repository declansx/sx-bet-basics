import axios from 'axios';

async function fetchMetadata() {
    try {
        const response = await axios.get('https://api.sx.bet/metadata?chainVersion=SXR');
        console.log(response.data);
    } catch (error) {
        console.error('Error fetching metadata:', error);
    }
}

fetchMetadata();
