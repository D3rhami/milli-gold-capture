function createTooltipConfig() {
    return {
        x: {
            format: 'dd/MM/yyyy HH:mm'
        },
        enabled: true,
        theme: 'dark',
        style: {
            fontSize: '16px',
            fontFamily: 'Vazirmatn, sans-serif',
            fontWeight: '400',
        },
        custom: function ({series, seriesIndex, dataPointIndex, w}) {
            const price = series[seriesIndex][dataPointIndex];
            const timestamp = w.globals.seriesX[seriesIndex][dataPointIndex];
            const date = new Date(timestamp);

            const time = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');

            const solarDate = farvardin.gregorianToSolar(date.getFullYear(), date.getMonth() + 1, date.getDate(), 'object');
            const solarFormatted = solarDate.year.toString() + '.' +
                solarDate.month.toString().padStart(2, '0') + '.' +
                solarDate.day.toString().padStart(2, '0');

            const gregorianFormatted = date.getFullYear().toString() + '.' +
                (date.getMonth() + 1).toString().padStart(2, '0') + '.' +
                date.getDate().toString().padStart(2, '0');

            let firstVisiblePrice = null;
            if (w.globals.series[0] && w.globals.series[0].length > 0) {
                for (let i = 0; i < w.globals.series[0].length; i++) {
                    if (w.globals.series[0][i] !== null && w.globals.series[0][i] !== undefined) {
                        firstVisiblePrice = w.globals.series[0][i];
                        break;
                    }
                }
            }

            let svgIcon = '';
            let percentageText = '0.00%';
            let percentageColor = '#808080';

            if (firstVisiblePrice !== null && firstVisiblePrice !== undefined && firstVisiblePrice !== 0) {
                const percentage = ((price - firstVisiblePrice) / firstVisiblePrice) * 100;
                const absPercentage = Math.abs(percentage);
                percentageText = percentage < 0 ? `${absPercentage.toFixed(2)}%-` : `${absPercentage.toFixed(2)}%`;

                if (percentage < 0) {
                    percentageColor = '#f02828';
                    svgIcon = '<svg width="16" height="16" viewBox="0 0 25 25" fill="none"><path d="M16 10.99L13.1299 14.05C12.9858 14.2058 12.811 14.3298 12.6166 14.4148C12.4221 14.4998 12.2122 14.5437 12 14.5437C11.7878 14.5437 11.5779 14.4998 11.3834 14.4148C11.189 14.3298 11.0142 14.2058 10.87 14.05L8 10.99" stroke="#f02828" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 17.4199V7.41992C21 5.21078 19.2091 3.41992 17 3.41992L7 3.41992C4.79086 3.41992 3 5.21078 3 7.41992V17.4199C3 19.6291 4.79086 21.4199 7 21.4199H17C19.2091 21.4199 21 19.6291 21 17.4199Z" stroke="#f02828" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                } else if (percentage > 0) {
                    percentageColor = '#1caf08';
                    svgIcon = '<svg width="16" height="16" viewBox="0 0 25 25" fill="none" transform="rotate(180)"><path d="M16 10.99L13.1299 14.05C12.9858 14.2058 12.811 14.3298 12.6166 14.4148C12.4221 14.4998 12.2122 14.5437 12 14.5437C11.7878 14.5437 11.5779 14.4998 11.3834 14.4148C11.189 14.3298 11.0142 14.2058 10.87 14.05L8 10.99" stroke="#1caf08" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 17.4199V7.41992C21 5.21078 19.2091 3.41992 17 3.41992L7 3.41992C4.79086 3.41992 3 5.21078 3 7.41992V17.4199C3 19.6291 4.79086 21.4199 7 21.4199H17C19.2091 21.4199 21 19.6291 21 17.4199Z" stroke="#1caf08" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                } else {
                    svgIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 12H8.01M12 12H12.01M16 12H16.01M7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V7.2C20 6.0799 20 5.51984 19.782 5.09202C19.5903 4.71569 19.2843 4.40973 18.908 4.21799C18.4802 4 17.9201 4 16.8 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.07989 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20Z" stroke="#808080" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                }
            } else {
                svgIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 12H8.01M12 12H12.01M16 12H16.01M7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V7.2C20 6.0799 20 5.51984 19.782 5.09202C19.5903 4.71569 19.2843 4.40973 18.908 4.21799C18.4802 4 17.9201 4 16.8 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.07989 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20Z" stroke="#808080" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            }

            const calendarSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 2V6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 2V6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 10H21" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

            const feeText = window.feeEnabled ? ' با کارمزد' : ' بدون کارمزد';

            return `
                <div class="apexcharts-tooltip-custom">
                    <div class="tooltip-header">یک گرم طلای ۱۸ عیار${feeText}</div>
                    <div class="tooltip-price">
                        <span style="color: ${percentageColor}; display: inline-flex; align-items: center;">
                            ${svgIcon}   
                            <span style="margin: 0 2px;">${percentageText}</span>
                        </span>
                        <span style="margin: 0 ; color: #555;">﷼</span> 
                        <span style="color: #000;">${price.toLocaleString()}</span> 
                    </div>
                    <div class="tooltip-percentage">
                        ${calendarSvg}
                        <span style="margin-right: 12px;">${solarFormatted} - ${time}</span>
                    </div>
                    <div class="tooltip-percentage">
                        ${calendarSvg}
                        <span style="margin-right: 12px;">${gregorianFormatted} - ${time}</span>
                    </div>
                </div>
            `;
        }
    };
} 