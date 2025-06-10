const DEBUG = false;
const REPO_OWNER = 'D3rhami';
const REPO_NAME = 'milli-gold-capture';
const DATABASE_PATH = 'database';

function _log(msg) {
    if (DEBUG) {
        console.log(msg);
    }
}

function getTehranDateTime() {
    // Get current time in Tehran timezone
    const now = new Date();
    const tehranTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tehran"}));
    return tehranTime;
}

function formatTehranTime(date, format = 'full') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    if (format === 'date') {
        return `${year}-${month}-${day}`;
    }
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function logError(errorMsg, env) {
    try {
        const tehranTime = getTehranDateTime();
        const today = formatTehranTime(tehranTime, 'date');
        const timestamp = formatTehranTime(tehranTime);
        
        const logContent = `[${timestamp}] ${errorMsg}\n`;
        _log(`Logging error: ${logContent.trim()}`);
        
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATABASE_PATH}/server.log`;
        const headers = {
            'Authorization': `token ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Cloudflare-Worker'
        };
        
        let newContent = logContent;
        let sha = null;
        
        try {
            const response = await fetch(url, { headers });
            if (response.ok) {
                const data = await response.json();
                const existingContent = atob(data.content);
                newContent = existingContent + logContent;
                sha = data.sha;
            }
        } catch (e) {
            _log(`Error getting existing log: ${e}`);
        }
        
        const encodedContent = btoa(newContent);
        const requestData = {
            message: `Update server.log - ${today}`,
            content: encodedContent
        };
        
        if (sha) {
            requestData.sha = sha;
        }
        
        const logResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!logResponse.ok) {
            _log(`Failed to log error to GitHub: ${logResponse.status} - ${await logResponse.text()}`);
        }
    } catch (e) {
        _log(`Failed to log error: ${e}`);
        _log(`Original error was: ${errorMsg}`);
    }
}

async function getGoldPrice() {
    const url = "https://milli.gold/api/v1/public/milli-price/external";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept": "application/json",
    };
    
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (e) {
        return `error was ${e}`;
    }
}

async function getCsvFromGithub(filename, env) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATABASE_PATH}/${filename}`;
    const headers = {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Worker'
    };
    
    try {
        _log(`Fetching CSV from GitHub: ${filename}`);
        const response = await fetch(url, { headers });
        _log(`GitHub GET response: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            const content = atob(data.content);
            const sha = data.sha;
            _log(`Successfully fetched existing CSV with ${content.length} characters`);
            return { content, sha };
        } else if (response.status === 404) {
            _log(`CSV file ${filename} doesn't exist yet, will create new one`);
            return { content: null, sha: null };
        } else {
            const errorText = await response.text();
            _log(`Unexpected response from GitHub: ${response.status} - ${errorText}`);
            await logError(`Error fetching CSV from GitHub: ${response.status} - ${errorText}`, env);
            return { content: null, sha: null };
        }
    } catch (e) {
        _log(`Exception while fetching CSV: ${e}`);
        await logError(`Error fetching CSV from GitHub: ${e}`, env);
        return { content: null, sha: null };
    }
}

async function pushCsvToGithub(filename, content, sha, env) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATABASE_PATH}/${filename}`;
    const headers = {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Worker',
        'Content-Type': 'application/json'
    };
    
    const encodedContent = btoa(content);
    const price = content.trim().split('\n').pop().split(',')[0];
    
    const requestData = {
        message: jaliMsg(price),
        content: encodedContent
    };
    
    if (sha) {
        requestData.sha = sha;
        _log(`Updating existing file ${filename} with SHA: ${sha}`);
    } else {
        _log(`Creating new file ${filename}`);
    }
    
    try {
        _log(`Pushing CSV to GitHub: ${filename}`);
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestData)
        });
        _log(`GitHub PUT response: ${response.status}`);
        
        if (response.ok) {
            _log(`Successfully pushed ${filename} to GitHub`);
            return true;
        } else {
            const errorText = await response.text();
            const errorMsg = `Failed to push ${filename}: ${response.status} - ${errorText}`;
            _log(errorMsg);
            await logError(errorMsg, env);
            return false;
        }
    } catch (e) {
        const errorMsg = `Exception pushing CSV to GitHub: ${e}`;
        _log(errorMsg);
        await logError(errorMsg, env);
        return false;
    }
}

function jaliMsg(price) {
    const tehranTime = getTehranDateTime();
    const gregorianDateStr = formatTehranTime(tehranTime, 'date');
    const timeStr = formatTehranTime(tehranTime).split(' ')[1];
    
    // Convert Gregorian to Solar (Persian) date
    const [year, month, day] = gregorianDateStr.split('-').map(Number);
    const solarDate = gregorianToSolar(year, month, day, 'array');
    
    // Persian month names
    const persianMonths = {
        1: 'فروردین',
        2: 'اردیبهشت',
        3: 'خرداد',
        4: 'تیر',
        5: 'مرداد',
        6: 'شهریور',
        7: 'مهر',
        8: 'آبان',
        9: 'آذر',
        10: 'دی',
        11: 'بهمن',
        12: 'اسفند'
    };
    
    const persianMonthName = persianMonths[solarDate[1]];
    const solarDateStr = `${solarDate[2]} ${persianMonthName} ${solarDate[0]}`;
    
    return `📆 ${solarDateStr} ⏰ ${timeStr} 🪙${price} . add by cloudflare worker`;
}

// Persian calendar conversion functions (simplified version for Cloudflare Worker)
function gregorianToSolar(year, month, day, formatType) {
    if (formatType === undefined) {
        formatType = "array";
    }
    
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
        return "Invalid Input";
    }
    
    let persianYear = year - 621;
    let persianMonth, persianDay;
    
    if (month < 3 || (month === 3 && day < 21)) {
        persianYear--;
    }
    
    if (month === 1) {
        if (day <= 20) {
            persianMonth = 10;
            persianDay = day + 10;
        } else {
            persianMonth = 11;
            persianDay = day - 20;
        }
    } else if (month === 2) {
        if (day <= 19) {
            persianMonth = 11;
            persianDay = day + 11;
        } else {
            persianMonth = 12;
            persianDay = day - 19;
        }
    } else if (month === 3) {
        if (day <= 20) {
            persianMonth = 12;
            persianDay = day + 9;
        } else {
            persianMonth = 1;
            persianDay = day - 20;
        }
    } else if (month === 4) {
        if (day <= 20) {
            persianMonth = 1;
            persianDay = day + 11;
        } else {
            persianMonth = 2;
            persianDay = day - 20;
        }
    } else if (month === 5) {
        if (day <= 21) {
            persianMonth = 2;
            persianDay = day + 10;
        } else {
            persianMonth = 3;
            persianDay = day - 21;
        }
    } else if (month === 6) {
        if (day <= 21) {
            persianMonth = 3;
            persianDay = day + 10;
        } else {
            persianMonth = 4;
            persianDay = day - 21;
        }
    } else if (month === 7) {
        if (day <= 22) {
            persianMonth = 4;
            persianDay = day + 9;
        } else {
            persianMonth = 5;
            persianDay = day - 22;
        }
    } else if (month === 8) {
        if (day <= 22) {
            persianMonth = 5;
            persianDay = day + 9;
        } else {
            persianMonth = 6;
            persianDay = day - 22;
        }
    } else if (month === 9) {
        if (day <= 22) {
            persianMonth = 6;
            persianDay = day + 9;
        } else {
            persianMonth = 7;
            persianDay = day - 22;
        }
    } else if (month === 10) {
        if (day <= 22) {
            persianMonth = 7;
            persianDay = day + 8;
        } else {
            persianMonth = 8;
            persianDay = day - 22;
        }
    } else if (month === 11) {
        if (day <= 21) {
            persianMonth = 8;
            persianDay = day + 9;
        } else {
            persianMonth = 9;
            persianDay = day - 21;
        }
    } else if (month === 12) {
        if (day <= 21) {
            persianMonth = 9;
            persianDay = day + 9;
        } else {
            persianMonth = 10;
            persianDay = day - 21;
        }
    }
    
    if (formatType === "array") {
        return [persianYear, persianMonth, persianDay];
    } else if (formatType === "string") {
        return persianYear + "-" + 
            (persianMonth <= 9 ? "0" + persianMonth : persianMonth) + "-" + 
            (persianDay <= 9 ? "0" + persianDay : persianDay);
    } else {
        return [persianYear, persianMonth, persianDay];
    }
}

async function processGoldData(env) {
    _log("Starting gold data processing");
    
    // Check if worker is paused
    if (env.WORKER_PAUSED === 'true') {
        const msg = "Worker is paused. Skipping data collection.";
        _log(msg);
        return { success: false, error: msg, paused: true };
    }
    
    if (!env.GITHUB_TOKEN) {
        const errorMsg = "GITHUB_TOKEN not found in environment variables";
        _log(errorMsg);
        await logError(errorMsg, env);
        return { success: false, error: errorMsg };
    }
    
    const goldData = await getGoldPrice();
    
    if (typeof goldData === 'string') {
        const errorMsg = `Failed to get gold price: ${goldData}`;
        _log(errorMsg);
        await logError(errorMsg, env);
        return { success: false, error: errorMsg };
    }
    
    _log(`Retrieved gold data: ${JSON.stringify(goldData)}`);
    
    const dateFromApi = goldData.date;
    const today = dateFromApi.split('T')[0];
    const filename = `${today}.csv`;
    
    const { content: existingContent, sha } = await getCsvFromGithub(filename, env);
    
    let csvContent;
    if (existingContent === null) {
        _log("Creating new CSV file with headers");
        csvContent = "price18,date\n";
    } else {
        csvContent = existingContent;
    }
    
    const newRow = `${goldData.price18},${goldData.date}\n`;
    csvContent += newRow;
    _log(`Adding new row: ${newRow.trim()}`);
    
    const success = await pushCsvToGithub(filename, csvContent, sha, env);
    
    if (success) {
        _log(`Successfully processed and pushed data for ${today}`);
        return { success: true, message: `Data processed for ${today}` };
    } else {
        const errorMsg = `Failed to push data to GitHub for ${today}`;
        _log(errorMsg);
        await logError(errorMsg, env);
        return { success: false, error: errorMsg };
    }
}

// Cloudflare Worker event handlers
export default {
    async fetch(request, env, ctx) {
        // Handle HTTP requests (for manual triggers)
        try {
            const result = await processGoldData(env);
            return new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: error.message 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    },
    
    async scheduled(event, env, ctx) {
        // Handle cron triggers (automatic execution)
        try {
            const result = await processGoldData(env);
            console.log('Scheduled execution result:', result);
        } catch (error) {
            console.error('Scheduled execution error:', error);
            await logError(`Scheduled execution error: ${error.message}`, env);
        }
    }
}; 