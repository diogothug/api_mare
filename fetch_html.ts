import axios from 'axios';
import fs from 'fs';

async function fetchPage() {
    try {
        const response = await axios.get('https://tabuademares.com/br/bahia/velha-boipeba');
        fs.writeFileSync('temp_page.html', response.data);
        console.log('Page saved to temp_page.html');
    } catch (error) {
        console.error('Error fetching page:', error);
    }
}

fetchPage();
