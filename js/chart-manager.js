/**
 * 圖表管理器類
 */
class ChartManager {
    /**
     * 構造函數
     * @param {Object} dataHandler - 數據處理器實例
     */
    constructor(dataHandler) {
        this.dataHandler = dataHandler;
        this.charts = {};
    }
    
    /**
     * 初始化所有圖表
     */
    initCharts() {
        try {
            this.initBalanceChart();
            console.log('餘額圖表初始化成功');
        } catch (error) {
            console.error('初始化餘額圖表失敗:', error);
        }
        
        try {
            this.initRoiChart();
            console.log('ROI 圖表初始化成功');
        } catch (error) {
            console.error('初始化 ROI 圖表失敗:', error);
        }
    }
    
    /**
     * 初始化餘額圖表
     */
    initBalanceChart() {
        const canvas = document.getElementById('balance-chart');
        if (!canvas) {
            console.warn('找不到 balance-chart 元素，跳過初始化');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // 獲取歷史數據
        const tournaments = this.dataHandler.getAllTournaments();
        
        // 準備數據
        const sortedData = this.getSortedDataByDate(tournaments);
        
        // 計算累計盈虧
        let cumulativeProfit = 0;
        const profitData = sortedData.tournaments.map(tournament => {
            const profit = tournament.prizeAmount - (tournament.buyinAmount + (tournament.addonAmount || 0));
            cumulativeProfit += profit;
            return cumulativeProfit;
        });
        
        // 創建圖表
        this.charts.balance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedData.labels,
                datasets: [{
                    label: '累計盈虧',
                    data: profitData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '餘額: $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 初始化 ROI 圖表
     */
    initRoiChart() {
        const canvas = document.getElementById('roi-chart-canvas');
        if (!canvas) {
            console.warn('找不到 roi-chart-canvas 元素，跳過初始化');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // 獲取統計數據
        const stats = this.dataHandler.getStatistics();
        
        // 獲取近期各場次數據
        const tournaments = this.dataHandler.getAllTournaments();
        
        // 按日期排序
        const sortedData = this.getSortedDataByDate(tournaments);
        
        // 計算每場 ROI
        const roiData = sortedData.tournaments.map(tournament => {
            const investment = tournament.buyinAmount + (tournament.addonAmount || 0);
            if (investment <= 0) return 0;
            const profit = tournament.prizeAmount - investment;
            return (profit / investment) * 100;
        });
        
        // 創建圖表
        this.charts.roi = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedData.labels,
                datasets: [{
                    label: '場次 ROI (%)',
                    data: roiData,
                    backgroundColor: roiData.map(roi => roi >= 0 ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)'),
                    borderColor: roiData.map(roi => roi >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'ROI: ' + context.parsed.y.toFixed(2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 更新所有圖表
     */
    updateAllCharts() {
        try {
            this.updateBalanceChart();
        } catch (error) {
            console.error('更新餘額圖表失敗:', error);
        }
        
        try {
            this.updateRoiChart();
        } catch (error) {
            console.error('更新 ROI 圖表失敗:', error);
        }
    }
    
    /**
     * 更新餘額圖表
     */
    updateBalanceChart() {
        if (!this.charts.balance) {
            this.initBalanceChart();
            return;
        }
        
        const tournaments = this.dataHandler.getAllTournaments();
        
        // 準備數據
        const sortedData = this.getSortedDataByDate(tournaments);
        
        // 計算累計盈虧
        let cumulativeProfit = 0;
        const profitData = sortedData.tournaments.map(tournament => {
            const profit = tournament.prizeAmount - (tournament.buyinAmount + (tournament.addonAmount || 0));
            cumulativeProfit += profit;
            return cumulativeProfit;
        });
        
        // 更新圖表
        this.charts.balance.data.labels = sortedData.labels;
        this.charts.balance.data.datasets[0].data = profitData;
        this.charts.balance.update();
    }
    
    /**
     * 更新 ROI 圖表
     */
    updateRoiChart() {
        if (!this.charts.roi) {
            this.initRoiChart();
            return;
        }
        
        const tournaments = this.dataHandler.getAllTournaments();
        
        // 準備數據
        const sortedData = this.getSortedDataByDate(tournaments);
        
        // 計算每場 ROI
        const roiData = sortedData.tournaments.map(tournament => {
            const investment = tournament.buyinAmount + (tournament.addonAmount || 0);
            if (investment <= 0) return 0;
            const profit = tournament.prizeAmount - investment;
            return (profit / investment) * 100;
        });
        
        // 更新圖表
        this.charts.roi.data.labels = sortedData.labels;
        this.charts.roi.data.datasets[0].data = roiData;
        this.charts.roi.data.datasets[0].backgroundColor = roiData.map(roi => roi >= 0 ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)');
        this.charts.roi.data.datasets[0].borderColor = roiData.map(roi => roi >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)');
        this.charts.roi.update();
    }
    
    /**
     * 獲取按日期排序的數據
     * @param {Array} tournaments - 錦標賽數據
     * @returns {Object} 排序後的數據和標籤
     */
    getSortedDataByDate(tournaments) {
        if (!tournaments || tournaments.length === 0) {
            return {
                tournaments: [],
                labels: []
            };
        }
        
        // 按日期排序
        const sortedTournaments = [...tournaments].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        // 創建標籤
        const labels = sortedTournaments.map(tournament => {
            return tournament.date;
        });
        
        return {
            tournaments: sortedTournaments,
            labels: labels
        };
    }
} 