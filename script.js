/**
 * GoldPriceChart - A modern gold price chart visualization
 * Updated with improved debugging and axis handling
 */
class GoldPriceChart {
    constructor() {
        console.log('Initializing GoldPriceChart...');
        // DOM elements
        this.chartElement = document.getElementById('priceChart');
        this.currentPriceElement = document.getElementById('currentPrice');
        this.lastUpdateElement = document.getElementById('lastUpdate');
        this.progressBar = document.getElementById('updateProgress');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Configuration
        this.baseUrl = 'https://raw.githubusercontent.com/D3rhami/milli-gold-capture/master/database/';
        this.localUrl = 'database/';
        this.updateInterval = 60000; // 1 minute refresh
        this.hourlyInterval = 60; // 60 minutes (for x-axis step)
        
        // State
        this.chart = null;
        this.data = [];
        this.currentPeriod = '1d'; // Default period
        this.chartType = 'line';   // Default type
        this.isLoadingAdditionalData = false;
        this.todayDataLoaded = false;
        this.intervalId = null;
        this.progress = 0;
        
        console.log('Current settings:', {
            period: this.currentPeriod,
            chartType: this.chartType,
            updateInterval: this.updateInterval + 'ms'
        });
        
        // Initialize
        this.setupEventListeners();
        this.initChart();
        this.loadInitialData();
    }
    
    /**
     * Initialize the chart with empty data
     */
    initChart() {
        console.log('Initializing chart...');
        const ctx = this.chartElement.getContext('2d');
        
        // Register crosshair plugin
        Chart.register({
            id: 'crosshair',
            afterDraw: (chart) => this.drawCrosshair(chart)
        });

        this.chart = new Chart(ctx, {
            type: this.chartType,
            data: {
                labels: [],
                datasets: [{
                    label: 'قیمت طلا',
                    data: [],
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,  // Ensure points are visible
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: '#ffd700',
                    pointHoverBorderColor: '#333',
                    pointHoverBorderWidth: 2
                }]
            },
            options: this.getChartOptions()
        });
        
        console.log('Chart initialized');
    }
    
    /**
     * Get chart options based on current settings
     */
    getChartOptions() {
        return {
                responsive: true,
                maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
                plugins: {
                    tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                        titleFont: {
                        family: 'Vazirmatn',
                        size: 14
                        },
                        bodyFont: {
                        family: 'Vazirmatn',
                        size: 13
                    },
                    padding: 10,
                    borderColor: '#ffd700',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                            const item = context.raw;
                            if (!item) return '';
                            return `قیمت: ${this.formatPrice(item.price)} ریال`;
                            },
                        title: (tooltipItems) => {
                            const item = tooltipItems[0].raw;
                            if (!item) return '';
                            // Always show both time and date in tooltip
                            return `${item.time} - ${item.j_date}`;
                            }
                        }
                },
                legend: {
                    display: false
                    }
                },
                scales: {
                    x: {
                    ticks: {
                        font: {
                            family: 'Vazirmatn',
                            size: 11
                        },
                        maxRotation: 90,
                        minRotation: 90,
                        autoSkip: true,
                        maxTicksLimit: 15,
                        callback: (value, index, values) => {
                            const item = this.data[index];
                            if (!item) return '';
                            
                            // ALWAYS show time AND date for all periods
                            if (this.currentPeriod === '1h') {
                                return item.time;
                            } else if (this.currentPeriod === '1d') {
                                // For daily view, show time at every tick and date for some
                                return index % 3 === 0 ? 
                                    `${item.time}\n${item.j_date}` : 
                                    item.time;
                            } else {
                                // For longer periods, always show date and time
                                return `${item.time}\n${item.j_date}`;
                            }
                        }
                    },
                        grid: {
                        display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                    }
                        },
                y: {
                    beginAtZero: false,
                    ticks: {
                            font: {
                            family: 'Vazirmatn',
                            size: 11
                            },
                            callback: (value) => this.formatPrice(value)
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            parsing: {
                xAxisKey: 'timestamp',
                yAxisKey: 'price'
                    }
        };
    }
    
    /**
     * Draw crosshair on hover
     */
    drawCrosshair(chart) {
        if (!chart.tooltip._active || !chart.tooltip._active.length) return;

        const activePoint = chart.tooltip._active[0];
        const { ctx } = chart;
        const { x, y } = activePoint.element;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        const leftX = chart.scales.x.left;
        const rightX = chart.scales.x.right;

        // Save state
        ctx.save();

        // Set styles
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.setLineDash([5, 5]);
        
        // Draw vertical line
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.stroke();

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
        ctx.stroke();

        // Restore state
        ctx.restore();
    }
    
    /**
     * Normalize and de-duplicate data based on timestamps
     */
    normalizeData(data) {
        // Create a map to store unique timestamp keys
        const uniqueMap = new Map();
        
        data.forEach(item => {
            // Round date to nearest minute by removing seconds and milliseconds
            const date = new Date(item.date);
            date.setSeconds(0, 0);
            
            // Create a unique timestamp key
            const timeKey = date.getTime();
            
            // Only keep the latest data point for each minute
            if (!uniqueMap.has(timeKey) || date > uniqueMap.get(timeKey).date) {
                // Create a normalized item with the rounded date
                const normalizedItem = {
                    ...item,
                    date: date,
                    timestamp: timeKey, // Add timestamp for Chart.js parsing
                    // Ensure time format doesn't have seconds
                    time: date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                };
                uniqueMap.set(timeKey, normalizedItem);
            }
        });
        
        // Convert the map values back to an array and sort by timestamp
        const normalizedData = Array.from(uniqueMap.values())
            .sort((a, b) => a.date - b.date);
        
        console.log(`Normalized data from ${data.length} to ${normalizedData.length} points`);
        return normalizedData;
    }
    
    /**
     * Load today's data immediately, then load additional data based on period
     */
    async loadInitialData() {
        console.log('Starting initial data load...');
        this.showLoading(true);
        
        try {
            // Get current date for "today"
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            console.log(`Attempting to load today's data (${todayStr})`);
            
            // Try local first, then remote
            console.log('Trying local path first:', `${this.localUrl}${todayStr}.csv`);
            let todayData = await this.fetchCSVData(`${this.localUrl}${todayStr}.csv`);
            
            if (!todayData.length) {
                console.log('No local data, trying remote path:', `${this.baseUrl}${todayStr}.csv`);
                todayData = await this.fetchCSVData(`${this.baseUrl}${todayStr}.csv`);
            }
            
            // If we can't get today's data, try a hardcoded specific date from the assignment
            if (!todayData.length) {
                const fallbackDate = '2025-06-05';
                console.log(`No data found for today, trying fallback date (${fallbackDate})`);
                
                console.log('Trying local fallback:', `${this.localUrl}${fallbackDate}.csv`);
                todayData = await this.fetchCSVData(`${this.localUrl}${fallbackDate}.csv`);
                
                if (!todayData.length) {
                    console.log('Trying remote fallback:', `${this.baseUrl}${fallbackDate}.csv`);
                    todayData = await this.fetchCSVData(`${this.baseUrl}${fallbackDate}.csv`);
                }
            }
            
            if (todayData.length > 0) {
                console.log(`Successfully loaded data: ${todayData.length} records`);
                console.log('First record:', todayData[0]);
                console.log('Last record:', todayData[todayData.length - 1]);
                
                // Normalize and deduplicate data
                todayData = this.normalizeData(todayData);
                
                // Update the chart with today's data immediately
                this.data = todayData;
                this.updateChart();
                this.todayDataLoaded = true;
                
                // Then load additional data based on period
                this.loadAdditionalData();
            } else {
                console.error("Could not load any data from any source");
                this.showNoDataMessage();
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
            this.showNoDataMessage();
        }
        
        this.startDataRefreshCycle();
    }
    
    /**
     * Load additional data based on the current period
     */
    async loadAdditionalData() {
        if (this.isLoadingAdditionalData) {
            console.log('Already loading additional data, skipping...');
            return;
        }
        
        console.log(`Loading additional data for period: ${this.currentPeriod}`);
        this.isLoadingAdditionalData = true;
        
        const today = new Date();
        let daysToLoad = 0;
        
        switch (this.currentPeriod) {
            case '1h': daysToLoad = 1; break; // Just today
            case '1d': daysToLoad = 2; break; // Today plus yesterday for overnight
            case '7d': daysToLoad = 7; break;
            case '1m': daysToLoad = 30; break;
            case '1y': daysToLoad = 365; break;
        }
        
        console.log(`Need to load ${daysToLoad} days of data`);
        
        if (daysToLoad > 1) {
            try {
                const promises = [];
                for (let i = 1; i < daysToLoad; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    console.log(`Queuing data fetch for: ${dateStr}`);
                    
                    // Try local first, then remote
                    promises.push(this.fetchCSVData(`${this.localUrl}${dateStr}.csv`)
                        .then(data => {
                            if (!data.length) {
                                console.log(`No local data for ${dateStr}, trying remote`);
                                return this.fetchCSVData(`${this.baseUrl}${dateStr}.csv`);
                            }
                            console.log(`Found local data for ${dateStr}: ${data.length} records`);
                            return data;
                        }));
                }
                
                console.log('Waiting for all data promises to resolve...');
                const results = await Promise.all(promises);
                let additionalData = results.flat();
                
                console.log(`Loaded ${additionalData.length} additional records`);
                
                // Normalize and deduplicate the additional data
                additionalData = this.normalizeData(additionalData);
                
                // Combine with existing data
                if (additionalData.length > 0) {
                    // Merge all data and then normalize to remove duplicates between files
                    const allData = [...this.data, ...additionalData];
                    this.data = this.normalizeData(allData);
                    
                    console.log(`Total dataset now contains ${this.data.length} records`);
                    this.updateChart();
                }
            } catch (error) {
                console.error("Error loading additional data:", error);
            }
        }
        
        this.isLoadingAdditionalData = false;
        this.showLoading(false);
    }
    
    /**
     * Fetch CSV data and parse it
     */
    async fetchCSVData(url) {
        console.log(`Fetching data from: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.log(`HTTP error ${response.status} for ${url}`);
                return [];
            }
            
            const text = await response.text();
            const lines = text.split('\n');
            
            console.log(`Received CSV with ${lines.length} lines (including header)`);
            
            if (lines.length < 2) {
                console.log('CSV is empty or has only header row');
                return [];
            }
            
            // Get header line (first row)
            const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, ''));
            console.log('CSV headers:', headers);
            
            // Get indices of the columns we need
            const dateIndex = headers.findIndex(h => h === 'date');
            const priceIndex = headers.findIndex(h => h === 'price18');
            const jDateIndex = headers.findIndex(h => h === 'j_date' || h === 'j_date\r');
            
            console.log('Column indices:', { dateIndex, priceIndex, jDateIndex });
            
            if (dateIndex === -1 || priceIndex === -1) {
                console.error("CSV missing required columns");
                return [];
            }
            
            const parsedData = lines.slice(1) // Skip header
                .filter(line => line.trim())
                .map(line => {
                    const values = line.split(',');
                    if (values.length <= Math.max(dateIndex, priceIndex, jDateIndex)) {
                        return null; // Skip malformed lines
                    }
                    
                    const dateStr = values[dateIndex];
                    const price = parseInt(values[priceIndex]);
                    const jDate = jDateIndex !== -1 ? values[jDateIndex].trim().replace(/\r$/, '') : '';
                    
                    const dateObj = new Date(dateStr);
        
                    if (isNaN(dateObj.getTime()) || isNaN(price)) {
                        return null; // Skip invalid dates or prices
                    }
                    
                    return {
                        date: dateObj,
                        price: price,
                        j_date: jDate,
                        time: dateObj.toLocaleTimeString('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        timestamp: dateObj.getTime() // Add timestamp for easier handling
                    };
                })
                .filter(item => item !== null); // Remove any invalid items
            
            console.log(`Successfully parsed ${parsedData.length} records`);
            if (parsedData.length > 0) {
                console.log('Sample record:', parsedData[0]);
            }
            
            return parsedData;
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            return [];
        }
    }
    
    /**
     * Update chart with filtered data based on current period
     */
    updateChart() {
        console.log(`Updating chart for period: ${this.currentPeriod}`);
        
        if (!this.data.length) {
            console.warn('No data available to update chart');
            return;
    }

        console.log(`Full dataset has ${this.data.length} records`);
        
        // Filter data based on current period
        let filteredData = [];
        const now = new Date();

        switch (this.currentPeriod) {
            case '1h':
                console.log('Filtering data for 1h view');
                const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                filteredData = this.data.filter(d => d.date >= hourAgo);
                break;
            case '1d':
                console.log('Filtering data for 1d view');
                const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                filteredData = this.data.filter(d => d.date >= dayAgo);
                break;
            case '7d':
                console.log('Filtering data for 7d view');
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filteredData = this.data.filter(d => d.date >= weekAgo);
                break;
            case '1m':
                console.log('Filtering data for 1m view');
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filteredData = this.data.filter(d => d.date >= monthAgo);
                break;
            case '1y':
                console.log('Filtering data for 1y view');
                const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                filteredData = this.data.filter(d => d.date >= yearAgo);
                break;
        }
        
        console.log(`Filtered to ${filteredData.length} records for ${this.currentPeriod}`);
        
        if (filteredData.length === 0) {
            console.warn('No data available after filtering');
            return;
        }
        
        // Apply appropriate step to data based on period
        const sampleStep = this.getSampleStepForPeriod(this.currentPeriod, filteredData.length);
        console.log(`Using sample step of ${sampleStep} for display`);
        
        const sampledData = this.sampleDataWithStep(filteredData, sampleStep);
        console.log(`Sampled to ${sampledData.length} points for display`);
        
        // Log time range
        if (sampledData.length > 0) {
            const firstDate = sampledData[0].date;
            const lastDate = sampledData[sampledData.length - 1].date;
            console.log('Time range:', {
                start: firstDate.toISOString(),
                end: lastDate.toISOString(),
                durationHours: (lastDate - firstDate) / (1000 * 60 * 60)
            });
        }
        
        // Update chart
        console.log('Updating chart with new data');
        
        // Important: In Chart.js, we need to pass the data directly to the dataset,
        // NOT as labels and separate data arrays
        this.chart.data.labels = sampledData.map((_, i) => i); // Use indices as labels
        this.chart.data.datasets[0].data = sampledData;
        
        // Update current price
        if (filteredData.length > 0) {
            const latestPrice = filteredData[filteredData.length - 1].price;
            this.currentPriceElement.textContent = this.formatPrice(latestPrice);
            console.log(`Updated current price: ${latestPrice}`);
            
            // Update last update time
            const now = new Date();
            this.lastUpdateElement.textContent = now.toLocaleTimeString('fa-IR');
            console.log('Updated last update timestamp');
        }
        
        // Adjust chart options for better display
        this.chart.options = this.getChartOptions();
        
        console.log('Calling chart.update()');
        this.chart.update();
        console.log('Chart updated successfully');
    }
    
    /**
     * Calculate step size based on period and data amount
     */
    getSampleStepForPeriod(period, dataLength) {
        // Define appropriate step sizes for each period to match requirement
        const stepSizes = {
            '1h': 1,     // Show every minute for 1h view
            '1d': 60,    // Show hourly steps for 1d view (60 minutes)
            '7d': 240,   // Show 4-hour steps for 7d view (4 hours = 240 minutes)
            '1m': 720,   // Show 12-hour steps for 1m view (12 hours = 720 minutes)
            '1y': 1440   // Show daily steps for 1y view (1 day = 1440 minutes)
        };
        
        const baseStep = stepSizes[period] || 60;
        
        // Calculate average interval in minutes between data points
        if (dataLength <= 1) return 1;
        
        const firstPoint = this.data[0];
        const lastPoint = this.data[this.data.length - 1];
        const totalMinutes = (lastPoint.date - firstPoint.date) / (1000 * 60);
        const avgIntervalMinutes = totalMinutes / (this.data.length - 1);
        
        console.log(`Average interval between points: ${avgIntervalMinutes.toFixed(2)} minutes`);
        
        // Calculate step size based on desired interval and actual data interval
        const step = Math.max(1, Math.round(baseStep / avgIntervalMinutes));
        console.log(`Using step size of ${step} data points to achieve ~${baseStep} minute intervals`);
        
        return step;
    }
    
    /**
     * Sample data at regular intervals
     */
    sampleDataWithStep(data, step) {
        if (step <= 1) return data;

        const sampled = [];
        for (let i = 0; i < data.length; i += step) {
            sampled.push(data[i]);
        }

        // Always include the last point
        if (data.length > 0 && sampled[sampled.length - 1] !== data[data.length - 1]) {
            sampled.push(data[data.length - 1]);
        }

        return sampled;
    }

    /**
     * Format price with Persian digits
     */
    formatPrice(price) {
        if (typeof price !== 'number') {
            console.warn('Invalid price format:', price);
            return '0';
        }
        return new Intl.NumberFormat('fa-IR').format(price);
    }
    
    /**
     * Show or hide loading overlay
     */
    showLoading(show) {
        console.log(`${show ? 'Showing' : 'Hiding'} loading overlay`);
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
            }
    }
    
    /**
     * Show message when no data is available
     */
    showNoDataMessage() {
        console.warn('No data available, showing error message');
        this.showLoading(false);
        this.currentPriceElement.textContent = 'داده‌ای یافت نشد';
        this.lastUpdateElement.textContent = '-';
            }
    
    /**
     * Start progress bar animation for data refresh cycle
     */
    startProgressBar() {
        console.log('Starting progress bar animation');
        
        // Clear any existing interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        this.progress = 0;
        const increment = 100 / (this.updateInterval / 100); // Update every 100ms
        
        this.intervalId = setInterval(() => {
            this.progress = Math.min(100, this.progress + increment);
            this.progressBar.style.width = `${this.progress}%`;

            if (this.progress >= 100) {
                console.log('Progress bar complete');
                clearInterval(this.intervalId);
            }
        }, 100);
    }
    
    /**
     * Start the data refresh cycle
     */
    startDataRefreshCycle() {
        console.log('Starting data refresh cycle');
        
        // Update immediately
        this.startProgressBar();
        
        // Setup interval for periodic updates
        setInterval(() => {
            console.log('Refresh cycle triggered');
            this.loadInitialData();
            this.startProgressBar();
        }, this.updateInterval);
        
        console.log(`Data will refresh every ${this.updateInterval / 1000} seconds`);
        }

    /**
     * Setup event listeners for buttons
     */
    setupEventListeners() {
        console.log('Setting up event listeners');

        // Period buttons
        document.querySelectorAll('[data-period]').forEach(button => {
            button.addEventListener('click', (e) => {
                const newPeriod = e.target.dataset.period;
                console.log(`Period button clicked: ${newPeriod}`);
                
                document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentPeriod = newPeriod;
                if (this.todayDataLoaded) {
                    this.showLoading(true);
                    console.log(`Switching to ${newPeriod} period view`);

                    // Allow UI to update before processing
                    setTimeout(() => {
                        this.loadAdditionalData();
                        this.updateChart();
                    }, 50);
                }
            });
        });

        // Chart type toggle
        document.querySelectorAll('[data-type]').forEach(button => {
            button.addEventListener('click', (e) => {
                const parentButton = e.target.closest('.btn');
                const newType = parentButton.dataset.type;
                console.log(`Chart type button clicked: ${newType}`);
                
                document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
                parentButton.classList.add('active');
                
                this.chartType = newType;
                
                // Update chart type
                console.log(`Switching chart type to: ${newType}`);
                this.chart.config.type = this.chartType;
                this.chart.update();
            });
        });
        
        console.log('Event listeners setup complete');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing chart application...');
    new GoldPriceChart();
}); 