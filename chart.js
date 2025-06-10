let chart;
let allChartData = [];
const lower_y_off = 35;
const higher_y_off = -5;
let currentRange = '1d';

console.log('🚀 Gold Price Chart Application Starting...');
console.log('⚙️ Default range set to:', currentRange);

loadInitialData()
    .then(data => {
        allChartData = [];
        const multiplier = (window.feeEnabled ? fee : 1) * fac;
        for (let i = 0; i < data.length; i++) {
            allChartData.push([data[i][0], data[i][1] * multiplier]);
        }
        createInitialChart();
        updateLastDataTime();
        filterData(currentRange);
    })
    .catch(error => {
        console.error('Error fetching CSV data:', error);
    });

function createInitialChart() {
    const initialMax = allChartData.length > 0 ? allChartData[allChartData.length - 1][0] : new Date().getTime();
    const initialMin = allChartData.length > 0 ? allChartData[0][0] : undefined;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minPriceTime = 0;
    let maxPriceTime = 0;

    if (allChartData.length > 0) {
        allChartData.forEach(item => {
            const time = item[0];
            const price = item[1];
            if (price < minPrice) {
                minPrice = price;
                minPriceTime = time;
            }
            if (price > maxPrice) {
                maxPrice = price;
                maxPriceTime = time;
            }
        });
    }

    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;
    
    // Determine rounding increment based on price magnitude
    let roundingIncrement;
    if (maxPrice >= 10000000) { // 10M+
        roundingIncrement = 10000; // Round to nearest 10,000
    } else if (maxPrice >= 1000000) { // 1M+
        roundingIncrement = 1000; // Round to nearest 1,000
    } else {
        roundingIncrement = 100; // Round to nearest 100
    }
    
    const yMin = Math.floor((minPrice - padding) / roundingIncrement) * roundingIncrement;
    const yMax = Math.ceil((maxPrice + padding) / roundingIncrement) * roundingIncrement;

    let effectiveMinOffsetX = 0;
    let effectiveMaxOffsetX = 0;

    const xAxisRangeInitial = initialMax - initialMin;
    const leftThresholdInitial = initialMin + (xAxisRangeInitial * 0.05);
    const rightThresholdInitial = initialMax - (xAxisRangeInitial * 0.05);

    if (minPriceTime < leftThresholdInitial) {
        effectiveMinOffsetX = 40;
    } else if (minPriceTime > rightThresholdInitial) {
        effectiveMinOffsetX = -40;
    }

    if (maxPriceTime < leftThresholdInitial) {
        effectiveMaxOffsetX = 40;
    } else if (maxPriceTime > rightThresholdInitial) {
        effectiveMaxOffsetX = -40;
    }

    const options = {
        chart: {
            type: 'area',
            height: 385,
            zoom: {
                enabled: false
            },
            animations: {
                enabled: false
            },
            toolbar: {
                show: false
            },
            fontFamily: 'Vazirmatn, sans-serif',
        },
        theme: {
            monochrome: {
                enabled: true,
                color: '#FFD700', 
                shadeTo: 'light',
                shadeIntensity: 0.65
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth'
        },
        series: [{
            name: 'Price',
            data: allChartData.map(item => [item[0], item[1]])
        }],
        grid: {
            show: true,
            borderColor: '#e0e0e0',
            strokeDashArray: 0,
            position: 'back',
            xaxis: {
                lines: {
                    show: true
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            }
        },
                    xaxis: {
                type: 'datetime',
                labels: {
                    formatter: function(value) {
                        const date = new Date(value);
                        const solarDate = farvardin.gregorianToSolar(date.getFullYear(), date.getMonth() + 1, date.getDate(), 'object');
                        const hour = date.getHours();
                        const minute = date.getMinutes();
                        
                        const solarMonthDay = solarDate.month.toString().padStart(2, '0') + '/' + solarDate.day.toString().padStart(2, '0');
                        const timeString = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
                        
                        return solarMonthDay + ' ' + timeString;
                    },
                    style: {
                        fontSize: '14px',
                        fontWeight: '400',
                    }
                },
                min: initialMin,
                max: initialMax,
                tooltip: {
                    enabled: false
                }
            },
        yaxis: {
            title: {
                text: 'قیمت (ریال)',
                style: {
                    fontSize: '14px',
                    fontWeight: '700',
                }
            },
            labels: {
                formatter: function (val) {
                    return val.toLocaleString('en-US');
                },
                style: {
                    fontSize: '14px',
                    fontWeight: '700',
                    fontFamily: 'Vazirmatn, sans-serif',
                    color: '#000',
                }
            },
            min: yMin,
            max: yMax
        },
        annotations: {
            points: [
                {
                    x: minPriceTime,
                    y: minPrice,
                    marker: {
                        size: 2,
                        fillColor: '#0000FF',
                        strokeColor: 'transparent',
                        radius: 2,
                    },
                    label: {
                        borderColor: 'transparent',
                        offsetY: lower_y_off,
                        offsetX: effectiveMinOffsetX,
                        style: {
                            color: '#000',
                            background: 'transparent',
                            fontSize: '14px',
                            fontWeight: '400',
                        },
                        text: `\u200fریال \u200e${minPrice.toLocaleString('en-US')}`,
                    }
                },
                {
                    x: maxPriceTime,
                    y: maxPrice,
                    marker: {
                        size: 2,
                        fillColor: '#0000FF',
                        strokeColor: 'transparent',
                        radius: 2,
                    },
                    label: {
                        borderColor: 'transparent',
                        offsetY: higher_y_off,
                        offsetX: effectiveMaxOffsetX,
                        style: {
                            color: '#000',
                            background: 'transparent',
                            fontSize: '14px',
                            fontWeight: '400',
                        },
                        text: `\u200fریال \u200e${maxPrice.toLocaleString('en-US')}`,
                    }
                }
            ]
        },
                tooltip: createTooltipConfig(),
    };

    console.log('🎨 Creating initial chart...');
    chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
    console.log('📈 Initial chart rendered...');
}

async function filterData(range) {
    console.log(`🎨 Filtering data for range: ${range}`);
    
    const rawData = await loadDataForRange(range);
    allChartData = [];
    const multiplier = (window.feeEnabled ? fee : 1) * fac;
    for (let i = 0; i < rawData.length; i++) {
        allChartData.push([rawData[i][0], rawData[i][1] * multiplier]);
    }
    
    if (allChartData.length === 0) {
        console.warn('⚠️ No data available for the selected range');
        return;
    }
    
    updateLastDataTime();
    
    const latestTimestamp = allChartData.length > 0 ? allChartData[allChartData.length - 1][0] : new Date().getTime();
    let startTime, endTime;

    endTime = latestTimestamp;
    
    if (range === '1h') {
        startTime = latestTimestamp - (60 * 60 * 1000);
    } else if (range === '1d') {
        startTime = latestTimestamp - (24 * 60 * 60 * 1000);
    } else if (range === '1w') {
        startTime = latestTimestamp - (7 * 24 * 60 * 60 * 1000);
    } else if (range === '1m') {
        startTime = latestTimestamp - (30 * 24 * 60 * 60 * 1000);
    }

    let filteredAndResampledData = [];
    const rawFilteredData = allChartData.filter(item => item[0] >= startTime);

    if (range === '1h') {
        const roundedData = new Map();
        rawFilteredData.forEach(item => {
            const date = new Date(item[0]);
            const roundedTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), 0, 0);
            const roundedTimestamp = roundedTime.getTime();
            
            if (!roundedData.has(roundedTimestamp) || Math.abs(item[0] - roundedTimestamp) < Math.abs(roundedData.get(roundedTimestamp)[0] - roundedTimestamp)) {
                roundedData.set(roundedTimestamp, [roundedTimestamp, item[1]]);
            }
        });
        filteredAndResampledData = Array.from(roundedData.values());
    } else if (range === '1d') {
        const roundedData = new Map();
        rawFilteredData.forEach(item => {
            const date = new Date(item[0]);
            const roundedMinutes = Math.floor(date.getMinutes() / 5) * 5;
            const roundedTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), roundedMinutes, 0, 0);
            const roundedTimestamp = roundedTime.getTime();
            
            if (!roundedData.has(roundedTimestamp) || Math.abs(item[0] - roundedTimestamp) < Math.abs(roundedData.get(roundedTimestamp)[0] - roundedTimestamp)) {
                roundedData.set(roundedTimestamp, [roundedTimestamp, item[1]]);
            }
        });
        filteredAndResampledData = Array.from(roundedData.values());
    } else if (range === '1w') {
        const roundedData = new Map();
        rawFilteredData.forEach(item => {
            const date = new Date(item[0]);
            const roundedHours = Math.floor(date.getHours() / 2) * 2;
            const roundedTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), roundedHours, 0, 0, 0);
            const roundedTimestamp = roundedTime.getTime();
            
            if (!roundedData.has(roundedTimestamp) || Math.abs(item[0] - roundedTimestamp) < Math.abs(roundedData.get(roundedTimestamp)[0] - roundedTimestamp)) {
                roundedData.set(roundedTimestamp, [roundedTimestamp, item[1]]);
            }
        });
        filteredAndResampledData = Array.from(roundedData.values());
    } else if (range === '1m') {
        const roundedData = new Map();
        rawFilteredData.forEach(item => {
            const date = new Date(item[0]);
            const roundedHours = Math.floor(date.getHours() / 12) * 12;
            const roundedTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), roundedHours, 0, 0, 0);
            const roundedTimestamp = roundedTime.getTime();
            
            if (!roundedData.has(roundedTimestamp) || Math.abs(item[0] - roundedTimestamp) < Math.abs(roundedData.get(roundedTimestamp)[0] - roundedTimestamp)) {
                roundedData.set(roundedTimestamp, [roundedTimestamp, item[1]]);
            }
        });
        filteredAndResampledData = Array.from(roundedData.values());
    } else {
        filteredAndResampledData = rawFilteredData;
    }

    if (filteredAndResampledData.length > 0) {
        const firstFilteredTimestamp = filteredAndResampledData[0][0];
        const lastFilteredTimestamp = filteredAndResampledData[filteredAndResampledData.length - 1][0];
        startTime = firstFilteredTimestamp;
        endTime = lastFilteredTimestamp;
    }

    let currentMinPrice = Infinity;
    let currentMaxPrice = -Infinity;
    let currentMinPriceTime = 0;
    let currentMaxPriceTime = 0;

    if (filteredAndResampledData.length > 0) {
        filteredAndResampledData.forEach(item => {
            const time = item[0];
            const price = item[1];
            if (price < currentMinPrice) {
                currentMinPrice = price;
                currentMinPriceTime = time;
            }
            if (price > currentMaxPrice) {
                currentMaxPrice = price;
                currentMaxPriceTime = time;
            }
        });
    }

    const currentPriceRange = currentMaxPrice - currentMinPrice;
    const currentPadding = currentPriceRange * 0.1;
    
    // Determine rounding increment based on price magnitude
    let currentRoundingIncrement;
    if (currentMaxPrice >= 10000000) { // 10M+
        currentRoundingIncrement = 10000; // Round to nearest 10,000
    } else if (currentMaxPrice >= 1000000) { // 1M+
        currentRoundingIncrement = 1000; // Round to nearest 1,000
    } else {
        currentRoundingIncrement = 100; // Round to nearest 100
    }
    
    const currentYMin = Math.floor((currentMinPrice - currentPadding) / currentRoundingIncrement) * currentRoundingIncrement;
    const currentYMax = Math.ceil((currentMaxPrice + currentPadding) / currentRoundingIncrement) * currentRoundingIncrement;

    let effectiveCurrentMinOffsetX = 0;
    let effectiveCurrentMaxOffsetX = 0;

    const xAxisRangeFiltered = endTime - startTime;
    const leftThresholdFiltered = startTime + (xAxisRangeFiltered * 0.05);
    const rightThresholdFiltered = endTime - (xAxisRangeFiltered * 0.05);

    if (currentMinPriceTime < leftThresholdFiltered) {
        effectiveCurrentMinOffsetX = 40;
    } else if (currentMinPriceTime > rightThresholdFiltered) {
        effectiveCurrentMinOffsetX = -40;
    }

    if (currentMaxPriceTime < leftThresholdFiltered) {
        effectiveCurrentMaxOffsetX = 40;
    } else if (currentMaxPriceTime > rightThresholdFiltered) {
        effectiveCurrentMaxOffsetX = -40;
    }

    chart.updateOptions({
        series: [{
            data: filteredAndResampledData
        }],
        grid: {
            show: true,
            borderColor: '#e0e0e0',
            strokeDashArray: 0,
            position: 'back',
            xaxis: {
                lines: {
                    show: true
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            }
        },
        xaxis: {
            min: startTime,
            max: endTime,
            labels: {
                formatter: function(value) {
                    const date = new Date(value);
                    const solarDate = farvardin.gregorianToSolar(date.getFullYear(), date.getMonth() + 1, date.getDate(), 'object');
                    const hour = date.getHours();
                    const minute = date.getMinutes();
                    
                    const solarMonthDay = solarDate.month.toString().padStart(2, '0') + '/' + solarDate.day.toString().padStart(2, '0');
                    const timeString = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
                    
                    const timeSpan = endTime - startTime;
                    const oneDay = 24 * 60 * 60 * 1000;
                    const severalDays = 7 * 24 * 60 * 60 * 1000; // 7 days
                    
                    if (timeSpan <= oneDay) {
                        return timeString;
                    } else if (timeSpan > oneDay && timeSpan <= severalDays) {
                        return solarMonthDay + ' ' + timeString;
                    } else {
                        return solarMonthDay;
                    }
                }
            },
            tooltip: {
                enabled: false
            }
        },
        yaxis: {
            labels: {
                formatter: function (val) {
                    return val.toLocaleString('en-US');
                },
                style: {
                    fontSize: '14px',
                    fontWeight: '700',
                    fontFamily: 'Vazirmatn, sans-serif',
                    color: '#000',
                }
            },
            min: currentYMin,
            max: currentYMax
        },
        annotations: {
            points: [
                {
                    x: currentMinPriceTime,
                    y: currentMinPrice,
                    marker: {
                        size: 2,
                        fillColor: '#0000FF',
                        strokeColor: 'transparent',
                        radius: 2,
                    },
                    label: {
                        borderColor: 'transparent',
                        offsetY: lower_y_off,
                        offsetX: effectiveCurrentMinOffsetX,
                        style: {
                            color: '#000',
                            background: 'transparent',
                            fontSize: '14px',
                            fontWeight: '400',
                        },
                        text: `\u200fریال \u200e${currentMinPrice.toLocaleString('en-US')}`,
                    }
                },
                {
                    x: currentMaxPriceTime,
                    y: currentMaxPrice,
                    marker: {
                        size: 2,
                        fillColor: '#0000FF',
                        strokeColor: 'transparent',
                        radius: 2,
                    },
                    label: {
                        borderColor: 'transparent',
                        offsetY: higher_y_off,
                        offsetX: effectiveCurrentMaxOffsetX,
                        style: {
                            color: '#000',
                            background: 'transparent',
                            fontSize: '14px',
                            fontWeight: '400',
                        },
                        text: `\u200fریال \u200e${currentMaxPrice.toLocaleString('en-US')}`,
                    }
                }
            ]
        }
    });
    
    console.log(`📊 Chart updated for ${range} with ${filteredAndResampledData.length} data points`);
}

document.addEventListener('DOMContentLoaded', function() {
    const chartContainer = document.getElementById('chart');
    
    if (chartContainer) {
        chartContainer.addEventListener('mouseleave', function() {
            setTimeout(() => {
                const tooltips = document.querySelectorAll('.apexcharts-tooltip');
                tooltips.forEach(tooltip => {
                    tooltip.style.opacity = '0';
                    tooltip.style.visibility = 'hidden';
                });
            }, 10);
        });
        
        chartContainer.addEventListener('mouseenter', function() {
            const tooltips = document.querySelectorAll('.apexcharts-tooltip');
            tooltips.forEach(tooltip => {
                tooltip.style.opacity = '';
                tooltip.style.visibility = '';
            });
        });
    }
}); 