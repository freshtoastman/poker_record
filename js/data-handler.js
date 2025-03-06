class LimitedTournamentDataHandler {
    constructor() {
        this.tournaments = [];
        this.dataChangeCallbacks = [];
        this.currentUser = null;
        
        this.tournamentTemplates = {
            'standard': {
                venue: '市政華人',
                hours: 2,
                buyin: 3000,
                fee: 400
            }
        };
    }

    // 載入使用者資料
    loadUserData(username) {
        this.currentUser = username;
        const savedData = localStorage.getItem(`tournaments_${username}`);
        this.tournaments = savedData ? JSON.parse(savedData) : [];
        this.notifyDataChange();
    }

    // 解析 CSV
    parseCSV(csv) {
        return csv.split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => {
                const [id, date, venue, hours, buyin, fee, prize, netProfit, notes] = line.split(',');
                return {
                    id: Number(id),
                    date,
                    venue,
                    hours: Number(hours),
                    buyin: Number(buyin),
                    fee: Number(fee),
                    prize: Number(prize),
                    netProfit: Number(netProfit),
                    notes: notes || ''
                };
            });
    }

    // 轉換為 CSV
    toCSV() {
        const header = 'id,date,venue,hours,buyin,fee,prize,netProfit,notes\n';
        const rows = this.tournaments.map(t => 
            `${t.id},${t.date},${t.venue},${t.hours},${t.buyin},${t.fee},${t.prize},${t.netProfit},${t.notes}`
        ).join('\n');
        return header + rows;
    }

    // 保存資料
    saveData() {
        if (!this.currentUser) return;
        localStorage.setItem(`tournaments_${this.currentUser}`, JSON.stringify(this.tournaments));
    }

    // 修改 notifyDataChange
    notifyDataChange() {
        this.saveData();
        this.dataChangeCallbacks.forEach(callback => callback(this.tournaments));
    }

    // 添加數據變更時的回調函數
    onDataChange(callback) {
        this.dataChangeCallbacks.push(callback);
    }

    // 添加限時錦標賽記錄
    addTournament(tournament) {
        // 計算淨收益
        const totalCost = Number(tournament.buyin) + Number(tournament.fee);
        const netProfit = Number(tournament.prize) - totalCost;
        
        // 進一步簡化的記錄結構
        const newTournament = {
            id: Date.now(),
            date: tournament.date,
            venue: tournament.venue,
            hours: Number(tournament.hours),
            buyin: Number(tournament.buyin),
            fee: Number(tournament.fee),
            prize: Number(tournament.prize),
            netProfit: netProfit,
            notes: tournament.notes
        };
        
        this.tournaments.push(newTournament);
        this.notifyDataChange();
        
        return newTournament;
    }

    // 更新記錄
    updateTournament(id, updatedData) {
        const index = this.tournaments.findIndex(t => t.id === id);
        if (index !== -1) {
            // 更新記錄但保持ID不變
            const totalCost = Number(updatedData.buyin) + Number(updatedData.fee);
            const netProfit = Number(updatedData.prize) - totalCost;
            
            this.tournaments[index] = {
                ...this.tournaments[index],
                ...updatedData,
                netProfit: netProfit
            };
            
            this.notifyDataChange();
            return true;
        }
        return false;
    }

    // 刪除記錄
    deleteTournament(id) {
        const index = this.tournaments.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tournaments.splice(index, 1);
            this.notifyDataChange();
            return true;
        }
        return false;
    }

    // 獲取特定記錄
    getTournament(id) {
        return this.tournaments.find(t => t.id === id);
    }

    // 獲取所有記錄
    getAllTournaments() {
        return [...this.tournaments].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // 獲取常用比賽模板
    getTournamentTemplate(templateId) {
        const templates = {
            'standard': {
                venue: '市政華人',
                hours: 2,
                buyin: 3000,
                fee: 400
            }
        };
        
        return templates[templateId] || null;
    }

    // 計算統計數據
    getStatistics() {
        const totalTournaments = this.tournaments.length;
        if (totalTournaments === 0) {
            return {
                totalTournaments: 0,
                totalProfit: 0,
                avgProfit: 0,
                avgDuration: 0,
                profitByVenue: {}
            };
        }
        
        const totalProfit = this.tournaments.reduce((sum, t) => sum + t.netProfit, 0);
        const totalDuration = this.tournaments.reduce((sum, t) => sum + Number(t.hours), 0);
        const avgProfit = totalProfit / totalTournaments;
        const avgDuration = totalDuration / totalTournaments;
        
        // 按場地分析收益
        const profitByVenue = {};
        this.tournaments.forEach(t => {
            if (!profitByVenue[t.venue]) {
                profitByVenue[t.venue] = {
                    count: 0,
                    totalProfit: 0,
                    avgProfit: 0
                };
            }
            
            profitByVenue[t.venue].count++;
            profitByVenue[t.venue].totalProfit += t.netProfit;
        });
        
        // 計算每個場地的平均收益
        Object.keys(profitByVenue).forEach(venue => {
            profitByVenue[venue].avgProfit = 
                profitByVenue[venue].totalProfit / profitByVenue[venue].count;
        });
        
        return {
            totalTournaments,
            totalProfit,
            avgProfit,
            profitByVenue,
            avgDuration
        };
    }

    // 獲取趨勢數據
    getTrendData() {
        const sortedTournaments = [...this.tournaments]
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let cumulativeProfit = 0;
        return sortedTournaments.map(t => {
            cumulativeProfit += t.netProfit;
            return {
                date: t.date,
                profit: t.netProfit,
                cumulativeProfit
            };
        });
    }


} 