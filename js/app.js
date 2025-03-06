// 全局變量
let chartManager;
let uiController;
let dataHandler; // 這個變數可以是本地存儲實例或 Google Sheets 實例
let currentUser = localStorage.getItem('currentUser');
let sheetsHandler;
let isInitialized = false;
let useGoogleSheets = false; // 控制是否使用 Google Sheets

// 初始化 Google API 和應用程序
async function initialize() {
    // 嘗試初始化 Google Sheets
    try {
        sheetsHandler = new SheetsDataHandler();
        
        // 檢查是否配置了 Google Sheets API
        if (sheetsHandler.API_KEY === 'YOUR_API_KEY' || 
            sheetsHandler.CLIENT_ID === 'YOUR_CLIENT_ID' || 
            sheetsHandler.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
            
            console.log('未配置 Google Sheets API，將使用本地存儲');
            initializeWithLocalStorage();
            return;
        }
        
        // 嘗試初始化 Google Sheets API
        try {
            const isSignedIn = await sheetsHandler.initSheetsAPI();
            useGoogleSheets = true;
            
            if (!isSignedIn) {
                // 如果未登入 Google 賬戶，顯示登入按鈕
                showSignInPrompt();
                return;
            }
            
            // 如果已有使用者，直接載入數據
            if (currentUser) {
                const loginResult = await sheetsHandler.loginUser(currentUser);
                if (loginResult.success) {
                    dataHandler = sheetsHandler;
                    initializeApp();
                } else {
                    // 登入失敗，顯示登入模態框
                    showLoginModal();
                }
            } else {
                // 沒有使用者，顯示登入模態框
                showLoginModal();
            }
        } catch (error) {
            console.error('Google Sheets API 初始化失敗:', error);
            console.log('將使用本地存儲');
            initializeWithLocalStorage();
        }
    } catch (error) {
        console.error('初始化 SheetsDataHandler 失敗:', error);
        initializeWithLocalStorage();
    }
}

// 使用本地存儲初始化
function initializeWithLocalStorage() {
    useGoogleSheets = false;
    dataHandler = new LimitedTournamentDataHandler();
    
    if (currentUser) {
        dataHandler.loadUserData(currentUser);
        initializeApp();
    } else {
        showLoginModal();
    }
}

// 顯示 Google 登入提示
function showSignInPrompt() {
    const modalHtml = `
        <div class="modal fade" id="signInModal" data-bs-backdrop="static" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">需要登入 Google 帳戶</h5>
                    </div>
                    <div class="modal-body">
                        <p>為了使用 Google 試算表存儲您的數據，我們需要您授權此應用程序。</p>
                        <p>請點擊下方按鈕登入您的 Google 帳戶。</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="googleSignInBtn">登入 Google</button>
                        <button type="button" class="btn btn-secondary" id="useLocalStorageBtn">使用本地存儲</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const signInModal = new bootstrap.Modal(document.getElementById('signInModal'));
    
    document.getElementById('googleSignInBtn').addEventListener('click', function() {
        sheetsHandler.signIn().then(() => {
            signInModal.hide();
            showLoginModal();
        }).catch(error => {
            console.error('Google 登入失敗:', error);
            alert('Google 帳戶登入失敗，請重試。');
        });
    });
    
    document.getElementById('useLocalStorageBtn').addEventListener('click', function() {
        signInModal.hide();
        initializeWithLocalStorage();
    });
    
    signInModal.show();
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

// 修改 DOMContentLoaded 事件
document.addEventListener('DOMContentLoaded', function() {
    // 隱藏主頁內容，直到登入成功
    document.getElementById('mainContent').classList.add('d-none');
    
    // 初始化應用
    initialize();
    
    // 登出按鈕處理
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        location.reload();
    });
});

// 登入相關函數
function showLoginModal() {
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
                                <option value="">請選擇...</option>
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
    
    loadPlayerList();
    
    document.getElementById('loginButton').addEventListener('click', async function() {
        const selectedPlayer = document.getElementById('playerSelect').value;
        const newPlayer = document.getElementById('newPlayerName').value.trim();
        
        let result;
        
        if (selectedPlayer) {
            // 登入現有用戶
            if (useGoogleSheets) {
                result = await sheetsHandler.loginUser(selectedPlayer);
                if (result.success) {
                    login(selectedPlayer);
                    dataHandler = sheetsHandler;
                } else {
                    alert(result.message);
                    return;
                }
            } else {
                login(selectedPlayer);
                dataHandler.loadUserData(selectedPlayer);
            }
        } else if (newPlayer) {
            // 創建新用戶
            if (newPlayer.length < 3) {
                alert('用戶名至少需要3個字符');
                return;
            }
            
            if (useGoogleSheets) {
                result = await sheetsHandler.createUser(newPlayer);
                if (result.success) {
                    login(newPlayer);
                    dataHandler = sheetsHandler;
                } else {
                    alert(result.message);
                    return;
                }
            } else {
                login(newPlayer);
                dataHandler.loadUserData(newPlayer);
            }
        } else {
            alert('請選擇現有玩家或輸入新玩家名稱');
            return;
        }
        
        loginModal.hide();
        initializeApp();
    });
    
    loginModal.show();
}

async function loadPlayerList() {
    try {
        const playerSelect = document.getElementById('playerSelect');
        playerSelect.innerHTML = '<option value="">請選擇...</option>';
        
        if (useGoogleSheets) {
            // 從 Google Sheets 獲取用戶列表
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: sheetsHandler.SPREADSHEET_ID,
                range: sheetsHandler.USERS_RANGE
            });
            
            const users = response.result.values || [];
            
            // 添加用戶到下拉選單
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user[0];
                option.textContent = user[0];
                playerSelect.appendChild(option);
            });
        } else {
            // 從本地存儲獲取用戶列表
            const storageKeys = Object.keys(localStorage);
            const usernames = storageKeys
                .filter(key => key.startsWith('tournaments_'))
                .map(key => key.replace('tournaments_', ''));
                
            usernames.forEach(username => {
                const option = document.createElement('option');
                option.value = username;
                option.textContent = username;
                playerSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('載入玩家列表失敗:', error);
    }
}

function login(playerName) {
    currentUser = playerName;
    localStorage.setItem('currentUser', playerName);
}

function calculateProfit() {
    const buyin = Number(document.getElementById('tournament-buyin').value) || 0;
    const fee = Number(document.getElementById('tournament-fee').value) || 0;
    const prize = Number(document.getElementById('tournament-prize').value) || 0;

    const profit = prize - (buyin + fee);
    document.getElementById('tournament-profit').value = profit;
}

// 處理表單提交
document.getElementById('limitedTournamentForm').addEventListener('submit', function (e) {
    e.preventDefault();
    
    if (!isInitialized) return;

    const tournamentData = {
        date: document.getElementById('tournament-date').value,
        venue: document.getElementById('tournament-venue').value,
        hours: Number(document.getElementById('tournament-hours').value),
        buyin: Number(document.getElementById('tournament-buyin').value),
        fee: Number(document.getElementById('tournament-fee').value),
        prize: Number(document.getElementById('tournament-prize').value),
        startingChips: Number(document.getElementById('tournament-startingChips').value),
        notes: document.getElementById('tournament-notes').value
    };

    dataHandler.addTournament(tournamentData);

    // 保存當前日期和場地
    const currentDate = document.getElementById('tournament-date').value;
    const currentVenue = document.getElementById('tournament-venue').value;

    // 重置表單
    this.reset();

    // 恢復日期和場地
    document.getElementById('tournament-date').value = currentDate;
    document.getElementById('tournament-venue').value = currentVenue;

    // 更新UI和圖表
    uiController.updateSummary();
    uiController.updateHistoryTable();
    chartManager.updateAllCharts();

    // 重新綁定事件監聽器
    document.getElementById('tournament-buyin').addEventListener('input', calculateProfit);
    document.getElementById('tournament-fee').addEventListener('input', calculateProfit);
    document.getElementById('tournament-prize').addEventListener('input', calculateProfit);
});

// 格式化貨幣
function formatCurrency(amount) {
    return '$' + Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// 快速填寫標準賽
document.getElementById('quickFillBtn').addEventListener('click', function () {
    if (!isInitialized) return;
    
    const template = {
        venue: '市政華人',
        hours: 2,
        buyin: 3000,
        fee: 400,
        startingChips: 20000
    };

    if (template) {
        document.getElementById('tournament-venue').value = template.venue;
        document.getElementById('tournament-hours').value = template.hours;
        document.getElementById('tournament-buyin').value = template.buyin;
        document.getElementById('tournament-fee').value = template.fee;
        document.getElementById('tournament-startingChips').value = template.startingChips;

        // 自動計算淨收益
        calculateProfit();

        // 設置焦點到獎金欄位
        document.getElementById('tournament-prize').focus();
    }
});