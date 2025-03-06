/**
 * Google Sheets 數據處理器
 * 負責與 Google Sheets API 交互，處理數據的讀寫操作
 */

class SheetsDataHandler {
    constructor() {
        // Google API 密鑰和客戶端ID (請在實際使用時替換為您自己的密鑰)
        this.API_KEY = 'AIzaSyB7N9GGxvuygTNecbNSNyx8c8nBfAOSawQ';
        this.CLIENT_ID = '164068284569-u8r2kn8fbnl6q9smfvrha993u08amth0.apps.googleusercontent.com';
        this.SPREADSHEET_ID = '1-oP77tYoRW8asjRIpAQNcJrylHqq5NVt3MUYfNYQ9DU';

        // API 作用域
        this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
        
        // 數據表格範圍
        this.USERS_RANGE = 'Users!A:B';
        this.TOURNAMENTS_RANGE_PREFIX = 'Tournaments_';
        
        // 初始化標記
        this.isInitialized = false;
        this.currentUser = null;
        
        // 初始化數據
        this.tournaments = [];
        
        // 註冊回調函數
        this.dataChangeCallbacks = [];
    }
    
    /**
     * 初始化 Google Sheets API
     */
    initSheetsAPI() {
        return new Promise((resolve, reject) => {
            gapi.load('client:auth2', () => {
                gapi.client.init({
                    apiKey: this.API_KEY,
                    clientId: this.CLIENT_ID,
                    scope: this.SCOPES,
                    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                }).then(() => {
                    // 檢查用戶是否已登入
                    if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
                        this.isInitialized = true;
                        console.log('Google Sheets API 已初始化並登入');
                        resolve(true);
                    } else {
                        console.log('Google Sheets API 已初始化，但未登入');
                        resolve(false);
                    }
                }).catch(error => {
                    console.error('Google Sheets API 初始化失敗:', error);
                    reject(error);
                });
            });
        });
    }
    
    /**
     * 用戶 Google 帳戶登入
     */
    signIn() {
        return gapi.auth2.getAuthInstance().signIn();
    }
    
    /**
     * 用戶 Google 帳戶登出
     */
    signOut() {
        return gapi.auth2.getAuthInstance().signOut();
    }
    
    /**
     * 檢查用戶是否存在
     * @param {string} username 用戶名
     */
    async checkUserExists(username) {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: this.USERS_RANGE
            });
            
            const users = response.result.values || [];
            return users.some(user => user[0] === username);
        } catch (error) {
            console.error('檢查用戶失敗:', error);
            return false;
        }
    }
    
    /**
     * 創建新用戶
     * @param {string} username 用戶名
     */
    async createUser(username) {
        try {
            // 確認用戶不存在
            const exists = await this.checkUserExists(username);
            if (exists) {
                return { success: false, message: '此用戶名已存在' };
            }
            
            // 添加用戶到用戶表
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SPREADSHEET_ID,
                range: this.USERS_RANGE,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [[username, new Date().toISOString()]]
                }
            });
            
            // 為用戶創建數據表格
            this.currentUser = username;
            return { success: true, message: '用戶創建成功' };
        } catch (error) {
            console.error('創建用戶失敗:', error);
            return { success: false, message: '創建用戶時出錯: ' + error.message };
        }
    }
    
    /**
     * 登入已有用戶
     * @param {string} username 用戶名
     */
    async loginUser(username) {
        try {
            // 確認用戶存在
            const exists = await this.checkUserExists(username);
            if (!exists) {
                return { success: false, message: '用戶名不存在' };
            }
            
            this.currentUser = username;
            await this.loadUserData(username);
            return { success: true, message: '登入成功' };
        } catch (error) {
            console.error('用戶登入失敗:', error);
            return { success: false, message: '登入用戶時出錯: ' + error.message };
        }
    }
    
    /**
     * 載入用戶資料
     * @param {string} username 用戶名
     */
    async loadUserData(username) {
        if (!this.isInitialized) {
            console.error('Google Sheets API 尚未初始化');
            return false;
        }
        
        try {
            const range = `${this.TOURNAMENTS_RANGE_PREFIX}${username}!A:K`;
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: range
            });
            
            const values = response.result.values || [];
            
            // 解析數據 (跳過標題行)
            if (values.length > 1) {
                this.tournaments = values.slice(1).map(row => ({
                    id: row[0],
                    date: row[1],
                    venue: row[2],
                    hours: Number(row[3]),
                    buyin: Number(row[4]),
                    fee: Number(row[5]),
                    prize: Number(row[6]),
                    netProfit: Number(row[7]),
                    startingChips: Number(row[8] || 0),
                    finalChips: Number(row[9] || 0),
                    notes: row[10] || ''
                }));
            } else {
                this.tournaments = [];
            }
            
            this.notifyDataChange();
            return true;
        } catch (error) {
            console.error('載入用戶數據失敗:', error);
            return false;
        }
    }
    
    /**
     * 保存錦標賽數據到 Google Sheets
     */
    async saveData() {
        if (!this.currentUser) return false;
        
        try {
            const range = `${this.TOURNAMENTS_RANGE_PREFIX}${this.currentUser}!A:K`;
            
            // 準備標題行和數據行
            const headerRow = [
                'ID', '日期', '場地', '時長', '買入', '行政費', 
                '獎金', '淨收益', '起始籌碼', '最終籌碼', '備註'
            ];
            
            const dataRows = this.tournaments.map(t => [
                t.id.toString(),
                t.date,
                t.venue,
                t.hours.toString(),
                t.buyin.toString(),
                t.fee.toString(),
                t.prize.toString(),
                t.netProfit.toString(),
                (t.startingChips || 0).toString(),
                (t.finalChips || 0).toString(),
                t.notes || ''
            ]);
            
            // 清除現有數據並寫入新數據
            await gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: this.SPREADSHEET_ID,
                range: range
            });
            
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.SPREADSHEET_ID,
                range: range,
                valueInputOption: 'RAW',
                resource: {
                    values: [headerRow, ...dataRows]
                }
            });
            
            return true;
        } catch (error) {
            console.error('保存數據失敗:', error);
            return false;
        }
    }
    
    /**
     * 通知數據變更
     */
    notifyDataChange() {
        this.saveData().then(success => {
            if (success) {
                this.dataChangeCallbacks.forEach(callback => callback(this.tournaments));
            }
        });
    }
    
    /**
     * 添加數據變更時的回調函數
     * @param {Function} callback 回調函數
     */
    onDataChange(callback) {
        this.dataChangeCallbacks.push(callback);
    }
    
    /**
     * 添加限時錦標賽記錄
     * @param {Object} tournament 錦標賽數據
     */
    addTournament(tournament) {
        // 計算淨收益
        const totalCost = Number(tournament.buyin) + Number(tournament.fee);
        const netProfit = Number(tournament.prize) - totalCost;
        
        // 建立新記錄
        const newTournament = {
            id: Date.now(),
            date: tournament.date,
            venue: tournament.venue,
            hours: Number(tournament.hours),
            buyin: Number(tournament.buyin),
            fee: Number(tournament.fee),
            prize: Number(tournament.prize),
            netProfit: netProfit,
            startingChips: Number(tournament.startingChips) || 0,
            finalChips: Number(tournament.finalChips) || 0,
            notes: tournament.notes
        };
        
        this.tournaments.push(newTournament);
        this.notifyDataChange();
        
        return newTournament;
    }
    
    /**
     * 更新記錄
     * @param {string} id 記錄ID
     * @param {Object} updatedData 更新的數據
     */
    updateTournament(id, updatedData) {
        const index = this.tournaments.findIndex(t => t.id === id);
        if (index !== -1) {
            // 更新記錄但保持ID不變
            const totalCost = Number(updatedData.buyin) + Number(updatedData.fee);
            const netProfit = Number(updatedData.prize) - totalCost;
            
            this.tournaments[index] = {
                ...this.tournaments[index],
                ...updatedData,
                netProfit: netProfit,
                startingChips: Number(updatedData.startingChips) || 0,
                finalChips: Number(updatedData.finalChips) || 0
            };
            
            this.notifyDataChange();
            return true;
        }
        return false;
    }
    
    /**
     * 刪除記錄
     * @param {string} id 記錄ID
     */
    deleteTournament(id) {
        const index = this.tournaments.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tournaments.splice(index, 1);
            this.notifyDataChange();
            return true;
        }
        return false;
    }
    
    /**
     * 獲取特定記錄
     * @param {string} id 記錄ID
     */
    getTournament(id) {
        return this.tournaments.find(t => t.id === id);
    }
    
    /**
     * 獲取所有記錄
     */
    getAllTournaments() {
        return [...this.tournaments].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    /**
     * 計算統計數據
     */
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
    
    /**
     * 獲取趨勢數據
     */
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