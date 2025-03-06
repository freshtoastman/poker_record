/**
 * 本地數據處理器類
 */
class LimitedTournamentDataHandler {
    /**
     * 構造函數
     */
    constructor() {
        this.username = '';
        this.tournaments = [];
        this.nextId = 1;
    }
    
    /**
     * 載入用戶數據
     * @param {string} username - 用戶名
     */
    loadUserData(username) {
        this.username = username;
        
        // 從本地存儲載入數據
        const storageKey = `tournaments_${username}`;
        const storedData = localStorage.getItem(storageKey);
        
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                this.tournaments = parsedData.tournaments || [];
                this.nextId = parsedData.nextId || 1;
            } catch (error) {
                console.error('解析存儲的數據時出錯:', error);
                this.tournaments = [];
                this.nextId = 1;
            }
        } else {
            this.tournaments = [];
            this.nextId = 1;
        }
    }
    
    /**
     * 保存數據到本地存儲
     * @returns {Object} 結果對象
     */
    saveData() {
        try {
            const storageKey = `tournaments_${this.username}`;
            const dataToSave = {
                tournaments: this.tournaments,
                nextId: this.nextId
            };
            
            localStorage.setItem(storageKey, JSON.stringify(dataToSave));
            
            return { success: true };
        } catch (error) {
            console.error('保存數據到本地存儲時出錯:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * 獲取錦標賽
     * @param {string} id - 錦標賽ID
     * @returns {Object|null} 錦標賽對象或null
     */
    getTournament(id) {
        const idNum = parseInt(id, 10);
        return this.tournaments.find(t => t.id === idNum) || null;
    }
    
    /**
     * 獲取所有錦標賽
     * @returns {Array} 錦標賽數組
     */
    getAllTournaments() {
        return [...this.tournaments];
    }
    
    /**
     * 添加錦標賽
     * @param {Object} tournamentData - 錦標賽數據
     * @returns {Object} 結果對象
     */
    addTournament(tournamentData) {
        try {
            const newTournament = {
                ...tournamentData,
                id: this.nextId++
            };
            
            this.tournaments.push(newTournament);
            
            // 保存數據
            this.saveData();
            
            return { success: true, id: newTournament.id };
        } catch (error) {
            console.error('添加錦標賽時出錯:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * 更新錦標賽
     * @param {string} id - 錦標賽ID
     * @param {Object} tournamentData - 錦標賽數據
     * @returns {Object} 結果對象
     */
    updateTournament(id, tournamentData) {
        try {
            const idNum = parseInt(id, 10);
            const index = this.tournaments.findIndex(t => t.id === idNum);
            
            if (index === -1) {
                return { success: false, message: '找不到指定的錦標賽記錄' };
            }
            
            // 更新數據
            this.tournaments[index] = {
                ...tournamentData,
                id: idNum
            };
            
            // 保存數據
            this.saveData();
            
            return { success: true };
        } catch (error) {
            console.error('更新錦標賽時出錯:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * 刪除錦標賽
     * @param {string} id - 錦標賽ID
     * @returns {Object} 結果對象
     */
    deleteTournament(id) {
        try {
            const idNum = parseInt(id, 10);
            const initialLength = this.tournaments.length;
            
            this.tournaments = this.tournaments.filter(t => t.id !== idNum);
            
            if (this.tournaments.length === initialLength) {
                return { success: false, message: '找不到指定的錦標賽記錄' };
            }
            
            // 保存數據
            this.saveData();
            
            return { success: true };
        } catch (error) {
            console.error('刪除錦標賽時出錯:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * 獲取統計數據
     * @returns {Object} 統計數據對象
     */
    getStatistics() {
        try {
            const tournaments = this.tournaments;
            
            // 如果沒有數據，返回默認值
            if (!tournaments || tournaments.length === 0) {
                return {
                    totalTournaments: 0,
                    totalProfit: 0,
                    avgProfit: 0,
                    roi: 0,
                    profitableTournaments: 0,
                    hourlyRate: 0,
                    avgDuration: 0
                };
            }
            
            // 計算總買入、總獎金、總盈虧
            let totalBuyin = 0;
            let totalPrize = 0;
            let totalProfit = 0;
            let profitableTournaments = 0;
            let totalMinutes = 0;
            let tournamentsWithDuration = 0;
            
            tournaments.forEach(tournament => {
                const buyin = (tournament.buyinAmount || 0) + (tournament.addonAmount || 0);
                const prize = tournament.prizeAmount || 0;
                const profit = prize - buyin;
                
                totalBuyin += buyin;
                totalPrize += prize;
                totalProfit += profit;
                
                if (profit > 0) {
                    profitableTournaments++;
                }
                
                if (tournament.minutes && tournament.minutes > 0) {
                    totalMinutes += tournament.minutes;
                    tournamentsWithDuration++;
                }
            });
            
            // 計算平均盈虧
            const avgProfit = tournaments.length > 0 ? totalProfit / tournaments.length : 0;
            
            // 計算ROI
            const roi = totalBuyin > 0 ? (totalProfit / totalBuyin) * 100 : 0;
            
            // 計算平均時長（分鐘）
            const avgDuration = tournamentsWithDuration > 0 ? totalMinutes / tournamentsWithDuration : 0;
            
            // 計算每小時收益率
            const totalHours = totalMinutes / 60;
            const hourlyRate = totalHours > 0 ? totalProfit / totalHours : 0;
            
            return {
                totalTournaments: tournaments.length,
                totalProfit: totalProfit,
                avgProfit: avgProfit,
                roi: roi,
                profitableTournaments: profitableTournaments,
                hourlyRate: hourlyRate,
                avgDuration: avgDuration
            };
        } catch (error) {
            console.error('計算統計數據時出錯:', error);
            // 返回默認值
            return {
                totalTournaments: 0,
                totalProfit: 0,
                avgProfit: 0,
                roi: 0,
                profitableTournaments: 0,
                hourlyRate: 0,
                avgDuration: 0
            };
        }
    }
} 