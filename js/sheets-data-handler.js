/**
 * SheetDB 數據處理器
 * 負責與 SheetDB API 交互，處理數據的讀寫操作
 */

class SheetsDataHandler {
    constructor() {
        // SheetDB API 配置 (請替換為您的 SheetDB API URL)
        this.SHEETDB_API_URL = 'https://sheetdb.io/api/v1/vdz7p5djj0n9g';
        
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
     * @param {string} username 用戶名
     */
    async checkUserExists(username) {
        try {
            // 透過 SheetDB 獲取用戶列表
            const response = await fetch(`${this.SHEETDB_API_URL}/search?sheet=Users&username=${encodeURIComponent(username)}`);
            if (!response.ok) {
                throw new Error(`SheetDB 響應錯誤: ${response.status}`);
            }
            const userData = await response.json();
            return userData.length > 0;
        } catch (error) {
            console.error('透過 SheetDB 檢查用戶失敗:', error);
            throw error;
        }
    }
    
    /**
     * 創建新用戶
     * @param {string} username 用戶名
     */
    async createUser(username) {
        try {
            console.log(`嘗試創建用戶: ${username}`);
            
            // 1. 檢查 Users 工作表是否存在
            try {
                const sheetsResponse = await fetch(`${this.SHEETDB_API_URL}/sheets`);
                if (sheetsResponse.ok) {
                    const sheetsData = await sheetsResponse.json();
                    console.log('可用工作表列表:', sheetsData);
                    
                    // 如果 Users 工作表不存在，嘗試創建
                    if (!sheetsData.sheets || !sheetsData.sheets.includes('Users')) {
                        console.log('Users 工作表不存在，將創建一個...');
                        
                        const createUsersResponse = await fetch(`${this.SHEETDB_API_URL}/sheet`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: 'Users',
                                first_row: ["username", "tournaments"]
                            })
                        });
                        
                        const usersResponseText = await createUsersResponse.text();
                        console.log(`創建 Users 工作表響應 (${createUsersResponse.status}):`, usersResponseText);
                    }
                }
            } catch (sheetsError) {
                console.error('檢查工作表列表失敗:', sheetsError);
            }
            
            // 2. 檢查用戶是否已存在
            try {
                const checkResponse = await fetch(`${this.SHEETDB_API_URL}/search?sheet=Users&username=${encodeURIComponent(username)}`);
                if (checkResponse.ok) {
                    const userData = await checkResponse.json();
                    console.log('檢查用戶結果:', userData);
                    
                    if (userData.length > 0) {
                        console.log('用戶已存在');
                        return { success: false, message: '用戶名已存在' };
                    }
                } else {
                    console.warn('檢查用戶時 API 錯誤:', await checkResponse.text());
                }
            } catch (checkError) {
                console.error('檢查用戶存在性失敗:', checkError);
                // 繼續嘗試創建用戶
            }
            
            // 3. 創建用戶 (嘗試兩種方式)
            let userCreated = false;
            
            // 方式 1: 使用 ?sheet= 參數
            try {
                console.log('嘗試創建用戶 (方式 1)...');
                const createResponse1 = await fetch(`${this.SHEETDB_API_URL}?sheet=Users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        data: [{
                            username: username,
                            tournaments: JSON.stringify([])
                        }]
                    })
                });
                
                const responseText1 = await createResponse1.text();
                console.log(`創建用戶響應 1 (${createResponse1.status}):`, responseText1);
                
                if (createResponse1.ok) {
                    console.log('用戶創建成功 (方式 1)!');
                    userCreated = true;
                }
            } catch (error1) {
                console.error('創建用戶方式 1 失敗:', error1);
            }
            
            // 方式 2: 如果方式 1 失敗，嘗試使用 body 中的 sheet 參數
            if (!userCreated) {
                try {
                    console.log('嘗試創建用戶 (方式 2)...');
                    const createResponse2 = await fetch(`${this.SHEETDB_API_URL}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            sheet: 'Users',
                            data: [{
                                username: username,
                                tournaments: JSON.stringify([])
                            }]
                        })
                    });
                    
                    const responseText2 = await createResponse2.text();
                    console.log(`創建用戶響應 2 (${createResponse2.status}):`, responseText2);
                    
                    if (createResponse2.ok) {
                        console.log('用戶創建成功 (方式 2)!');
                        userCreated = true;
                    } else {
                        console.error('創建用戶方式 2 失敗，HTTP 狀態:', createResponse2.status);
                    }
                } catch (error2) {
                    console.error('創建用戶方式 2 失敗:', error2);
                }
            }
            
            // 如果兩種方式都失敗，返回錯誤
            if (!userCreated) {
                console.error('兩種創建用戶方式都失敗');
                return { success: false, message: '無法創建用戶，請檢查 API 配置和工作表權限' };
            }
            
            // 設置當前用戶並返回成功
            this.currentUser = username;
            this.tournaments = [];
            return { success: true };
        } catch (error) {
            console.error('創建用戶失敗:', error);
            return { success: false, message: '創建用戶時發生錯誤: ' + error.message };
        }
    }
    
    /**
     * 用戶登入
     * @param {string} username 用戶名
     */
    async loginUser(username) {
        try {
            console.log(`正在嘗試登入用戶: ${username}`);
            
            // 檢查 Users 工作表是否存在
            try {
                const sheetsResponse = await fetch(`${this.SHEETDB_API_URL}/sheets`);
                if (sheetsResponse.ok) {
                    const sheetsData = await sheetsResponse.json();
                    console.log('可用工作表列表:', sheetsData);
                    
                    // 如果 Users 工作表不存在，嘗試創建
                    if (!sheetsData.sheets || !sheetsData.sheets.includes('Users')) {
                        console.log('Users 工作表不存在，將創建一個...');
                        
                        const createResponse = await fetch(`${this.SHEETDB_API_URL}/sheet`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: 'Users',
                                first_row: ["username", "tournaments"]
                            })
                        });
                        
                        const usersSheetText = await createResponse.text();
                        console.log(`創建 Users 工作表響應:`, usersSheetText);
                    }
                }
            } catch (sheetsError) {
                console.error('獲取工作表列表出錯:', sheetsError);
            }
            
            // 檢查用戶是否存在
            try {
                const checkResponse = await fetch(`${this.SHEETDB_API_URL}/search?sheet=Users&username=${encodeURIComponent(username)}`);
                if (checkResponse.ok) {
                    const userData = await checkResponse.json();
                    console.log('檢查用戶結果:', userData);
                    
                    if (userData.length === 0) {
                        // 用戶不存在，自動創建該用戶
                        console.log(`用戶 ${username} 不存在，嘗試自動創建...`);
                        const createResult = await this.createUser(username);
                        if (!createResult.success) {
                            return { success: false, message: `無法創建用戶: ${createResult.message}` };
                        }
                        
                        console.log(`用戶 ${username} 已自動創建`);
                    }
                } else {
                    console.warn('檢查用戶時 API 錯誤:', await checkResponse.text());
                    // 繼續嘗試加載數據
                }
            } catch (checkError) {
                console.error('檢查用戶存在性失敗:', checkError);
                // 繼續嘗試加載數據
            }
            
            console.log('用戶存在，正在加載數據...');
            
            // 嘗試加載用戶數據
            try {
                await this.loadData(username);
            } catch (dataError) {
                console.error('加載用戶數據失敗，但仍會繼續登入:', dataError);
                // 數據加載失敗不影響登入，可能是新用戶或數據表格未創建
                this.tournaments = [];
            }
            
            this.currentUser = username;
            return { success: true };
        } catch (error) {
            console.error('用戶登入失敗:', error);
            return { success: false, message: '登入時發生錯誤: ' + error.message };
        }
    }
    
    /**
     * 加載用戶數據
     * @param {string} username 用戶名
     */
    async loadData(username) {
        try {
            console.log(`正在嘗試加載用戶 ${username} 的數據...`);
            
            // 檢查 Users 工作表是否存在
            try {
                const sheetsResponse = await fetch(`${this.SHEETDB_API_URL}/sheets`);
                if (sheetsResponse.ok) {
                    const sheetsData = await sheetsResponse.json();
                    console.log('可用工作表列表:', sheetsData);
                    
                    // 如果 Users 工作表不存在，嘗試創建
                    if (!sheetsData.sheets || !sheetsData.sheets.includes('Users')) {
                        console.log('Users 工作表不存在，將創建一個...');
                        
                        const createUsersResponse = await fetch(`${this.SHEETDB_API_URL}/sheet`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: 'Users',
                                first_row: ["username", "tournaments"]
                            })
                        });
                        
                        const usersResponseText = await createUsersResponse.text();
                        console.log(`創建 Users 工作表響應 (${createUsersResponse.status}):`, usersResponseText);
                        
                        // 新創建的工作表沒有數據，設置為空陣列
                        this.tournaments = [];
                        return true;
                    }
                }
            } catch (sheetsError) {
                console.error('獲取工作表列表失敗:', sheetsError);
                // 繼續嘗試載入數據
            }
            
            // 嘗試載入用戶數據
            let dataLoaded = false;
            
            try {
                console.log(`嘗試從 Users 工作表載入用戶 ${username} 的數據...`);
                const response = await fetch(`${this.SHEETDB_API_URL}/search?sheet=Users&username=${encodeURIComponent(username)}`);
                
                if (response.ok) {
                    const userData = await response.json();
                    console.log(`已找到用戶數據:`, userData);
                    
                    if (userData.length > 0) {
                        // 用戶存在，嘗試解析錦標賽數據
                        const user = userData[0];
                        let tournamentsData = [];
                        
                        if (user.tournaments) {
                            try {
                                // 嘗試解析存儲的 JSON 數據
                                tournamentsData = JSON.parse(user.tournaments);
                                console.log(`成功解析 ${tournamentsData.length} 條錦標賽記錄`);
                            } catch (parseError) {
                                console.error('解析錦標賽數據失敗:', parseError);
                                tournamentsData = [];
                            }
                        }
                        
                        // 轉換數據格式並過濾無效數據
                        this.tournaments = tournamentsData
                            .filter(item => item && item.id) // 過濾有效記錄
                            .map(item => ({
                                id: Number(item.id || 0),
                                date: item.date || '',
                                venue: item.venue || '',
                                hours: Number(item.hours || 0),
                                buyin: Number(item.buyin || 0),
                                fee: Number(item.fee || 0),
                                prize: Number(item.prize || 0),
                                netProfit: Number(item.netProfit || 0),
                                notes: item.notes || ''
                            }));
                        
                        console.log(`成功處理 ${this.tournaments.length} 條有效記錄`);
                        dataLoaded = true;
                    } else {
                        console.log('未找到用戶，將嘗試創建');
                        await this.createUser(username);
                        this.tournaments = [];
                        dataLoaded = true;
                    }
                } else {
                    console.warn('加載用戶數據時 API 錯誤:', await response.text());
                }
            } catch (error) {
                console.error('載入用戶數據失敗:', error);
            }
            
            // 如果無法載入數據，使用空陣列
            if (!dataLoaded) {
                console.log('無法載入數據，使用空陣列');
                this.tournaments = [];
            }
            
            this.notifyDataChange();
            return true;
        } catch (error) {
            console.error('加載用戶數據失敗:', error);
            // 即使加載失敗，也設置為空陣列
            this.tournaments = [];
            return false;
        }
    }
    
    /**
     * 保存所有數據到 SheetDB
     */
    async saveData() {
        if (!this.currentUser) {
            console.error('未登入用戶，無法保存數據');
            return false;
        }
        
        try {
            console.log(`正在保存 ${this.tournaments.length} 條記錄到用戶 ${this.currentUser} 的數據...`);
            
            // 檢查用戶是否存在
            const userSearchResponse = await fetch(`${this.SHEETDB_API_URL}/search?sheet=Users&username=${encodeURIComponent(this.currentUser)}`);
            if (!userSearchResponse.ok) {
                console.error('檢查用戶存在性失敗:', await userSearchResponse.text());
                return false;
            }
            
            const userData = await userSearchResponse.json();
            if (userData.length === 0) {
                console.error('用戶不存在，無法保存數據');
                return false;
            }
            
            // 將錦標賽數據轉換為 JSON 字符串
            const tournamentJson = JSON.stringify(this.tournaments);
            console.log(`已將 ${this.tournaments.length} 條記錄序列化為 JSON`);
            
            // 更新用戶的錦標賽數據
            const updateData = {
                tournaments: tournamentJson
            };
            
            // 嘗試兩種方式更新數據
            let dataUpdated = false;
            
            // 方式 1: 使用 URL 查詢參數
            try {
                console.log('嘗試更新數據 (方式 1)...');
                const response1 = await fetch(`${this.SHEETDB_API_URL}/username/${encodeURIComponent(this.currentUser)}?sheet=Users`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
                
                const responseText1 = await response1.text();
                console.log(`更新數據響應 1 (${response1.status}):`, responseText1);
                
                if (response1.ok) {
                    console.log('數據更新成功 (方式 1)!');
                    dataUpdated = true;
                }
            } catch (error1) {
                console.error('更新數據方式 1 失敗:', error1);
            }
            
            // 如果方式 1 失敗，嘗試方式 2
            if (!dataUpdated) {
                try {
                    console.log('嘗試更新數據 (方式 2)...');
                    const response2 = await fetch(`${this.SHEETDB_API_URL}/username/${encodeURIComponent(this.currentUser)}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            sheet: 'Users',
                            data: updateData
                        })
                    });
                    
                    const responseText2 = await response2.text();
                    console.log(`更新數據響應 2 (${response2.status}):`, responseText2);
                    
                    if (response2.ok) {
                        console.log('數據更新成功 (方式 2)!');
                        dataUpdated = true;
                    }
                } catch (error2) {
                    console.error('更新數據方式 2 失敗:', error2);
                }
            }
            
            if (!dataUpdated) {
                console.error('無法更新數據');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('保存數據失敗:', error);
            return false;
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
     * @param {object} tournament 記錄數據
     */
    async addTournament(tournament) {
        // 計算淨收益
        const totalCost = Number(tournament.buyin) + Number(tournament.fee);
        const netProfit = Number(tournament.prize) - totalCost;
        
        // 新增記錄結構
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
        
        try {
            await this.saveData();
            this.notifyDataChange();
            return newTournament;
        } catch (error) {
            console.error('添加錦標賽記錄失敗:', error);
            // 回滾操作
            this.tournaments.pop();
            throw error;
        }
    }
    
    /**
     * 更新記錄
     * @param {number} id 記錄ID
     * @param {object} updatedData 更新的數據
     */
    async updateTournament(id, updatedData) {
        const index = this.tournaments.findIndex(t => t.id === id);
        if (index === -1) {
            console.error('未找到要更新的記錄:', id);
            return false;
        }
        
        // 備份原記錄
        const originalTournament = { ...this.tournaments[index] };
        
        // 更新記錄
        const totalCost = Number(updatedData.buyin) + Number(updatedData.fee);
        const netProfit = Number(updatedData.prize) - totalCost;
        
        this.tournaments[index] = {
            ...this.tournaments[index],
            ...updatedData,
            netProfit: netProfit
        };
        
        try {
            await this.saveData();
            this.notifyDataChange();
            return true;
        } catch (error) {
            console.error('更新錦標賽記錄失敗:', error);
            // 回滾操作
            this.tournaments[index] = originalTournament;
            return false;
        }
    }
    
    /**
     * 刪除記錄
     * @param {number} id 記錄ID
     */
    async deleteTournament(id) {
        const index = this.tournaments.findIndex(t => t.id === id);
        if (index === -1) {
            console.error('未找到要刪除的記錄:', id);
            return false;
        }
        
        // 備份原記錄
        const deletedTournament = this.tournaments[index];
        
        // 刪除記錄
        this.tournaments.splice(index, 1);
        
        try {
            await this.saveData();
            this.notifyDataChange();
            return true;
        } catch (error) {
            console.error('刪除錦標賽記錄失敗:', error);
            // 回滾操作
            this.tournaments.splice(index, 0, deletedTournament);
            return false;
        }
    }
    
    /**
     * 獲取特定記錄
     * @param {number} id 記錄ID
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