// Initialize farvardin library
const farvardin = window.farvardin;

// Custom function to safely convert dates using farvardin
function convertToSolarDate(date) {
    try {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        
        // Check if date is valid before conversion
        if (isNaN(d.getTime()) || year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
            return null; // Return null for invalid dates
        }
        
        // Directly use the farvardin library without any year adjustment
        try {
            const result = farvardin.gregorianToSolar(year, month, day, "object");
            if (typeof result === 'string' && result === 'Invalid Input') {
                return null; // Return null if conversion fails
            }
            return result;
        } catch (e) {
            console.error('Farvardin conversion error:', e);
            return null;
        }
    } catch (error) {
        console.error('Error converting date:', error);
        return null;
    }
}

class GoldPriceTracker {
    constructor() {
        this.chart = null;
        this.rawData = [];
        this.currentPeriod = '1d';
        this.baseUrl = 'https://raw.githubusercontent.com/D3rhami/milli-gold-capture/master/database/';
        this.availableDates = [];
        this.lastDataTimestamp = null;
        this.isLoading = false;
        this.progressInterval = null;
        this.currentZoomLevel = 1; // Track zoom level
        this.savedChartData = null; // Store data for zoom reset
        
        // Default step sizes in minutes for each period
        this.defaultStepSizes = {
            '1d': 60,     // 1 hour for daily view
            '5d': 120,    // 2 hours for 5-day view
            '1w': 240,    // 4 hours for weekly view
            '1m': 720,    // 12 hours for monthly view
            '3m': 1440,   // 1 day for 3-month view
            '6m': 2880,   // 2 days for 6-month view
            '1y': 10080,  // 1 week for yearly view
            'all': 43200  // 30 days for all data
        };
        
        // Minimum step size is 1 minute
        this.minStepInMinutes = 1;

        this.initChart();
        this.setupEventListeners();
        this.loadData();
        this.startDataRefreshCycle();
        
        // Log a simple test of the date conversion functionality
        this.testDateConversion();
    }
    
    // Test function to verify date conversion
    testDateConversion() {
        console.log("Testing date conversion:");
        const testDates = [
            new Date(2023, 0, 1),   // Jan 1, 2023
            new Date(2023, 2, 21),  // Mar 21, 2023 (Nowruz)
            new Date(2023, 5, 15),  // Jun 15, 2023
            new Date(2023, 8, 22),  // Sep 22, 2023
            new Date(2023, 11, 31), // Dec 31, 2023
            new Date(2025, 5, 4)    // Jun 4, 2025 (test data date)
        ];
        
        testDates.forEach(date => {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const solarDate = farvardin.gregorianToSolar(year, month, day, "object");
            console.log(`Gregorian: ${date.toDateString()} -> Solar: ${solarDate.year}/${solarDate.month}/${solarDate.day}`);
        });
        
        // Test the actual test data date
        console.log("Test data date conversion:");
        console.log(farvardin.gregorianToSolar(2025, 6, 4, "object"));
    }

    startDataRefreshCycle() {
        // Update data every minute
        setInterval(() => {
            if (!this.isLoading) {
                this.startProgressBar();
                this.loadData();
            }
        }, 60000);
    }

    startProgressBar() {
        const progressBar = document.getElementById('progressBar');
        let progress = 0;
        
        // Clear any existing interval
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        // Update progress every second (60 steps for one minute)
        this.progressInterval = setInterval(() => {
            progress += (100 / 60);
            if (progress > 100) {
                progress = 100;
                clearInterval(this.progressInterval);
            }
            progressBar.style.width = `${progress}%`;
        }, 1000);
    }

    resetProgressBar() {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = '0%';
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
    }

    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log('Site is currently updating...');
        
        try {
            // Define the date range to check for files
            const endDate = new Date('2025-06-03');
            const startDate = new Date(endDate);
            
            // For 1-day view, load last 2 days; for longer periods, load more days
            let daysToLoad = 2;
            if (this.currentPeriod === '5d') daysToLoad = 5;
            else if (this.currentPeriod === '1w') daysToLoad = 7;
            else if (this.currentPeriod === '1m') daysToLoad = 30;
            else if (this.currentPeriod === '3m') daysToLoad = 90;
            else if (this.currentPeriod === '6m') daysToLoad = 180;
            else if (this.currentPeriod === '1y') daysToLoad = 365;
            else if (this.currentPeriod === 'all') daysToLoad = 500;  // Just load everything
            
            startDate.setDate(endDate.getDate() - daysToLoad);
            
            // Create an array of dates to check for files
            const datesToCheck = [];
            const currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
                const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
                datesToCheck.push(formattedDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Sort to ensure we load newest data first
            datesToCheck.sort().reverse();
            
            let allData = [];
            this.availableDates = [];
            
            // Try to load data for each date
            for (const dateStr of datesToCheck) {
                const filePath = `database/${dateStr}.csv`;
                
                try {
                    const data = await this.loadLocalCSVData(filePath);
                    if (data && data.length > 0) {
                        allData = allData.concat(data);
                        this.availableDates.push(dateStr);
                        console.log(`Loaded data from ${filePath}: ${data.length} records`);
                        
                        // If we've loaded enough data, stop loading more files
                        if (allData.length > 10000 && this.currentPeriod !== 'all') {
                            console.log(`Loaded ${allData.length} records, stopping to prevent performance issues`);
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`Could not load local file: ${filePath}`);
                    
                    // Try remote file as fallback
                    try {
                        const remoteFile = filePath.split('/').pop();
                        const data = await this.loadCSVData(remoteFile);
                        if (data && data.length > 0) {
                            allData = allData.concat(data);
                            this.availableDates.push(dateStr);
                            console.log(`Loaded remote data for ${remoteFile}: ${data.length} records`);
                        }
                    } catch (remoteError) {
                        console.log(`No data available remotely for ${filePath}`);
                    }
                }
            }

            if (allData.length > 0) {
                // Sort data by timestamp
                this.rawData = allData.sort((a, b) => new Date(a.date) - new Date(b.date));
                this.lastDataTimestamp = this.rawData[this.rawData.length - 1].date;
                this.updatePriceInfo();
                this.updateChart();
                this.updateLastUpdate();
                console.log(`Total data loaded: ${this.rawData.length} records`);
            } else {
                this.showNoDataMessage();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showErrorMessage();
        } finally {
            this.isLoading = false;
            this.resetProgressBar();
        }
    }

    async loadLocalCSVData(filePath) {
        return new Promise((resolve, reject) => {
            fetch(filePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(csvText => {
                    Papa.parse(csvText, {
                        header: true,
                        dynamicTyping: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            if (results.data && results.data.length > 0) {
                                const processedData = results.data
                                    .filter(row => row.price18 && row.date)
                                    .map(row => ({
                                        price: parseInt(row.price18),
                                        date: new Date(row.date)
                                    }))
                                    .filter(row => !isNaN(row.price) && row.date instanceof Date && !isNaN(row.date.getTime()));

                                resolve(processedData);
                            } else {
                                reject('No valid data');
                            }
                        },
                        error: (error) => {
                            reject(error);
                        }
                    });
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    async loadCSVData(dateStr) {
        const url = `${this.baseUrl}${dateStr}.csv`;

        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        const processedData = results.data
                            .filter(row => row.price18 && row.date)
                            .map(row => ({
                                price: parseInt(row.price18),
                                date: new Date(row.date)
                            }))
                            .filter(row => !isNaN(row.price) && row.date instanceof Date && !isNaN(row.date.getTime()));

                        resolve(processedData);
                    } else {
                        reject('No valid data');
                    }
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    updatePriceInfo() {
        if (this.rawData.length === 0) return;

        const latest = this.rawData[this.rawData.length - 1];
        const filteredData = this.filterDataByPeriod(this.rawData, this.currentPeriod);

        if (filteredData.length === 0) return;

        const oldest = filteredData[0];
        const currentPrice = latest.price;
        const priceChange = currentPrice - oldest.price;
        const percentChange = ((priceChange / oldest.price) * 100);

        const today = new Date().toDateString();
        const todayData = this.rawData.filter(d => d.date.toDateString() === today);

        const highPrice = todayData.length > 0 ? Math.max(...todayData.map(d => d.price)) : currentPrice;
        const lowPrice = todayData.length > 0 ? Math.min(...todayData.map(d => d.price)) : currentPrice;
        const openPrice = todayData.length > 0 ? todayData[0].price : currentPrice;

        document.getElementById('currentPrice').textContent = this.formatPrice(currentPrice);
        document.getElementById('highPrice').textContent = this.formatPrice(highPrice);
        document.getElementById('lowPrice').textContent = this.formatPrice(lowPrice);
        document.getElementById('openPrice').textContent = this.formatPrice(openPrice);

        const changeElement = document.getElementById('priceChange');
        const changeText = `${priceChange >= 0 ? '+' : ''}${this.formatPrice(priceChange)} (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)`;
        changeElement.textContent = changeText;
        changeElement.className = `price-change ${priceChange >= 0 ? 'positive' : 'negative'}`;
    }

    formatDateByPeriod(date, period) {
        try {
            const gregorianDate = new Date(date);
            const hours = gregorianDate.getHours().toString().padStart(2, '0');
            const minutes = gregorianDate.getMinutes().toString().padStart(2, '0');
            
            // Get year, month, day
            const year = gregorianDate.getFullYear();
            const month = gregorianDate.getMonth() + 1;
            const day = gregorianDate.getDate();
            
            // Directly convert to Solar date using farvardin
            try {
                const solarDate = farvardin.gregorianToSolar(year, month, day, "object");
                const solarDateStr = `${solarDate.year}/${String(solarDate.month).padStart(2, '0')}/${String(solarDate.day).padStart(2, '0')}`;
                return `${hours}:${minutes} - ${solarDateStr}`;
            } catch (e) {
                // If solar conversion fails, just return the time
                return `${hours}:${minutes}`;
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }

    formatAxisDate(date, period) {
        try {
            if (period === '1d') {
                return this.formatTimeOnly(date);
            } else {
                return this.formatDateForAxis(date);
            }
        } catch (error) {
            console.error('Error formatting axis date:', error);
            return '';
        }
    }

    initChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');

        // Create a custom plugin for crosshair
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart, args, options) => {
                if (!chart.tooltip._active || chart.tooltip._active.length === 0) return;
                
                const activePoint = chart.tooltip._active[0];
                const { ctx } = chart;
                const { x, y } = activePoint.element;
                const alpha = 0.3; // 30% opacity
                
                // Save context
                ctx.save();
                
                // Draw vertical line
                ctx.beginPath();
                ctx.moveTo(x, chart.chartArea.top);
                ctx.lineTo(x, chart.chartArea.bottom);
                ctx.lineWidth = 1;
                ctx.strokeStyle = `rgba(150, 150, 150, ${alpha})`;
                ctx.setLineDash([5, 5]); // Dotted line
                ctx.stroke();
                
                // Draw horizontal line
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left, y);
                ctx.lineTo(chart.chartArea.right, y);
                ctx.stroke();
                
                // Restore context
                ctx.restore();
            }
        };

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'قیمت طلا (ریال)',
                    data: [],
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#FFD700',
                    pointHoverBorderColor: '#333'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'nearest',
                        intersect: false,
                        padding: 15,
                        titleFont: {
                            size: 16,
                            family: 'Vazir',
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 14,
                            family: 'Vazir'
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#FFD700',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                return `قیمت: ${this.formatPrice(context.parsed.y)}`;
                            },
                            title: (context) => {
                                if (!context || !context[0] || !context[0].raw) {
                                    return 'No date available';
                                }
                                
                                try {
                                    const rawDate = context[0].raw.date;
                                    if (rawDate) {
                                        // Always show both date and time in tooltip
                                        return this.formatFullDateTimeForTooltip(rawDate);
                                    }
                                    return 'Unknown date';
                                } catch (error) {
                                    console.error('Error formatting tooltip title:', error);
                                    return 'Error displaying date';
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            color: '#666',
                            font: {
                                family: 'Vazir',
                                size: 12
                            },
                            autoSkip: true,
                            maxTicksLimit: 15
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                family: 'Vazir',
                                size: 12
                            },
                            callback: (value) => this.formatPrice(value)
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverRadius: 6
                    }
                }
            },
            plugins: [crosshairPlugin]
        });
    }

    updateChart() {
        if (!this.rawData.length) return;

        const filteredData = this.filterDataByPeriod(this.rawData, this.currentPeriod);
        
        // Get the default step size for the current period (in minutes)
        const defaultStepSizeInMinutes = this.defaultStepSizes[this.currentPeriod] || 60;
        
        // Calculate the step based on the average interval and desired step size
        const avgIntervalInMinutes = this.calculateAverageTimeInterval();
        const step = Math.max(1, Math.round(defaultStepSizeInMinutes / avgIntervalInMinutes));
        
        // Sample data based on the calculated step
        const chartData = this.sampleData(filteredData, step);

        // Reset zoom level when changing periods
        this.currentZoomLevel = 1;
        this.savedChartData = null;

        // Find highest and lowest prices and their indices
        const prices = chartData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minIndex = prices.indexOf(minPrice);
        const maxIndex = prices.indexOf(maxPrice);

        // Create labels for display and data points for the chart
        const labels = [];
        const dataPoints = [];

        // Process chart data to ensure separation of points
        chartData.forEach((item, index) => {
            // Convert date for display
            const dateObj = new Date(item.date);
            let displayFormat;
            
            // Format based on period
            if (this.currentPeriod === '1d') {
                displayFormat = this.formatTimeOnly(dateObj);
            } else {
                displayFormat = this.formatDateForAxis(dateObj);
            }
            
            // Set point style based on whether it's a min/max point
            let pointStyle = null;
            let pointRadius = 0;
            let pointBackgroundColor = null;
            
            if (index === minIndex) {
                pointStyle = 'circle';
                pointRadius = 5;
                pointBackgroundColor = 'rgba(255, 0, 0, 0.8)';
            } else if (index === maxIndex) {
                pointStyle = 'circle';
                pointRadius = 5;
                pointBackgroundColor = 'rgba(0, 255, 0, 0.8)';
            }
            
            // Add label and data point
            labels.push(displayFormat);
            dataPoints.push({
                x: index,
                y: item.price,
                date: item.date,
                pointStyle: pointStyle,
                pointRadius: pointRadius,
                pointBackgroundColor: pointBackgroundColor
            });
        });

        // Update chart data
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = dataPoints;

        // Calculate padding for Y axis
        const padding = (maxPrice - minPrice) * 0.1; // 10% padding
        
        // Update Y axis to ensure data stays in view
        this.chart.options.scales.y.min = minPrice - padding;
        this.chart.options.scales.y.max = maxPrice + padding;

        // Save the original chart data for zoom reset
        this.savedChartData = {
            data: JSON.parse(JSON.stringify(this.chart.data)),
            options: JSON.parse(JSON.stringify(this.chart.options))
        };

        // Update the chart
        this.chart.update();
    }

    filterDataByPeriod(data, period) {
        if (!data.length) return [];

        const latestDataTime = this.lastDataTimestamp || new Date();
        let startDate;

        switch (period) {
            case '1d':
                startDate = new Date(latestDataTime.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '5d':
                startDate = new Date(latestDataTime.getTime() - 5 * 24 * 60 * 60 * 1000);
                break;
            case '1w':
                startDate = new Date(latestDataTime.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '1m':
                startDate = new Date(latestDataTime.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '3m':
                startDate = new Date(latestDataTime.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '6m':
                startDate = new Date(latestDataTime.getTime() - 180 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(latestDataTime.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                return data;
        }

        const filteredData = data.filter(d => d.date >= startDate && d.date <= latestDataTime);
        
        // If we don't have enough data for the selected period, return empty array
        const periodInDays = (latestDataTime - startDate) / (24 * 60 * 60 * 1000);
        const dataSpanInDays = (filteredData.length > 0) ? 
            (filteredData[filteredData.length - 1].date - filteredData[0].date) / (24 * 60 * 60 * 1000) : 0;
        
        if (dataSpanInDays < periodInDays * 0.5) { // If we have less than 50% of the requested period
            return [];
        }

        return filteredData;
    }

    calculateStep(dataLength, period) {
        let baseStep;

        switch (period) {
            case '1d':
                baseStep = Math.max(1, Math.ceil(dataLength / 96));
                break;
            case '5d':
                baseStep = Math.max(1, Math.ceil(dataLength / 240));
                break;
            case '1w':
                baseStep = Math.max(1, Math.ceil(dataLength / 336));
                break;
            case '1m':
                baseStep = Math.max(1, Math.ceil(dataLength / 720));
                break;
            case '3m':
                baseStep = Math.max(1, Math.ceil(dataLength / 1080));
                break;
            case '6m':
                baseStep = Math.max(1, Math.ceil(dataLength / 1440));
                break;
            case '1y':
                baseStep = Math.max(1, Math.ceil(dataLength / 2000));
                break;
            default:
                baseStep = Math.max(1, Math.ceil(dataLength / 1000));
        }

        return baseStep;
    }

    sampleData(data, step) {
        if (step <= 1) return data;

        const sampled = [];
        for (let i = 0; i < data.length; i += step) {
            sampled.push(data[i]);
        }

        if (data.length > 0 && sampled[sampled.length - 1] !== data[data.length - 1]) {
            sampled.push(data[data.length - 1]);
        }

        return sampled;
    }

    setupEventListeners() {
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.updatePriceInfo();
                this.updateChart();
            });
        });

        const canvas = document.getElementById('priceChart');
        let isZooming = false;

        canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.handleZoom(e.deltaY > 0 ? 'out' : 'in');
            }
        });

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isZooming = true;
                e.preventDefault();
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (isZooming && e.touches.length === 2) {
                e.preventDefault();
            }
        });

        canvas.addEventListener('touchend', (e) => {
            if (isZooming) {
                isZooming = false;
                e.preventDefault();
            }
        });
    }

    handleZoom(direction) {
        const filteredData = this.filterDataByPeriod(this.rawData, this.currentPeriod);
        
        // Store original data if not already saved
        if (!this.savedChartData && direction === 'in') {
            this.savedChartData = {
                data: JSON.parse(JSON.stringify(this.chart.data)),
                options: JSON.parse(JSON.stringify(this.chart.options))
            };
        }
        
        if (direction === 'in') {
            this.currentZoomLevel = Math.min(4, this.currentZoomLevel + 1);
        } else {
            this.currentZoomLevel = Math.max(1, this.currentZoomLevel - 1);
            
            // Reset to original data if fully zoomed out
            if (this.currentZoomLevel === 1 && this.savedChartData) {
                this.chart.data = JSON.parse(JSON.stringify(this.savedChartData.data));
                this.chart.options = JSON.parse(JSON.stringify(this.savedChartData.options));
                this.chart.update();
                return;
            }
        }

        // Define step size in minutes based on zoom level
        let stepSizeInMinutes;
        
        switch(this.currentZoomLevel) {
            case 1: 
                // Default view - use period default (e.g., 1 hour for 1d)
                stepSizeInMinutes = this.defaultStepSizes[this.currentPeriod] || 60;
                break;
            case 2: 
                // 30 minute intervals
                stepSizeInMinutes = 30;
                break;
            case 3: 
                // 5 minute intervals
                stepSizeInMinutes = 5;
                break;
            case 4: 
                // 1 minute intervals (minimum)
                stepSizeInMinutes = 1;
                break;
            default: 
                stepSizeInMinutes = this.defaultStepSizes[this.currentPeriod] || 60;
        }
        
        // Calculate the number of data points to skip
        const avgIntervalInMinutes = this.calculateAverageTimeInterval();
        const step = Math.max(1, Math.round(stepSizeInMinutes / avgIntervalInMinutes));
        
        // Sample data with new step size
        const chartData = this.sampleData(filteredData, step);
        
        // Find highest and lowest prices and their indices
        const prices = chartData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minIndex = prices.indexOf(minPrice);
        const maxIndex = prices.indexOf(maxPrice);
        
        // Create labels and data points
        const labels = [];
        const dataPoints = [];
        
        // Process chart data
        chartData.forEach((item, index) => {
            const dateObj = new Date(item.date);
            let displayFormat;
            
            // Format label based on zoom level and period
            if (this.currentZoomLevel >= 3) {
                // Higher zoom levels - show time with minutes for all periods
                displayFormat = this.formatTimeWithMinutes(dateObj);
            } else if (this.currentZoomLevel === 2) {
                // Medium zoom - for 1d show time, for others show abbreviated date and time
                if (this.currentPeriod === '1d') {
                    displayFormat = this.formatTimeWithMinutes(dateObj);
                } else {
                    displayFormat = this.formatDateTimeForAxis(dateObj);
                }
            } else {
                // Default zoom - for 1d show hours only, for others show date
                if (this.currentPeriod === '1d') {
                    displayFormat = this.formatTimeOnly(dateObj);
                } else {
                    displayFormat = this.formatDateForAxis(dateObj);
                }
            }
            
            labels.push(displayFormat);
            
            // Set point style based on whether it's a min/max point
            let pointStyle = null;
            let pointRadius = 0;
            let pointBackgroundColor = null;
            
            if (index === minIndex) {
                pointStyle = 'circle';
                pointRadius = 5;
                pointBackgroundColor = 'rgba(255, 0, 0, 0.8)';
            } else if (index === maxIndex) {
                pointStyle = 'circle';
                pointRadius = 5;
                pointBackgroundColor = 'rgba(0, 255, 0, 0.8)';
            }
            
            dataPoints.push({
                x: index,
                y: item.price,
                date: item.date,
                pointStyle: pointStyle,
                pointRadius: pointRadius,
                pointBackgroundColor: pointBackgroundColor
            });
        });
        
        // Update chart data
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = dataPoints;
        
        // Calculate padding for Y axis
        const padding = (maxPrice - minPrice) * 0.1; // 10% padding
        
        // Update Y axis to ensure data stays in view
        this.chart.options.scales.y.min = minPrice - padding;
        this.chart.options.scales.y.max = maxPrice + padding;
        
        // Adjust the number of ticks based on zoom level
        this.chart.options.scales.x.ticks.maxTicksLimit = 10 + (this.currentZoomLevel * 5);
        
        // Update the chart
        this.chart.update();
    }
    
    // Calculate the average time interval between data points in minutes
    calculateAverageTimeInterval() {
        if (this.rawData.length < 2) return 1;
        
        // Calculate total time span and divide by number of intervals
        const firstDate = new Date(this.rawData[0].date);
        const lastDate = new Date(this.rawData[this.rawData.length - 1].date);
        const totalMinutes = (lastDate - firstDate) / (1000 * 60);
        const intervals = this.rawData.length - 1;
        
        return Math.max(1, totalMinutes / intervals);
    }
    
    // Format time with minutes (HH:MM)
    formatTimeWithMinutes(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Format time only (HH:MM)
    formatTimeOnly(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Format date only in solar calendar (MM/DD)
    formatDateForAxis(date) {
        try {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            
            // Directly convert to Solar date using farvardin
            const solarDate = farvardin.gregorianToSolar(year, month, day, "object");
            return `${String(solarDate.month).padStart(2, '0')}/${String(solarDate.day).padStart(2, '0')}`;
        } catch (e) {
            console.error('Error formatting date for axis:', e);
            return '';
        }
    }
    
    // Format date and time for axis (MM/DD HH:MM)
    formatDateTimeForAxis(date) {
        try {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            // Directly convert to Solar date using farvardin
            const solarDate = farvardin.gregorianToSolar(year, month, day, "object");
            return `${String(solarDate.month).padStart(2, '0')}/${String(solarDate.day).padStart(2, '0')} ${hours}:${minutes}`;
        } catch (e) {
            console.error('Error formatting date-time for axis:', e);
            return '';
        }
    }

    formatPrice(price) {
        if (typeof price !== 'number' || isNaN(price)) return '-';
        // Use the raw price without multiplying by 10 as the CSV already has the correct values
        return price.toLocaleString('fa-IR') + ' ریال';
    }

    updateLastUpdate() {
        try {
            if (!this.lastDataTimestamp) return;
            
            const date = new Date(this.lastDataTimestamp);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            
            // Get year, month, day
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            
            // Directly convert to Solar date using farvardin
            try {
                const solarDate = farvardin.gregorianToSolar(year, month, day, "object");
                const formattedDate = `${solarDate.year}/${String(solarDate.month).padStart(2, '0')}/${String(solarDate.day).padStart(2, '0')} ${hours}:${minutes}:${seconds}`;
                document.getElementById('lastUpdate').textContent = formattedDate;
            } catch (conversionError) {
                console.error('Error converting last update date:', conversionError);
                document.getElementById('lastUpdate').textContent = 'خطا در نمایش تاریخ';
            }
        } catch (error) {
            console.error('Error updating last update:', error);
            document.getElementById('lastUpdate').textContent = 'خطا در نمایش تاریخ';
        }
    }

    showNoDataMessage() {
        document.getElementById('currentPrice').textContent = 'داده‌ای یافت نشد';
        document.getElementById('lastUpdate').textContent = 'هیچ داده‌ای در دسترس نیست';
    }

    showErrorMessage() {
        document.getElementById('currentPrice').textContent = 'خطا در بارگذاری';
        document.getElementById('lastUpdate').textContent = 'خطا در دریافت داده‌ها';
    }

    // Format full date and time for tooltip display
    formatFullDateTimeForTooltip(date) {
        try {
            const gregorianDate = new Date(date);
            const hours = gregorianDate.getHours().toString().padStart(2, '0');
            const minutes = gregorianDate.getMinutes().toString().padStart(2, '0');
            
            // Get year, month, day
            const year = gregorianDate.getFullYear();
            const month = gregorianDate.getMonth() + 1;
            const day = gregorianDate.getDate();
            
            // Convert to Solar date
            const solarDate = farvardin.gregorianToSolar(year, month, day, "object");
            return `${hours}:${minutes} - ${solarDate.year}/${String(solarDate.month).padStart(2, '0')}/${String(solarDate.day).padStart(2, '0')}`;
        } catch (error) {
            console.error('Error formatting full date and time:', error);
            return 'Invalid Date';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GoldPriceTracker();
}); 