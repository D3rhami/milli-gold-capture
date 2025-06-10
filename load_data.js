function getLastDays(days) {
    const dates = [];
    // Use the most recent data file date as the starting point
    const mostRecentDate = new Date('2025-06-10'); // Based on available files
    
    for (let i = 0; i < days; i++) {
        const date = new Date(mostRecentDate);
        date.setDate(mostRecentDate.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        dates.push(dateString);
    }
    
    return dates;
}



async function loadCsvFile(filename) {
    try {
        console.log(`📥 Fetching: ${filename}.csv`);
        const response = await fetch(`https://raw.githubusercontent.com/D3rhami/milli-gold-capture/master/database/${filename}.csv`);
        if (!response.ok) {
            console.warn(`⚠️ File ${filename}.csv not found`);
            return [];
        }
        
        const csvData = await response.text();
        const lines = csvData.split('\n');
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length === 2) {
                const date = new Date(parts[0]).getTime();
                const price = parseFloat(parts[1]);
                if (!isNaN(date) && !isNaN(price)) {
                    data.push([date, price]);
                }
            }
        }
        
        console.log(`✅ Loaded: ${filename}.csv (${data.length} records)`);
        return data;
    } catch (error) {
        console.error(`❌ Error loading ${filename}.csv:`, error);
        return [];
    }
}

function showLoadingIndicator() {
    const chartContainer = document.querySelector("#chart");
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 385px; font-family: 'Vazirmatn', sans-serif;">
                <div style="text-align: center;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #FFD700; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <div style="color: #666; font-size: 16px;">در حال بارگذاری داده‌ها...</div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }
}

async function loadDataForRange(range) {
    console.log(`🔄 Loading data for range: ${range}`);
    showLoadingIndicator();
    
    let filesToLoad = [];
    
    switch (range) {
        case '1h':
            console.log('📊 1 Hour selected - fetching today only');
            filesToLoad = getLastDays(1);
            break;
        case '1d':
            console.log('📊 1 Day selected - fetching today + yesterday');
            filesToLoad = getLastDays(2);
            break;
        case '1w':
            console.log('📊 1 Week selected - fetching 8 days (today + 7 days before)');
            filesToLoad = getLastDays(8);
            break;
        case '1m':
            console.log('📊 1 Month selected - fetching 30 days');
            filesToLoad = getLastDays(30);
            break;

        default:
            console.log('📊 Default - fetching today + yesterday');
            filesToLoad = getLastDays(2);
    }
    
    console.log(`📋 Files to load: [${filesToLoad.join(', ')}]`);
    
    const allData = [];
    let loadedFiles = 0;
    
    for (const filename of filesToLoad) {
        const data = await loadCsvFile(filename);
        allData.push(...data);
        loadedFiles++;
        console.log(`📈 Progress: ${loadedFiles}/${filesToLoad.length} files loaded`);
    }
    
    allData.sort((a, b) => a[0] - b[0]);
    
    console.log(`🎯 Total data points loaded: ${allData.length}`);
    console.log(`⏱️ Data range: ${new Date(allData[0]?.[0]).toLocaleString('fa-IR')} to ${new Date(allData[allData.length - 1]?.[0]).toLocaleString('fa-IR')}`);
    
    return allData;
}

async function loadInitialData() {
    console.log('🏠 Initial page load - loading today + yesterday for optimal performance');
    return await loadDataForRange('1d');
} 