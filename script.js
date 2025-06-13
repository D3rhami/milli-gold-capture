const fee = 1.005;
const fac = 1000;
let feeEnabled = false;

window.feeEnabled = feeEnabled;

function updateCurrentTime() {
    const now = new Date();
    const currentTimeElement = document.getElementById('current-time');
    const formattedTime = now.toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Tehran'
    });
    currentTimeElement.textContent = `زمان فعلی: ${formattedTime}`;
}

function updateLastDataTime() {
    if (allChartData.length > 0) {
        const lastDataTimestamp = allChartData[allChartData.length - 1][0];
        const lastDataTime = new Date(lastDataTimestamp);
        const lastDataTimeElement = document.getElementById('last-data-time');
        const statusElement = document.getElementById('data-status');
        
        const formattedTime = lastDataTime.toLocaleTimeString('fa-IR', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        const formattedDate = lastDataTime.toLocaleDateString('fa-IR');
        
        lastDataTimeElement.textContent = `آخرین داده: ${formattedDate} ${formattedTime}`;
        
        const currentTime = new Date();
        const timeDifference = currentTime.getTime() - lastDataTimestamp;
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        
        if (hoursDifference > 1) {
            statusElement.textContent = `❌ داده‌ها ${Math.floor(hoursDifference)} ساعت قدیمی هستند!`;
            statusElement.className = 'status-error';
        } else {
            statusElement.textContent = '✅ داده‌ها به‌روز هستند';
            statusElement.className = 'status-ok';
        }
    }
}

function toggleFee() {
    feeEnabled = !feeEnabled;
    window.feeEnabled = feeEnabled;
    console.log('💰 Fee toggled:', feeEnabled ? 'ON' : 'OFF');
    filterData(currentRange);
}

let progressInterval;
let progressWidth = 0;
const refreshTime = 60;

function startProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;
    
    // Create inner element if it doesn't exist
    let progressInner = document.getElementById('progress-inner');
    if (!progressInner) {
        progressInner = document.createElement('div');
        progressInner.id = 'progress-inner';
        progressBar.appendChild(progressInner);
    }
    
    progressWidth = 0;
    clearInterval(progressInterval);
    
    progressInterval = setInterval(() => {
        progressWidth = (progressWidth + (100 / refreshTime)) % 100;
        progressInner.style.width = `${progressWidth}%`;
            
        if (progressWidth >= 99) {
            refreshData();
            progressWidth = 0;
        }
    }, 1000);
}

function refreshData() {
    const currentDate = new Date();
    fetch(`/database/today.csv?t=${currentDate.getTime()}`)
        .then(response => response.text())
        .then(data => {
            updateChartData(data);
            updateLastDataTime();
        })
        .catch(error => {
            console.error('Error refreshing data:', error);
        });
}

function initProgressBar() {
    const progressBarElement = document.getElementById('progress-bar');
    if (!progressBarElement) return;
    
    startProgressBar();
}

updateCurrentTime();
setInterval(updateCurrentTime, 1000);
setInterval(updateLastDataTime, 30000);

document.addEventListener('DOMContentLoaded', initProgressBar);

document.getElementById('one_hour').addEventListener('click', () => { 
    console.log('🕐 User clicked: 1 Hour button'); 
    currentRange = '1h'; 
    filterData('1h'); 
});

document.getElementById('one_day').addEventListener('click', () => { 
    console.log('📅 User clicked: 1 Day button'); 
    currentRange = '1d'; 
    filterData('1d'); 
});

document.getElementById('one_week').addEventListener('click', () => { 
    console.log('📊 User clicked: 1 Week button'); 
    currentRange = '1w'; 
    filterData('1w'); 
});

document.getElementById('one_month').addEventListener('click', () => { 
    console.log('📆 User clicked: 1 Month button'); 
    currentRange = '1m'; 
    filterData('1m'); 
});

document.getElementById('fee_toggle').addEventListener('click', toggleFee); 