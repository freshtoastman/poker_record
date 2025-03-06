// 全局變量
let chartManager;
let uiController;
let dataHandler; // 這個變數可以是本地存儲實例或 SheetDB 實例
let currentUser = localStorage.getItem('currentUser');
let sheetsHandler;
let isInitialized = false;
let useSheetDB = true; // 強制使用 SheetDB
let sheetDBApiUrl = localStorage.getItem('sheetDBApiUrl') || 'https://sheetdb.io/api/v1/ybxsbl10xn7az'; // 預設 SheetDB API URL

// 初始化應用程序
async function initialize() {
    try {
        // 確認 SheetDB API URL 是否有效
        if (!sheetDBApiUrl || !sheetDBApiUrl.startsWith('https://sheetdb.io/api/v1/')) {
            console.error('SheetDB API URL 無效，顯示設置模態框');
            showSheetDBSetupModal();
            return;
        }
        
        console.log('開始連接 SheetDB API:', sheetDBApiUrl);
        
        // 測試 API 連接
        try {
            const testResponse = await fetch(sheetDBApiUrl);
            if (!testResponse.ok) {
                console.error('無法連接到 SheetDB API，錯誤:', await testResponse.text());
                showError(`無法連接到 SheetDB API (${testResponse.status})。請檢查您的 API URL 是否正確。`);
                showSheetDBSetupModal();
                return;
            }
            
            const apiInfo = await testResponse.json();
            console.log('SheetDB API 連接成功，資訊:', apiInfo);
            
            // 初始化 SheetDB 數據處理器
            sheetsHandler = new SheetsDataHandler();
            sheetsHandler.SHEETDB_API_URL = sheetDBApiUrl;
            console.log('SheetDB 數據處理器初始化完成');
            
            // 如果已有使用者，直接載入數據
            if (currentUser) {
                console.log('正在登入現有用戶:', currentUser);
                const loginResult = await sheetsHandler.loginUser(currentUser);
                if (loginResult.success) {
                    dataHandler = sheetsHandler;
                    initializeApp();
                } else {
                    console.log('登入失敗:', loginResult.message);
                    // 登入失敗，顯示登入模態框
                    await showLoginModal();
                }
            } else {
                // 沒有使用者，顯示登入模態框
                await showLoginModal();
            }
        } catch (apiError) {
            console.error('測試 API 連接時出錯:', apiError);
            showError(`連接 SheetDB API 時出錯: ${apiError.message}`);
            showSheetDBSetupModal();
            return;
        }
    } catch (error) {
        console.error('初始化 SheetsDataHandler 失敗:', error);
        showError(`初始化數據處理器失敗: ${error.message}`);
        await initializeWithLocalStorage();
    }
}

// 使用本地存儲初始化（僅作為備用）
async function initializeWithLocalStorage() {
    dataHandler = new LimitedTournamentDataHandler();
    
    if (currentUser) {
        dataHandler.loadUserData(currentUser);
        initializeApp();
    } else {
        await showLoginModal();
    }
}

// 顯示錯誤訊息
function showError(message) {
    const modalHtml = `
        <div class="modal fade" id="errorModal" data-bs-backdrop="static" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">錯誤</h5>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="location.reload()">重新載入</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();
}

// 修改初始化函數
function initializeApp() {
    // 初始化 UI 控制器
    uiController = new UIController(dataHandler);
    
    // 初始化圖表管理器
    chartManager = new ChartManager(dataHandler);
    chartManager.initCharts();

    // 設置日期欄位預設值為今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tournament-date').value = today;

    // 初始載入數據並更新UI
    uiController.updateSummary();
    uiController.updateHistoryTable();
    chartManager.updateAllCharts();
    
    // 顯示當前登入用戶
    document.getElementById('currentUserDisplay').textContent = currentUser;
    
    // 顯示主頁內容
    document.getElementById('mainContent').classList.remove('d-none');
    
    isInitialized = true;
}

/**
 * 檢測設備類型和屏幕尺寸，動態調整 UI
 */
function detectDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    document.body.classList.toggle('mobile-device', isMobile);
    
    return { isMobile };
}

/**
 * 優化移動端觸控體驗
 */
function enhanceMobileExperience() {
    const { isMobile } = detectDevice();
    
    if (!isMobile) return;
    
    // 優化表格顯示
    const historyTable = document.getElementById('history-table');
    if (historyTable) {
        // 為每個表格行添加點擊事件，顯示詳細資訊
        const tableBody = document.getElementById('history-table-body');
        tableBody.addEventListener('click', function(e) {
            // 尋找最近的 tr 父元素
            const row = e.target.closest('tr');
            if (row && row.dataset.id) {
                // 避免點擊操作按鈕時觸發
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                
                // 載入該記錄的數據
                uiController.loadTournamentForEditing(row.dataset.id);
                
                // 滾動到表單區域
                document.querySelector('#tournament-form').scrollIntoView({behavior: 'smooth'});
            }
        });
    }
    
    // 點擊摘要卡片時展開/收起詳細資訊
    const summaryCard = document.querySelector('.card-header.bg-success');
    if (summaryCard) {
        summaryCard.addEventListener('click', function() {
            const cardBody = this.nextElementSibling;
            if (cardBody) {
                cardBody.classList.toggle('d-none');
            }
        });
    }
    
    // 增強輸入體驗
    document.querySelectorAll('input, select').forEach(input => {
        // 輸入完成後自動收起鍵盤
        input.addEventListener('blur', function() {
            setTimeout(() => {
                if (document.activeElement.tagName !== 'INPUT' && 
                    document.activeElement.tagName !== 'SELECT' && 
                    document.activeElement.tagName !== 'TEXTAREA') {
                    window.scrollTo({top: 0, behavior: 'smooth'});
                }
            }, 100);
        });
    });
    
    // 表單提交時防止雙重點擊
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 儲存中...';
            
            // 處理表單提交
            uiController.saveTournament();
            
            // 延遲恢復按鈕狀態
            setTimeout(() => {
                this.disabled = false;
                this.innerHTML = '儲存紀錄';
            }, 1000);
        });
    }
    
    // 處理表單提交事件
    const tournamentForm = document.getElementById('tournament-form');
    if (tournamentForm) {
        tournamentForm.addEventListener('submit', function(e) {
            e.preventDefault(); // 防止表單默認提交行為
            
            // 在表單提交時收起鍵盤
            document.activeElement.blur();
            
            // 顯示提交中狀態
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 儲存中...';
            }
            
            // 延遲處理提交，確保UI有足夠時間更新
            setTimeout(() => {
                if (uiController) {
                    uiController.saveTournament();
                }
                
                // 恢復按鈕狀態
                if (saveBtn) {
                    setTimeout(() => {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '儲存紀錄';
                    }, 500);
                }
            }, 100);
        });
    }
}

// 修改 DOMContentLoaded 事件
document.addEventListener('DOMContentLoaded', function() {
    // 隱藏主頁內容，直到登入成功
    document.getElementById('mainContent').classList.add('d-none');
    
    // 添加事件監聽器到快速填寫按鈕
    document.getElementById('quickFillBtn').addEventListener('click', function() {
        uiController.fillStandardTournament();
    });
    
    // 添加事件監聽器到退出按鈕
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        location.reload();
    });
    
    // 添加事件監聽器到保存 SheetDB 設置按鈕
    document.getElementById('saveSheetdbSettings').addEventListener('click', saveSheetDBSettings);
    
    // 添加事件監聽器到測試 API 按鈕
    document.getElementById('testApiBtn').addEventListener('click', testSheetDBApi);
    

    // 如果有 SheetDB 設置，填充設置表單
    if (sheetDBApiUrl) {
        document.getElementById('sheetdbApiUrl').value = sheetDBApiUrl;
    }
    document.getElementById('useSheetdbSwitch').checked = true; // 固定為啟用
    document.getElementById('useSheetdbSwitch').disabled = true; // 禁用切換
    
    // 優化移動端體驗
    enhanceMobileExperience();
    
    // 監聽屏幕尺寸變化，調整 UI
    window.addEventListener('resize', detectDevice);
    
    // 加載 API URL 設置 (初始化時應用)
    initialize();
});

// 登入相關函數
async function showLoginModal() {
    const modalHtml = `
        <div class="modal fade" id="loginModal" data-bs-backdrop="static" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">選擇或創建玩家</h5>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">選擇現有玩家</label>
                            <select class="form-select mb-2" id="playerSelect">
                                <option value="">載入中...</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">或新增玩家</label>
                            <input type="text" class="form-control" id="newPlayerName" placeholder="輸入新玩家名稱">
                            <small class="form-text text-muted">用戶名一旦創建不能更改，請謹慎選擇</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="loginButton">確認</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
    
    // 確保 SheetDB 數據處理器已初始化
    if (!sheetsHandler && sheetDBApiUrl) {
        console.log('正在初始化 SheetDB 數據處理器...');
        try {
            const testResponse = await fetch(sheetDBApiUrl);
            if (testResponse.ok) {
                const apiInfo = await testResponse.json();
                console.log('初始化前的 API 信息:', apiInfo);
                
                // 初始化 SheetDB 數據處理器
                sheetsHandler = new SheetsDataHandler();
                sheetsHandler.SHEETDB_API_URL = sheetDBApiUrl;
                console.log('SheetDB 數據處理器初始化完成，URL:', sheetsHandler.SHEETDB_API_URL);
            } else {
                console.warn('無法連接到 SheetDB API，將使用本地存儲:', await testResponse.text());
            }
        } catch (apiError) {
            console.warn('測試 API 連接時出錯，將使用本地存儲:', apiError);
        }
    }
    
    // 加載玩家列表
    await loadPlayerList();
    
    document.getElementById('loginButton').addEventListener('click', async function() {
        const selectedPlayer = document.getElementById('playerSelect').value;
        const newPlayer = document.getElementById('newPlayerName').value.trim();
        
        let result;
        
        if (selectedPlayer) {
            // 登入現有用戶
            if (sheetsHandler) {
                result = await sheetsHandler.loginUser(selectedPlayer);
                if (result.success) {
                    login(selectedPlayer);
                    dataHandler = sheetsHandler;
                } else {
                    alert(result.message);
                    return;
                }
            } else {
                // 使用本地存儲登入
                login(selectedPlayer);
                dataHandler = new LimitedTournamentDataHandler();
                dataHandler.loadUserData(selectedPlayer);
            }
        } else if (newPlayer) {
            // 創建新用戶
            if (newPlayer.length < 3) {
                alert('用戶名至少需要3個字符');
                return;
            }
            
            if (sheetsHandler) {
                result = await sheetsHandler.createUser(newPlayer);
                if (result.success) {
                    login(newPlayer);
                    dataHandler = sheetsHandler;
                } else {
                    alert(result.message);
                    return;
                }
            } else {
                // 使用本地存儲創建用戶
                login(newPlayer);
                dataHandler = new LimitedTournamentDataHandler();
                dataHandler.loadUserData(newPlayer);
            }
        } else {
            alert('請選擇現有玩家或輸入新玩家名稱');
            return;
        }
        
        loginModal.hide();
        initializeApp();
    });
}

async function loadPlayerList() {
    try {
        const playerSelect = document.getElementById('playerSelect');
        playerSelect.innerHTML = '<option value="">請選擇...</option>';
        
        let foundPlayers = false;
        
        // 嘗試從 SheetDB 獲取用戶列表
        if (sheetsHandler && sheetsHandler.SHEETDB_API_URL) {
            console.log('正在從 SheetDB 獲取用戶列表...', sheetsHandler.SHEETDB_API_URL);
            try {
                // 首先嘗試直接從 API 根端點獲取數據
                let response = await fetch(sheetsHandler.SHEETDB_API_URL);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('從 API 根端點獲取到數據:', data);
                    
                    // 過濾有效用戶並添加到下拉選單
                    if (Array.isArray(data) && data.length > 0) {
                        const validUsers = data.filter(user => user && user.username);
                        
                        validUsers.forEach(user => {
                            const option = document.createElement('option');
                            option.value = user.username;
                            option.textContent = user.username;
                            playerSelect.appendChild(option);
                        });
                        
                        if (validUsers.length > 0) {
                            foundPlayers = true;
                            console.log(`找到 ${validUsers.length} 個用戶`);
                            return; // 已找到用戶，不需要再嘗試其他方法
                        }
                    }
                    
                    console.log('從 API 根端點未找到有效用戶，嘗試使用 search 路徑');
                }
                
                // 如果從根端點沒有獲取到用戶，嘗試 search 路徑
                response = await fetch(`${sheetsHandler.SHEETDB_API_URL}/search?sheet=Users`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('從 search 路徑獲取到用戶列表:', data);
                    
                    // 添加用戶到下拉選單
                    const validUsers = data.filter(user => user && user.username);
                    
                    validUsers.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.username;
                        option.textContent = user.username;
                        playerSelect.appendChild(option);
                    });
                    
                    if (validUsers.length > 0) {
                        foundPlayers = true;
                        console.log(`找到 ${validUsers.length} 個用戶`);
                    } else {
                        console.log('SheetDB 中沒有找到用戶');
                    }
                } else {
                    console.error('從 SheetDB 載入用戶列表失敗:', await response.text());
                }
            } catch (error) {
                console.error('從 SheetDB 獲取用戶時出錯:', error);
            }
        }
        
        // 如果從 SheetDB 沒有獲取到用戶，嘗試從本地存儲獲取
        if (!foundPlayers) {
            console.log('從本地存儲獲取用戶列表...');
            const storageKeys = Object.keys(localStorage);
            const usernames = storageKeys
                .filter(key => key.startsWith('tournaments_'))
                .map(key => key.replace('tournaments_', ''));
            
            console.log('從本地存儲找到的用戶:', usernames);
                
            usernames.forEach(username => {
                const option = document.createElement('option');
                option.value = username;
                option.textContent = username;
                playerSelect.appendChild(option);
            });
            
            if (usernames.length > 0) {
                foundPlayers = true;
            }
        }
        
        // 如果沒有找到任何用戶，添加一個提示
        if (!foundPlayers && playerSelect.options.length <= 1) {
            console.log('沒有找到任何用戶');
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "-- 未找到玩家，請創建新玩家 --";
            option.disabled = true;
            playerSelect.appendChild(option);
        }
    } catch (error) {
        console.error('載入玩家列表失敗:', error);
    }
}

function login(playerName) {
    currentUser = playerName;
    localStorage.setItem('currentUser', playerName);
}

// 格式化貨幣
function formatCurrency(amount) {
    return '$' + Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

/**
 * 保存 SheetDB 設置
 */
function saveSheetDBSettings() {
    const apiUrl = document.getElementById('sheetdbApiUrl').value.trim() || 'https://sheetdb.io/api/v1/ybxsbl10xn7az';
    
    // 驗證 API URL
    if (!apiUrl || !apiUrl.startsWith('https://sheetdb.io/api/v1/')) {
        alert('請輸入有效的 SheetDB API URL');
        return;
    }
    
    // 保存設置
    localStorage.setItem('sheetDBApiUrl', apiUrl);
    
    // 更新全局變量
    sheetDBApiUrl = apiUrl;
    
    // 顯示成功訊息
    alert('設置已保存！請重新載入頁面以應用更改。');
    
    // 關閉模態框
    const modal = bootstrap.Modal.getInstance(document.getElementById('sheetdbSetupModal'));
    modal.hide();
    
    // 重新載入頁面
    location.reload();
}

// 顯示 SheetDB 設置模態框
function showSheetDBSetupModal() {
    const modal = new bootstrap.Modal(document.getElementById('sheetdbSetupModal'));
    modal.show();
}

/**
 * 測試 SheetDB API 連接
 */
async function testSheetDBApi() {
    const apiUrlInput = document.getElementById('sheetdbApiUrl');
    const apiUrl = apiUrlInput.value.trim();
    const apiTestResult = document.getElementById('apiTestResult');
    const apiErrorAlert = document.getElementById('apiErrorAlert');
    const apiErrorMessage = document.getElementById('apiErrorMessage');
    
    // 隱藏先前的結果
    apiTestResult.style.display = 'none';
    apiErrorAlert.style.display = 'none';
    
    // 驗證 URL 格式
    if (!apiUrl || !apiUrl.startsWith('https://sheetdb.io/api/v1/')) {
        apiErrorAlert.style.display = 'block';
        apiErrorMessage.textContent = '請輸入有效的 SheetDB API URL (格式應為 https://sheetdb.io/api/v1/...)';
        return;
    }
    
    try {
        // 測試基本連接
        apiTestResult.className = 'alert alert-info';
        apiTestResult.innerHTML = '正在測試連接...';
        apiTestResult.style.display = 'block';
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API 響應錯誤: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API 測試結果:', data);
        
        // 測試 Users 工作表
        apiTestResult.innerHTML = '基本連接成功！正在檢查工作表...';
        
        // 獲取工作表列表
        const sheetsResponse = await fetch(`${apiUrl}/sheets`);
        
        if (!sheetsResponse.ok) {
            apiTestResult.className = 'alert alert-warning';
            apiTestResult.innerHTML = '基本連接成功，但無法獲取工作表列表。這可能是 SheetDB 版本限制，但基本功能應該可以使用。';
            return;
        }
        
        const sheetsData = await sheetsResponse.json();
        console.log('工作表列表:', sheetsData);
        
        // 檢查 Users 工作表是否存在
        if (!sheetsData.sheets || !sheetsData.sheets.includes('Users')) {
            // 嘗試創建 Users 工作表
            apiTestResult.innerHTML = '未找到 Users 工作表，嘗試創建...';
            
            const createResponse = await fetch(`${apiUrl}/sheet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'Users',
                    first_row: ["username", "tournaments"]
                })
            });
            
            if (!createResponse.ok) {
                apiTestResult.className = 'alert alert-warning';
                apiTestResult.innerHTML = `連接成功，但無法創建 Users 工作表。您可能需要手動在 Google Sheets 中創建一個名為 "Users" 的工作表，並在第一行添加 "username" 和 "tournaments" 列標題。`;
                return;
            }
            
            apiTestResult.innerHTML += '<br>成功創建 Users 工作表！';
        }
        
        // 全部測試通過
        apiTestResult.className = 'alert alert-success';
        apiTestResult.innerHTML = '<strong>連接成功！</strong> SheetDB API 已可正常使用。';
        
    } catch (error) {
        console.error('API 測試錯誤:', error);
        apiTestResult.className = 'alert alert-danger';
        apiTestResult.innerHTML = `<strong>連接失敗:</strong> ${error.message}`;
    }
}

/**
 * 顯示 Users 表格的所有列標題
 */
async function showUsersTableHeaders() {
    if (!sheetsHandler) {
        alert('未初始化 SheetDB 連接');
        return;
    }
    
    try {
        // 顯示加載中提示
        const loadingToast = showToast('正在獲取 Users 表格標題...', 'info');
        
        // 獲取標題
        const headers = await sheetsHandler.getUsersTableHeaders();
        
        // 隱藏加載提示
        loadingToast.hide();
        
        if (headers.length === 0) {
            showToast('無法獲取 Users 表格標題', 'danger');
            return;
        }
        
        // 構建標題顯示 HTML
        let headersHtml = `
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>列標題名稱</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        headers.forEach((header, index) => {
            headersHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${header}</td>
                </tr>
            `;
        });
        
        headersHtml += `
                    </tbody>
                </table>
            </div>
        `;
        
        // 顯示標題在模態框中
        const modalHtml = `
            <div class="modal fade" id="headersModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Users 表格列標題</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${headersHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">關閉</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加模態框
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const headersModal = new bootstrap.Modal(document.getElementById('headersModal'));
        headersModal.show();
        
        // 移除模態框
        document.getElementById('headersModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    } catch (error) {
        console.error('顯示 Users 表格標題失敗:', error);
        showToast('顯示 Users 表格標題失敗: ' + error.message, 'danger');
    }
}

/**
 * 顯示 Toast 提示
 * @param {string} message 提示訊息
 * @param {string} type 提示類型 (success, info, warning, danger)
 * @returns {Object} Toast 實例
 */
function showToast(message, type = 'info') {
    const id = 'toast-' + Date.now();
    const toastHtml = `
        <div class="toast-container position-fixed bottom-0 end-0 p-3">
            <div id="${id}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-${type} text-white">
                    <strong class="me-auto">德州撲克限時錦標賽追蹤器</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(id);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', function() {
        this.parentElement.remove();
    });
    
    return toast;
}

/**
 * 優化顯示簡潔版的歷史記錄（針對移動端）
 */
function optimizeHistoryTableForMobile() {
    try {
        const { isMobile } = detectDevice();
        
        if (!isMobile) return;
        
        const table = document.getElementById('history-table');
        if (!table) {
            console.log('找不到歷史表格，跳過移動端優化');
            return;
        }
        
        const headers = table.querySelectorAll('th');
        if (!headers || headers.length === 0) {
            console.log('找不到表格標題，跳過移動端優化');
            return;
        }
        
        const rows = table.querySelectorAll('tbody tr');
        
        // 智能決定要隱藏哪些列
        // 1. 獲取當前表格有多少列
        const columnCount = headers.length;
        console.log(`歷史表格有 ${columnCount} 列`);
        
        // 2. 如果列數少，則不隱藏
        if (columnCount <= 4) {
            console.log('表格列數太少，不進行隱藏');
            return;
        }
        
        // 3. 只隱藏非關鍵列
        // 在當前結構中 (日期、名稱、買入、獎金、盈虧、操作)
        // 最重要的是：名稱、盈虧、操作
        // 其次是：日期、獎金
        // 最後是：買入
        const hiddenColumnIndexes = [];
        
        // 買入列通常是索引2
        if (columnCount > 4 && headers.length > 2) {
            hiddenColumnIndexes.push(2); // 買入列
        }
        
        console.log(`將隱藏以下列索引: ${hiddenColumnIndexes.join(', ')}`);
        
        // 確保索引在有效範圍內
        hiddenColumnIndexes.forEach(index => {
            if (index >= 0 && index < headers.length) {
                headers[index].classList.add('d-none', 'd-md-table-cell');
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells && cells.length > index && cells[index]) {
                        cells[index].classList.add('d-none', 'd-md-table-cell');
                    }
                });
            } else {
                console.warn(`列索引 ${index} 超出範圍，不進行隱藏`);
            }
        });
        
        console.log('歷史表格移動端優化完成');
    } catch (error) {
        console.error('優化歷史表格時出錯:', error);
    }
}

/**
 * 格式化移動端顯示的數字，使其更簡潔
 */
function formatNumberForMobile(number, currency = false) {
    const { isMobile } = detectDevice();
    
    if (!isMobile) {
        return currency ? formatCurrency(number) : number.toString();
    }
    
    // 簡化數字顯示
    if (number >= 1000) {
        return currency ? '$' + (number / 1000).toFixed(1) + 'k' : (number / 1000).toFixed(1) + 'k';
    }
    
    return currency ? formatCurrency(number) : number.toString();
}

// 擴展 UIController 的 updateHistoryTable 方法
if (typeof UIController !== 'undefined') {
    const originalUpdateHistoryTable = UIController.prototype.updateHistoryTable;
    
    UIController.prototype.updateHistoryTable = function() {
        originalUpdateHistoryTable.call(this);
        optimizeHistoryTableForMobile();
    };
}

/**
 * 在移動端添加下拉刷新功能
 */
function setupPullToRefresh() {
    const { isMobile } = detectDevice();
    
    if (!isMobile) return;
    
    let touchstartY = 0;
    let touchendY = 0;
    const minSwipeDistance = 100;
    
    document.addEventListener('touchstart', e => {
        touchstartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    document.addEventListener('touchend', e => {
        touchendY = e.changedTouches[0].screenY;
        handleSwipeGesture();
    }, { passive: true });
    
    function handleSwipeGesture() {
        if (touchendY - touchstartY > minSwipeDistance && window.scrollY <= 10) {
            // 下拉刷新
            showToast('正在刷新數據...', 'info');
            
            // 重新載入數據
            if (uiController) {
                uiController.updateSummary();
                uiController.updateHistoryTable();
                if (chartManager) {
                    chartManager.updateAllCharts();
                }
                
                showToast('數據已更新', 'success');
            }
        }
    }
}

// 在初始化完成後設置下拉刷新
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // 設置下拉刷新
    setupPullToRefresh();
});