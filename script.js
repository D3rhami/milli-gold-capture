class GoldPriceChart {
    constructor() {
        this.chart = null;
        this.data = [];
        this.currentPeriod = '1d';
        this.chartType = 'line';
        this.baseUrl = 'https://raw.githubusercontent.com/D3rhami/milli-gold-capture/master/database/';
        this.updateInterval = 60000; // 1 minute
        this.progressBar = document.getElementById('updateProgress');
        this.lastUpdateSpan = document.getElementById('lastUpdate');
        this.currentPriceSpan = document.getElementById('currentPrice');
        
        this.initializeChart();
        this.setupEventListeners();
        this.startDataRefreshCycle();
    }

    initializeChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');
        
        // Define crosshair plugin
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart) => {
                if (!chart.tooltip._active || !chart.tooltip._active.length) return;

                const activePoint = chart.tooltip._active[0];
                const { ctx } = chart;
                const { x, y } = activePoint.element;
                const leftX = chart.scales.x.left;
                const rightX = chart.scales.x.right;
                const topY = chart.scales.y.top;
                const bottomY = chart.scales.y.bottom;

                // Save state
                ctx.save();

                // Draw vertical line
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.stroke();

                // Draw horizontal line
                ctx.beginPath();
                ctx.moveTo(leftX, y);
                ctx.lineTo(rightX, y);
                ctx.stroke();

                // Restore state
                ctx.restore();
            }
        };
        
        this.chart = new Chart(ctx, {
            type: this.chartType,
            data: {
                labels: [],
                datasets: [{
                    label: 'قیمت طلا',
                    data: [],
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    crosshair: true,
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        titleFont: {
                            family: 'Vazirmatn'
                        },
                        bodyFont: {
                            family: 'Vazirmatn'
                        },
                        callbacks: {
                            label: (context) => {
                                return `قیمت: ${this.formatPrice(context.raw.price)} ریال`;
                            },
                            title: (tooltipItems) => {
                                const item = tooltipItems[0];
                                return item.raw ? `${item.raw.j_date} - ${item.raw.time}` : '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                family: 'Vazirmatn'
                            },
                            maxRotation: 90,
                            minRotation: 90,
                            callback: (value, index) => {
                                const item = this.data[index];
                                if (!item) return '';
                                return `${item.time}\n${item.j_date}`;
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                family: 'Vazirmatn'
                            },
                            callback: (value) => this.formatPrice(value)
                        }
                    }
                }
            },
            plugins: [crosshairPlugin]
        });
    }

    async fetchData(date) {
        const filename = `${date.toISOString().split('T')[0]}.csv`;
        const url = this.baseUrl + filename;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('File not found');
            
            const text = await response.text();
            return text.split('\n')
                .slice(1) // Skip header
                .filter(line => line.trim())
                .map(line => {
                    const [date, price18, j_date] = line.split(',');
                    const dateObj = new Date(date);
                    return {
                        date: dateObj,
                        price: parseInt(price18),
                        j_date: j_date ? j_date.trim() : '',
                        time: dateObj.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                    };
                });
        } catch (error) {
            console.log(`No data for ${filename}`);
            return [];
        }
    }

    async loadData() {
        const today = new Date();
        let daysToLoad = 1;
        
        switch (this.currentPeriod) {
            case '1h': daysToLoad = 1; break;
            case '1d': daysToLoad = 1; break;
            case '7d': daysToLoad = 7; break;
            case '1m': daysToLoad = 30; break;
            case '1y': daysToLoad = 365; break;
        }

        // First load today's data
        const todayData = await this.fetchData(today);
        this.updateChart(todayData);

        // Then load historical data if needed
        if (daysToLoad > 1) {
            const promises = [];
            for (let i = 1; i < daysToLoad; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                promises.push(this.fetchData(date));
            }

            const historicalData = (await Promise.all(promises)).flat();
            this.updateChart([...todayData, ...historicalData]);
        }
    }

    updateChart(newData) {
        this.data = newData.sort((a, b) => a.date - b.date);
        
        // Filter data based on current period
        const now = new Date();
        let filteredData = this.data;
        
        switch (this.currentPeriod) {
            case '1h':
                const hourAgo = new Date(now - 60 * 60 * 1000);
                filteredData = this.data.filter(d => d.date >= hourAgo);
                break;
            case '1d':
                const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
                filteredData = this.data.filter(d => d.date >= dayAgo);
                break;
            // Other periods are handled by loadData
        }

        // Update chart
        this.chart.data.labels = filteredData.map((_, i) => i);
        this.chart.data.datasets[0].data = filteredData;
        
        // Update current price
        if (filteredData.length > 0) {
            const latestPrice = filteredData[filteredData.length - 1].price;
            this.currentPriceSpan.textContent = this.formatPrice(latestPrice);
            this.lastUpdateSpan.textContent = new Date().toLocaleString('fa-IR');
        }

        this.chart.update();
    }

    formatPrice(price) {
        return new Intl.NumberFormat('fa-IR').format(price);
    }

    startProgressBar() {
        let progress = 0;
        const interval = 100; // Update every 100ms
        const steps = this.updateInterval / interval;
        
        const incrementProgress = () => {
            progress += (100 / steps);
            if (progress > 100) progress = 0;
            this.progressBar.style.width = `${progress}%`;
        };

        setInterval(incrementProgress, interval);
    }

    startDataRefreshCycle() {
        this.loadData();
        this.startProgressBar();
        
        setInterval(() => {
            this.loadData();
        }, this.updateInterval);
    }

    setupEventListeners() {
        // Period buttons
        document.querySelectorAll('[data-period]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.loadData();
            });
        });

        // Chart type toggle
        document.querySelectorAll('[data-type]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.chartType = e.target.dataset.type;
                this.chart.config.type = this.chartType;
                this.chart.update();
            });
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GoldPriceChart();
}); 