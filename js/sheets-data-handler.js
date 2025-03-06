/**
 * SheetDB 數據處理器
 * 負責與 SheetDB API 交互，處理數據的讀寫操作
 */

class SheetsDataHandler {
    constructor() {
        // SheetDB API 配置 (請替換為您的 SheetDB API URL)
        this.SHEETDB_API_URL = 'https://sheetdb.io/api/v1/qlf9v7mpcmtfw';
        
        // 數據表格範圍（僅使用 Users 表）
        this.USERS_RANGE = 'Users';
        
        // 初始化標記
        this.isInitialized = true;
        this.currentUser = null;
        
        // 初始化數據
        this.tournaments = [];
        
        // 註冊回調函數
        this.dataChangeCallbacks = [];
    }
    
    /**
     * 初始化 SheetDB API
     */
    initSheetsAPI() {
        console.log('使用 SheetDB API');
            return Promise.resolve(true);
    }
    
    /**
     * 檢查用戶是否存在
     * @param {string} username - 用戶名
     * @returns {Promise<Array|null>} 用戶數據數組或 null
     */
    async checkUserExists(username) {
        try {
            const response = await fetch(`${this.SHEETDB_API_URL}/search?username=${encodeURIComponent(username)}`);
            
            if (!response.ok) {
                console.error(`檢查用戶存在性失敗 (${response.status}):`, await response.text());
                return null;
            }
            
            const userData = await response.json();
            return userData;
            } catch (error) {
            console.error('檢查用戶存在性時出錯:', error);
            return null;
        }
    }
    
    /**
     * 創建用戶
     * @param {string} username - 用戶名
     * @returns {Promise<Object>} 結果對象
     */
    async createUser(username) {
        try {
            console.log(`正在創建用戶: ${username}`);
            
            // 嘗試創建用戶
            const response = await fetch(`${this.SHEETDB_API_URL}`, {
                    method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                    body: JSON.stringify({ 
                    username: username,
                    tournaments: '[]'
                    })
                });
                
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`創建用戶失敗 (${response.status}):`, errorText);
                return { success: false, message: `創建用戶失敗: ${errorText}` };
            }
            
            const result = await response.text();
            console.log(`創建用戶成功:`, result);
            
            // 初始化空數據
            this.tournaments = [];
            this.nextId = 1;
            this.currentUser = username;
            
            return { success: true };
        } catch (error) {
            console.error('創建用戶時出錯:', error);
            return { success: false, message: `創建用戶時出錯: ${error.message}` };
        }
    }
    
    /**
     * 登入用戶
     * @param {string} username - 用戶名
     * @returns {Promise<Object>} 結果對象
     */
    async loginUser(username) {
        try {
            console.log('正在嘗試登入用戶:', username);
            
            // 獲取工作表列表
            const sheetsListResponse = await fetch(`${this.SHEETDB_API_URL}`);
            if (!sheetsListResponse.ok) {
                return { success: false, message: `獲取工作表列表失敗: ${await sheetsListResponse.text()}` };
            }
            const sheetsList = await sheetsListResponse.json();
            console.log('可用工作表列表:', sheetsList);
            
            // 檢查用戶是否存在
            const userExistsResult = await this.checkUserExists(username);
            console.log('檢查用戶結果:', userExistsResult);
            
            if (!userExistsResult || userExistsResult.length === 0) {
                console.log('用戶不存在，將創建新用戶');
                // 創建用戶
                const createResult = await this.createUser(username);
                if (!createResult.success) {
                    return { success: false, message: `創建用戶失敗: ${createResult.message}` };
                }
            } else {
                console.log('用戶存在，正在加載數據...');
            }
            
            // 加載用戶數據
            const loadResult = await this.loadData(username);
            if (!loadResult.success) {
                console.error('加載用戶數據失敗:', loadResult.message);
                // 即使加載失敗，我們也不阻止登入
                this.tournaments = [];
                this.nextId = 1;
            }
            
            this.currentUser = username;
            
            // 通知數據變化
            this.notifyDataChange();
            
            return { success: true, message: '登入成功' };
        } catch (error) {
            console.error('登入用戶時出錯:', error);
            return { success: false, message: `登入時出錯: ${error.message}` };
        }
    }
    
    /**
     * 載入用戶數據
     * @param {string} username - 用戶名
     * @returns {Promise<Object>} 結果對象
     */
    async loadData(username) {
        try {
            console.log(`正在嘗試加載用戶 ${username} 的數據...`);
            this.currentUser = username;
            
            // 獲取所有工作表
            const sheetsListResponse = await fetch(this.SHEETDB_API_URL);
            if (!sheetsListResponse.ok) {
                return { 
                    success: false, 
                    message: `獲取工作表列表失敗: ${await sheetsListResponse.text()}` 
                };
            }
            
            const sheetsList = await sheetsListResponse.json();
            console.log('可用工作表列表:', sheetsList);
            
            // 嘗試從 Users 工作表載入數據
            let userData = null;
            try {
                console.log(`嘗試從 Users 工作表載入用戶 ${username} 的數據...`);
                const usersResponse = await fetch(`${this.SHEETDB_API_URL}/search?username=${username}`);
                
                if (!usersResponse.ok) {
                    return { 
                        success: false, 
                        message: `從 Users 表獲取數據失敗: ${await usersResponse.text()}` 
                    };
                }
                
                const usersData = await usersResponse.json();
                console.log('已找到用戶數據:', usersData);
                
                if (usersData && usersData.length > 0) {
                    userData = usersData[0];
                } else {
                    return { success: false, message: '用戶不存在' };
                }
            } catch (error) {
                console.error(`從 Users 工作表載入數據時出錯:`, error);
                return { success: false, message: `載入數據時出錯: ${error.message}` };
            }
            
            // 解析錦標賽數據
            try {
                if (userData && userData.tournaments) {
                    let tournamentsData = [];
                    
                    // 嘗試解析 JSON
                    if (typeof userData.tournaments === 'string') {
                        tournamentsData = JSON.parse(userData.tournaments);
                    } else if (Array.isArray(userData.tournaments)) {
                        tournamentsData = userData.tournaments;
                    }
                    
                    console.log(`成功解析 ${tournamentsData.length} 條錦標賽記錄`);
                    
                    // 轉換數據格式
                    this.tournaments = this.convertTournamentFormat(tournamentsData);
                    console.log(`成功處理 ${this.tournaments.length} 條有效記錄`);
                    
                    // 設置下一個 ID
                    if (this.tournaments.length > 0) {
                        const ids = this.tournaments.map(t => t.id).filter(id => !isNaN(parseInt(id)));
                        this.nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
            } else {
                        this.nextId = 1;
                    }
                    
                    return { success: true };
                } else {
                    console.log('用戶沒有錦標賽數據，使用空數組');
                    this.tournaments = [];
                    this.nextId = 1;
                    return { success: true };
                }
            } catch (error) {
                console.error('解析錦標賽數據時出錯:', error);
                this.tournaments = [];
                this.nextId = 1;
                return { success: false, message: `解析錦標賽數據時出錯: ${error.message}` };
            }
        } catch (error) {
            console.error('載入數據時出錯:', error);
            return { success: false, message: `載入數據時出錯: ${error.message}` };
        }
    }
    
    /**
     * 轉換錦標賽數據格式
     * @param {Array} tournaments - 舊格式的錦標賽數據數組
     * @returns {Array} 新格式的錦標賽數據數組
     */
    convertTournamentFormat(tournaments) {
        if (!tournaments || !Array.isArray(tournaments)) {
            console.warn('沒有錦標賽數據可轉換');
            return [];
        }
        
        const convertedTournaments = [];
        
        tournaments.forEach(tournament => {
            try {
                // 檢測數據格式
                const isOldFormat = tournament.hasOwnProperty('buyin') || 
                                   tournament.hasOwnProperty('fee') || 
                                   tournament.hasOwnProperty('netProfit');
                
                if (isOldFormat) {
                    console.log(`轉換舊格式錦標賽數據:`, tournament);
                    
                    // 從舊格式轉換為新格式
                    const convertedTournament = {
                        id: tournament.id || Date.now(),
                        date: tournament.date || new Date().toISOString().split('T')[0],
                        name: tournament.name || `錦標賽 ${tournament.id || ''}`,
                        buyinAmount: parseFloat(tournament.buyin) || 0,
                        addonAmount: parseFloat(tournament.fee) || 0,
                        prizeAmount: parseFloat(tournament.prize) || 0
                    };
                    
                    // 如果有淨利潤但沒有獎金，嘗試計算獎金
                    if (tournament.netProfit !== null && tournament.netProfit !== undefined && 
                        (tournament.prize === null || tournament.prize === undefined)) {
                        const netProfit = parseFloat(tournament.netProfit) || 0;
                        const buyin = parseFloat(tournament.buyin) || 0;
                        const fee = parseFloat(tournament.fee) || 0;
                        convertedTournament.prizeAmount = netProfit + buyin + fee;
                    }
                    
                    convertedTournaments.push(convertedTournament);
                } else {
                    // 已經是新格式，直接添加
                    convertedTournaments.push(tournament);
                }
            } catch (error) {
                console.error('轉換錦標賽數據時出錯:', error, tournament);
            }
        });
        
        console.log(`轉換後的錦標賽數據:`, convertedTournaments);
        return convertedTournaments;
    }
    
    /**
     * 保存數據到 SheetDB
     * @returns {Promise<Object>} 結果對象
     */
    async saveData() {
        try {
            console.log('正在保存數據到 SheetDB...');
            
            if (!this.currentUser) {
                return { success: false, message: '沒有當前用戶，無法保存數據' };
            }
            
            // 先檢查用戶是否存在
            const userExistsResult = await this.checkUserExists(this.currentUser);
            const userExists = userExistsResult && userExistsResult.length > 0;
            
            // 準備數據
            const tournamentData = JSON.stringify(this.tournaments);
            console.log(`序列化後的錦標賽數據 (${tournamentData.length} 字符)`, 
                        tournamentData.length > 100 ? tournamentData.substring(0, 100) + '...' : tournamentData);
            
            // 更新或創建用戶數據
            let saveResponse;
            
            if (userExists) {
                // 更新現有用戶
                console.log(`用戶 ${this.currentUser} 存在，更新數據...`);
                saveResponse = await fetch(`${this.SHEETDB_API_URL}/username/${encodeURIComponent(this.currentUser)}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        tournaments: tournamentData
                    })
                });
            } else {
                // 創建新用戶
                console.log(`用戶 ${this.currentUser} 不存在，創建新用戶...`);
                saveResponse = await fetch(`${this.SHEETDB_API_URL}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: this.currentUser,
                        tournaments: tournamentData
                    })
                });
            }
            
            // 檢查響應
            if (!saveResponse.ok) {
                const errorText = await saveResponse.text();
                console.error(`保存數據失敗 (${saveResponse.status}):`, errorText);
                return { success: false, message: `保存數據失敗: ${errorText}` };
            }
            
            const saveResult = await saveResponse.text();
            console.log(`保存數據成功:`, saveResult);
            
            // 通知數據變化，觸發圖表更新
            this.notifyDataChange();
            
            // 額外嘗試在不同位置觸發圖表更新
            if (typeof chartManager !== 'undefined' && chartManager) {
                try {
                    console.log('直接更新圖表...');
                    chartManager.updateAllCharts();
                } catch (chartError) {
                    console.warn('更新圖表失敗，但數據已保存:', chartError);
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error('保存數據時出錯:', error);
            return { success: false, message: `保存數據時出錯: ${error.message}` };
        }
    }
    
    // 添加數據變更時的回調函數
    onDataChange(callback) {
        this.dataChangeCallbacks.push(callback);
    }
    
    // 通知數據變更
    notifyDataChange() {
        this.dataChangeCallbacks.forEach(callback => callback(this.tournaments));
    }
    
    /**
     * 添加錦標賽記錄
     * @param {Object} tournament - 錦標賽數據
     * @returns {Promise<Object>} 結果對象
     */
    async addTournament(tournament) {
        try {
            console.log('添加錦標賽記錄:', tournament);
            
            if (!this.currentUser) {
                return { success: false, message: '沒有當前用戶，無法添加記錄' };
            }
            
            // 產生唯一 ID - 使用時間戳加隨機數
            const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
            
            // 設置 ID
            const newTournament = {
                ...tournament,
                id: uniqueId
            };
            
            console.log(`創建新錦標賽記錄，ID: ${uniqueId}`);
            
            // 添加到數組
            this.tournaments.push(newTournament);
            console.log(`已添加錦標賽記錄，當前共有 ${this.tournaments.length} 條記錄`);
            
            // 保存到 SheetDB
            const saveResult = await this.saveData();
            if (!saveResult.success) {
                // 如果保存失敗，從數組中移除
                const index = this.tournaments.findIndex(t => t.id === uniqueId);
                if (index !== -1) {
                    this.tournaments.splice(index, 1);
                }
                return { success: false, message: saveResult.message };
            }
            
            // 確保圖表更新
            if (typeof chartManager !== 'undefined' && chartManager) {
                try {
                    console.log('添加記錄後更新圖表...');
                    chartManager.updateAllCharts();
                } catch (chartError) {
                    console.warn('更新圖表失敗，但記錄已添加:', chartError);
                }
            }
            
            // 通知數據變化
            this.notifyDataChange();
            
            // 返回成功結果和新記錄的 ID
            return { success: true, id: uniqueId };
        } catch (error) {
            console.error('添加錦標賽記錄時出錯:', error);
            return { success: false, message: `添加錦標賽記錄時出錯: ${error.message}` };
        }
    }
    
    /**
     * 更新錦標賽記錄
     * @param {string|number} id - 錦標賽ID
     * @param {Object} updatedData - 更新的數據
     * @returns {Promise<Object>} 結果對象
     */
    async updateTournament(id, updatedData) {
        try {
            console.log(`正在嘗試更新 ID 為 ${id} 的錦標賽記錄，類型: ${typeof id}`, updatedData);
            
            if (!this.currentUser) {
                console.error('沒有當前用戶，無法更新記錄');
                return { success: false, message: '沒有當前用戶，無法更新記錄' };
            }
            
            if (!id) {
                console.error('沒有提供 ID，無法更新記錄');
                return { success: false, message: '沒有提供 ID，無法更新記錄' };
            }
            
            // 確保 ID 可以比較 - 有可能是字符串或數字
            const targetId = String(id);
            
            // 顯示當前所有錦標賽 ID 用於調試
            const tournamentIds = this.tournaments.map(t => ({
                id: t.id,
                idType: typeof t.id,
                stringId: String(t.id)
            }));
            console.log(`當前有 ${this.tournaments.length} 條記錄，ID 列表:`, tournamentIds);
            
            // 查找匹配的錦標賽記錄索引
            const index = this.tournaments.findIndex(t => String(t.id) === targetId);
            
            if (index === -1) {
                console.error(`找不到 ID 為 ${targetId} 的錦標賽記錄`);
                return { success: false, message: '找不到指定的錦標賽記錄' };
            }
            
            // 保存原來的記錄用於恢復
            const originalTournament = { ...this.tournaments[index] };
            console.log(`找到要更新的記錄 (索引: ${index}):`, originalTournament);
            
            // 更新記錄，保留 ID
            this.tournaments[index] = {
                ...updatedData,
                id: originalTournament.id // 保留原 ID
            };
            
            console.log(`已在內存中更新 ID 為 ${targetId} 的錦標賽記錄:`, this.tournaments[index]);
            
            // 保存更改
            const saveResult = await this.saveData();
            if (!saveResult.success) {
                console.error('保存更改失敗:', saveResult.message);
                
                // 嘗試恢復更新的記錄
                this.tournaments[index] = originalTournament;
                console.log('已恢復更新前的記錄');
                
                return { success: false, message: `更新記錄失敗: ${saveResult.message}` };
            }
            
            // 通知數據變化
            this.notifyDataChange();
            console.log('更新操作完成並已通知數據變化');
            
            return { success: true };
        } catch (error) {
            console.error('更新錦標賽記錄時出錯:', error);
            return { success: false, message: `更新錦標賽記錄時出錯: ${error.message}` };
        }
    }
    
    /**
     * 刪除錦標賽記錄
     * @param {string|number} id - 錦標賽ID
     * @returns {Promise<Object>} 結果對象
     */
    async deleteTournament(id) {
        try {
            console.log(`正在嘗試刪除 ID 為 ${id} 的錦標賽記錄，類型: ${typeof id}`);
            
            if (!this.currentUser) {
                console.error('沒有當前用戶，無法刪除記錄');
                return { success: false, message: '沒有當前用戶，無法刪除記錄' };
            }
            
            if (!id) {
                console.error('沒有提供 ID，無法刪除記錄');
                return { success: false, message: '沒有提供 ID，無法刪除記錄' };
            }
            
            // 確保 ID 可以比較 - 有可能是字符串或數字
            const targetId = String(id);
            
            // 顯示當前所有錦標賽 ID
            const tournamentIds = this.tournaments.map(t => ({
                id: t.id,
                idType: typeof t.id,
                stringId: String(t.id)
            }));
            console.log(`當前有 ${this.tournaments.length} 條記錄，ID 列表:`, tournamentIds);
            
            // 查找匹配的錦標賽記錄索引
            const index = this.tournaments.findIndex(t => String(t.id) === targetId);
            
            if (index === -1) {
                console.error(`找不到 ID 為 ${targetId} 的錦標賽記錄`);
                return { success: false, message: '找不到指定的錦標賽記錄' };
            }
            
            // 保存要刪除的記錄用於日誌輸出
            const deletingTournament = this.tournaments[index];
            console.log(`找到要刪除的記錄:`, deletingTournament);
            
            // 從數組中刪除
            this.tournaments.splice(index, 1);
            console.log(`已從內存中刪除 ID 為 ${targetId} 的錦標賽記錄，剩餘 ${this.tournaments.length} 條記錄`);
            
            // 保存更改
            const saveResult = await this.saveData();
            if (!saveResult.success) {
                console.error('保存更改失敗:', saveResult.message);
                
                // 嘗試恢復刪除的記錄
                this.tournaments.splice(index, 0, deletingTournament);
                console.log('已恢復刪除的記錄');
                
                return { success: false, message: `刪除記錄失敗: ${saveResult.message}` };
            }
            
            // 通知數據變化
            this.notifyDataChange();
            console.log('刪除操作完成並已通知數據變化');
            
            return { success: true };
        } catch (error) {
            console.error('刪除錦標賽記錄時出錯:', error);
            return { success: false, message: `刪除錦標賽記錄時出錯: ${error.message}` };
        }
    }
    
    /**
     * 獲取特定錦標賽數據
     * @param {string|number} id - 錦標賽ID
     * @returns {Promise<Object|null>} 錦標賽數據對象或 null
     */
    async getTournament(id) {
        try {
            console.log(`嘗試獲取 ID 為 ${id} 的錦標賽記錄，類型: ${typeof id}，tournaments 長度: ${this.tournaments.length}`);
            
            // 如果沒有 ID 或 tournaments 為空，直接返回 null
            if (!id || !this.tournaments || this.tournaments.length === 0) {
                console.warn(`無法獲取錦標賽：ID 無效或沒有記錄`);
                return null;
            }
            
            // 確保 ID 可以比較 - 有可能是字符串或數字
            const targetId = String(id);
            
            // 輸出所有錦標賽的 ID 用於調試
            const tournamentIds = this.tournaments.map(t => ({
                id: t.id,
                idType: typeof t.id,
                stringId: String(t.id)
            }));
            console.log('可用的錦標賽 ID:', tournamentIds);
            
            // 查找匹配的錦標賽記錄
            const tournament = this.tournaments.find(t => String(t.id) === targetId);
            
            if (!tournament) {
                console.warn(`找不到 ID 為 "${targetId}" 的錦標賽記錄`);
                return null;
            }
            
            console.log(`找到 ID 為 "${targetId}" 的錦標賽記錄:`, tournament);
            return tournament;
        } catch (error) {
            console.error(`獲取錦標賽數據時出錯 (ID: ${id}):`, error);
            return null;
        }
    }
    
    /**
     * 獲取所有記錄
     */
    getAllTournaments() {
        return [...this.tournaments].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    /**
     * 獲取統計數據
     * @returns {Object} 統計數據對象
     */
    getStatistics() {
        try {
            const tournaments = this.getAllTournaments();
            
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
    
    /**
     * 獲取常用比賽模板
     * @param {string} templateId 模板 ID
     * @returns {object} 模板數據
     */
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
    
    /**
     * 獲取 Users 表格的所有列標題
     * @returns {Promise<Array>} 列標題陣列
     */
    async getUsersTableHeaders() {
        try {
            console.log('嘗試獲取 Users 表格的列標題...');
            
            // 首先確認 Users 表格存在
            const sheetsResponse = await fetch(`${this.SHEETDB_API_URL}/sheets`);
            if (!sheetsResponse.ok) {
                throw new Error(`獲取工作表列表失敗: ${sheetsResponse.status}`);
            }
            
            const sheetsData = await sheetsResponse.json();
            console.log('可用工作表列表:', sheetsData);
            
            if (!sheetsData.sheets || !sheetsData.sheets.includes('Users')) {
                throw new Error('Users 工作表不存在');
            }
            
            // 獲取 Users 表格的資料
            const usersResponse = await fetch(`${this.SHEETDB_API_URL}?sheet=Users&limit=1`);
            if (!usersResponse.ok) {
                throw new Error(`獲取 Users 表格資料失敗: ${usersResponse.status}`);
            }
            
            const usersData = await usersResponse.json();
            console.log('Users 表格資料樣本:', usersData);
            
            if (usersData.length === 0) {
                // 如果表格為空，嘗試獲取標題信息
                try {
                    const infoResponse = await fetch(`${this.SHEETDB_API_URL}/info?sheet=Users`);
                    if (infoResponse.ok) {
                        const infoData = await infoResponse.json();
                        console.log('Users 表格信息:', infoData);
                        
                        if (infoData && infoData.name === 'Users' && infoData.columns) {
                            return infoData.columns;
                        }
                    }
                } catch (infoError) {
                    console.error('獲取表格信息失敗:', infoError);
                }
                
                // 如果無法透過 API 獲取，返回預設值
                return ['username', 'tournaments'];
            }
            
            // 從數據中提取列標題
            const headers = Object.keys(usersData[0]);
            return headers;
        } catch (error) {
            console.error('獲取 Users 表格列標題失敗:', error);
            return [];
        }
    }
} 