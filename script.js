// Initialize moment locale and configurations
let moment;
moment.locale('fa');

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

        this.initChart();
        this.setupEventListeners();
        this.loadData();
        this.startDataRefreshCycle();
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
            const today = new Date();
            const dates = this.generateDateRange(today, 365);
            let allData = [];
            this.availableDates = [];

            // First try to load today's data
            const todayStr = dates[0];
            try {
                const todayData = await this.loadCSVData(todayStr);
                if (todayData && todayData.length > 0) {
                    allData = allData.concat(todayData);
                    this.availableDates.push(todayStr);
                    console.log(`Loaded today's data (${todayStr}): ${todayData.length} records`);
                    
                    // Update display immediately with today's data
                    this.rawData = allData.sort((a, b) => new Date(a.date) - new Date(b.date));
                    this.lastDataTimestamp = this.rawData[this.rawData.length - 1].date;
                    this.updatePriceInfo();
                    this.updateChart();
                    this.updateLastUpdate();
                }
            } catch (error) {
                console.log(`No data available for today (${todayStr})`);
            }

            // Then load historical data
            for (let i = 1; i < Math.min(30, dates.length); i++) {
                const dateStr = dates[i];
                try {
                    const data = await this.loadCSVData(dateStr);
                    if (data && data.length > 0) {
                        allData = allData.concat(data);
                        this.availableDates.push(dateStr);
                        console.log(`Loaded data for ${dateStr}: ${data.length} records`);
                        
                        // Update display periodically as we load more data
                        if (i % 5 === 0 || i === dates.length - 1) {
                            this.rawData = allData.sort((a, b) => new Date(a.date) - new Date(b.date));
                            this.updateChart();
                        }
                    }
                } catch (error) {
                    console.log(`No data available for ${dateStr}`);
                }
            }

            if (allData.length > 0) {
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
                            .filter(row => !isNaN(row.price) && row.date instanceof Date && !isNaN(row.date));

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

    generateDateRange(endDate, days) {
        const dates = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(endDate);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
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
        const momentDate = moment(date);
        const gregorianDate = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
        const solarDate = farvardin.gregorianToSolar(...gregorianDate, "object");
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        if (period === '1d') {
            return `${hours}:${minutes} - ${solarDate.year}/${solarDate.month}/${solarDate.day}`;
        } else {
            return `${hours}:${minutes} - ${solarDate.year}/${solarDate.month}/${solarDate.day}`;
        }
    }

    formatAxisDate(date, period) {
        const gregorianDate = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
        const solarDate = farvardin.gregorianToSolar(...gregorianDate, "object");
        
        if (period === '1d') {
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } else {
            return `${solarDate.year}/${solarDate.month}/${solarDate.day}`;
        }
    }

    initChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');

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
                                const date = new Date(context[0].parsed.x);
                                return this.formatDateByPeriod(date, this.currentPeriod);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            stepSize: 1,
                            displayFormats: {
                                millisecond: 'HH:mm:ss',
                                second: 'HH:mm:ss',
                                minute: 'HH:mm',
                                hour: 'HH:mm',
                                day: 'jD jMMMM',
                                week: 'jD jMMMM',
                                month: 'jMMMM jYYYY'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            maxRotation: 0,
                            color: '#666',
                            font: {
                                family: 'Vazir',
                                size: 12
                            },
                            callback: (value) => {
                                const date = new Date(value);
                                return this.formatAxisDate(date, this.currentPeriod);
                            }
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
            }
        });
    }

    updateChart() {
        if (!this.rawData.length) return;

        const filteredData = this.filterDataByPeriod(this.rawData, this.currentPeriod);
        let step = this.calculateStep(filteredData.length, this.currentPeriod);
        const chartData = this.sampleData(filteredData, step);

        this.chart.data.labels = chartData.map(d => d.date);
        this.chart.data.datasets[0].data = chartData.map(d => ({
            x: d.date,
            y: d.price
        }));

        this.chart.update('none');
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
        
        if (direction === 'in') {
            this.currentZoomLevel = Math.min(4, this.currentZoomLevel + 1);
        } else {
            this.currentZoomLevel = Math.max(1, this.currentZoomLevel - 1);
        }

        // Adjust time unit and step size based on zoom level and period
        let timeUnit = 'hour';
        let stepSize = 1;

        if (this.currentPeriod === '1d') {
            switch(this.currentZoomLevel) {
                case 1: stepSize = 60; timeUnit = 'minute'; break; // 1 hour
                case 2: stepSize = 30; timeUnit = 'minute'; break; // 30 minutes
                case 3: stepSize = 15; timeUnit = 'minute'; break; // 15 minutes
                case 4: stepSize = 1; timeUnit = 'minute'; break;  // 1 minute
            }
        } else {
            switch(this.currentZoomLevel) {
                case 1: stepSize = 24; timeUnit = 'hour'; break;  // 1 day
                case 2: stepSize = 12; timeUnit = 'hour'; break;  // 12 hours
                case 3: stepSize = 6; timeUnit = 'hour'; break;   // 6 hours
                case 4: stepSize = 1; timeUnit = 'hour'; break;   // 1 hour
            }
        }

        // Update chart options
        this.chart.options.scales.x.time.unit = timeUnit;
        this.chart.options.scales.x.time.stepSize = stepSize;

        // Calculate min and max values for Y axis
        const prices = filteredData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const padding = (maxPrice - minPrice) * 0.1; // 10% padding

        // Update Y axis to ensure data stays in view
        this.chart.options.scales.y.min = minPrice - padding;
        this.chart.options.scales.y.max = maxPrice + padding;

        // Update the data with appropriate sampling
        const step = Math.max(1, Math.floor(filteredData.length / (200 * this.currentZoomLevel)));
        const chartData = this.sampleData(filteredData, step);

        this.chart.data.labels = chartData.map(d => d.date);
        this.chart.data.datasets[0].data = chartData.map(d => ({
            x: d.date,
            y: d.price
        }));

        this.chart.update('none');
    }

    formatPrice(price) {
        if (typeof price !== 'number' || isNaN(price)) return '-';
        return (price * 10).toLocaleString('fa-IR') + ' ریال';
    }

    updateLastUpdate() {
        if (!this.lastDataTimestamp) return;
        const date = new Date(this.lastDataTimestamp);
        const gregorianDate = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
        const solarDate = farvardin.gregorianToSolar(...gregorianDate, "object");
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        document.getElementById('lastUpdate').textContent = `${solarDate.year}/${solarDate.month}/${solarDate.day} ${hours}:${minutes}:${seconds}`;
    }

    showNoDataMessage() {
        document.getElementById('currentPrice').textContent = 'داده‌ای یافت نشد';
        document.getElementById('lastUpdate').textContent = 'هیچ داده‌ای در دسترس نیست';
    }

    showErrorMessage() {
        document.getElementById('currentPrice').textContent = 'خطا در بارگذاری';
        document.getElementById('lastUpdate').textContent = 'خطا در دریافت داده‌ها';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GoldPriceTracker();
}); 