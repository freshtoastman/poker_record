class ChartManager {
    constructor(dataHandler) {
        this.dataHandler = dataHandler;
        this.charts = {
            profitTrend: null,
            venuePerformance: null,
            hourlyProfit: null,
            chipsToPrize: null
        };
    }
    
    initCharts() {
        try {
            this.initProfitTrendChart();
        } catch (error) {
            console.error('初始化收益趨勢圖表失敗:', error);
        }
        
        try {
            this.initVenuePerformanceChart();
        } catch (error) {
            console.error('初始化場地表現比較圖表失敗:', error);
        }
        
        try {
            this.initHourlyProfitChart();
        } catch (error) {
            console.error('初始化每小時收益圖表失敗:', error);
        }
        
        try {
            this.initChipsToPrizeChart();
        } catch (error) {
            console.error('初始化籌碼與獎金關係圖表失敗:', error);
        }
        
        // 監聽數據變化，自動更新圖表
        this.dataHandler.onDataChange(() => {
            this.updateAllCharts();
        });
    }
    
    // 初始化收益趨勢圖表
    initProfitTrendChart() {
        const ctx = document.getElementById('profitTrendChart').getContext('2d');
        this.charts.profitTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '累計收益',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '收益 ($)'
                        }
                    }
                }
            }
        });
    }
    
    // 初始化場地表現比較圖表
    initVenuePerformanceChart() {
        const ctx = document.getElementById('venuePerformanceChart').getContext('2d');
        this.charts.venuePerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '平均收益/場',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '平均收益 ($)'
                        }
                    }
                }
            }
        });
    }
    
    // 初始化每小時收益圖表
    initHourlyProfitChart() {
        const hourlyProfitElement = document.getElementById('hourlyProfitChart');
        if (!hourlyProfitElement) {
            console.warn('找不到 hourlyProfitChart 元素，跳過初始化');
            return;
        }
        const ctx = hourlyProfitElement.getContext('2d');
        this.charts.hourlyProfit = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '每小時收益',
                    data: [],
                    backgroundColor: 'rgba(255, 99, 132, 0.5)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '比賽時長 (小時)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '每小時收益 ($)'
                        }
                    }
                }
            }
        });
    }
    
    // 初始化籌碼-獎金關係圖表
    initChipsToPrizeChart() {
        const ctx = document.getElementById('chipsToPrizeChart').getContext('2d');
        this.charts.chipsToPrize = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: '籌碼與獎金關係',
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 0.5)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '起始籌碼'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '獎金 ($)'
                        }
                    }
                }
            }
        });
    }
    
    // 更新收益趨勢圖表
    updateProfitTrendChart() {
        if (!this.charts.profitTrend) {
            console.warn('profitTrend 圖表未初始化，跳過更新');
            return;
        }
        
        const trendData = this.dataHandler.getTrendData();
        
        this.charts.profitTrend.data.labels = trendData.map(d => d.date);
        this.charts.profitTrend.data.datasets[0].data = trendData.map(d => d.cumulativeProfit);
        this.charts.profitTrend.update();
    }
    
    // 更新場地表現比較圖表
    updateVenuePerformanceChart() {
        if (!this.charts.venuePerformance) {
            console.warn('venuePerformance 圖表未初始化，跳過更新');
            return;
        }
        
        const stats = this.dataHandler.getStatistics();
        const venues = Object.keys(stats.profitByVenue);
        
        this.charts.venuePerformance.data.labels = venues;
        this.charts.venuePerformance.data.datasets[0].data = 
            venues.map(v => stats.profitByVenue[v].avgProfit);
        this.charts.venuePerformance.update();
    }
    
    // 更新每小時收益圖表
    updateHourlyProfitChart() {
        if (!this.charts.hourlyProfit) {
            console.warn('hourlyProfit 圖表未初始化，跳過更新');
            return;
        }
        
        const tournaments = this.dataHandler.getAllTournaments();
        const hourlyProfitData = tournaments.map(t => ({
            x: t.hours,
            y: t.netProfit / t.hours
        }));
        
        this.charts.hourlyProfit.data.datasets[0].data = hourlyProfitData;
        this.charts.hourlyProfit.update();
    }
    
    // 更新籌碼-獎金關係圖表
    updateChipsToPrizeChart() {
        if (!this.charts.chipsToPrize) {
            console.warn('chipsToPrize 圖表未初始化，跳過更新');
            return;
        }
        
        const tournaments = this.dataHandler.getAllTournaments();
        const chipsToPrizeData = tournaments
            .filter(t => t.startingChips > 0) // 只顯示有籌碼數據的記錄
            .map(t => ({
                x: t.startingChips,
                y: t.prize
            }));
        
        this.charts.chipsToPrize.data.datasets[0].data = chipsToPrizeData;
        this.charts.chipsToPrize.update();
    }
    
    // 更新所有圖表
    updateAllCharts() {
        this.updateProfitTrendChart();
        this.updateVenuePerformanceChart();
        this.updateHourlyProfitChart();
        this.updateChipsToPrizeChart();
    }
} 