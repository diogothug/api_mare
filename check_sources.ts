import { MarineDataService } from './src/services/MarineDataService';

async function main() {
    console.log('🌊 Marine Data API - Source Checker');

    const service = new MarineDataService();
    const region = 'Velha Boipeba';

    console.log(`\nTesting Aggregation for region: ${region}...`);
    try {
        // No source specified -> should use Cache or Default Provider
        const data = await service.getTides(region);
        console.log('✅ Success!');
        console.log(`   Source: ${data.source}`);

        const fs = require('fs');
        fs.writeFileSync('check_result.txt', `Success\nSource: ${data.source}\nTides: ${data.tides.length}`);
        console.log(`   Location: ${data.location}`);
        console.log(`   Tides found: ${data.tides.length}`);
        if (data.tides.length > 0) {
            console.log('   First tide:', data.tides[0]);
        }
    } catch (error) {
        console.error('❌ Failed:', error);
        const fs = require('fs');
        fs.writeFileSync('check_result.txt', `Failed\nError: ${error}`);
    }
}

main();
