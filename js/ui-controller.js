/**
 * UI 控制器類
 */
class UIController {
    /**
     * 構造函數
     * @param {Object} dataHandler - 數據處理器實例
     */
    constructor(dataHandler) {
        this.dataHandler = dataHandler;
        this.selectedTournamentId = null;
        this.isSaving = false; // 保存操作標誌

        // 獲取表單和按鈕元素
        this.form = document.getElementById('tournament-form');
        this.saveBtn = document.getElementById('saveBtn');
        this.deleteBtn = document.getElementById('deleteBtn');

        // 添加事件監聽器
        this.saveBtn.addEventListener('click', this.saveTournament.bind(this));
        this.deleteBtn.addEventListener('click', this.deleteTournament.bind(this));

        // 添加表單提交事件監聽器 (這也會處理手機上的虛擬鍵盤 "完成" 按鈕)
        this.form.addEventListener('submit', this.handleFormSubmit.bind(this));

        // 導出按鈕
        document.getElementById('exportButton').addEventListener('click', this.exportData.bind(this));

        // 初始化表格事件監聽器
        this.initializeTableEventListeners();

        // 監聽數據變更事件 - 確保數據變化時 UI 更新
        if (this.dataHandler && typeof this.dataHandler.onDataChange === 'function') {
            this.dataHandler.onDataChange(() => {
                console.log('數據變更事件觸發，更新 UI...');
                this.updateHistoryTable();
                this.updateSummary();

                // 確保圖表更新
                if (typeof chartManager !== 'undefined' && chartManager) {
                    setTimeout(() => {
                        try {
                            chartManager.updateAllCharts();
                        } catch (chartError) {
                            console.warn('圖表更新失敗:', chartError);
                        }
                    }, 200);
                }
            });
        }
    }

    /**
     * 處理表單提交
     * @param {Event} event - 表單提交事件
     */
    handleFormSubmit(event) {
        // 防止表單默認提交行為
        event.preventDefault();

        // 在手機上隱藏鍵盤
        if (document.activeElement) {
            document.activeElement.blur();
        }

        // 檢查是否已經在處理保存操作
        if (this.isSaving) {
            console.log('正在處理保存，忽略重複提交');
            return;
        }

        // 調用保存函數 - 添加延遲防止多次快速點擊
        setTimeout(() => {
            this.saveTournament();
        }, 100);
    }

    /**
     * 初始化表格事件監聽器
     */
    initializeTableEventListeners() {
        // 獲取表格主體元素
        const tableBody = document.getElementById('history-table-body');
        if (!tableBody) {
            console.error('找不到歷史表格主體元素');
            return;
        }

        console.log('初始化表格事件監聽器');

        // 移除可能存在的舊事件監聽器
        const newTableBody = tableBody.cloneNode(true);
        tableBody.parentNode.replaceChild(newTableBody, tableBody);

        // 使用事件委託處理編輯和刪除按鈕的點擊
        newTableBody.addEventListener('click', async (e) => {
            const target = e.target;

            // 查找最近的按鈕元素
            const button = target.closest('.edit-btn, .delete-btn');
            if (!button) return; // 如果點擊的不是按鈕或其子元素，則退出

            // 防止按鈕重複點擊
            button.disabled = true;

            try {
                // 獲取按鈕上的 data-id 屬性
                const id = button.getAttribute('data-id');
                if (!id) {
                    console.error('按鈕沒有設置 data-id 屬性', button);
                    showToast('操作失敗：找不到記錄 ID', 'danger');
                    button.disabled = false;
                    return;
                }

                console.log(`表格按鈕點擊: ${button.className}, ID: ${id}, 型別: ${typeof id}`);

                // 處理編輯按鈕點擊
                if (button.classList.contains('edit-btn')) {
                    console.log(`準備編輯 ID 為 ${id} 的記錄`);
                    await this.loadTournamentForEditing(id);
                }
                // 處理刪除按鈕點擊
                else if (button.classList.contains('delete-btn')) {
                    console.log(`準備刪除 ID 為 ${id} 的記錄`);
                    this.confirmDeleteTournament(id);
                }
            } catch (error) {
                console.error('處理表格按鈕點擊時出錯:', error);
                showToast('處理操作時出錯', 'danger');
            } finally {
                // 重新啟用按鈕
                button.disabled = false;
            }
        });
    }

    /**
     * 加載錦標賽數據用於編輯
     * @param {string|number} id - 錦標賽ID
     */
    async loadTournamentForEditing(id) {
        console.log(`嘗試加載錦標賽進行編輯，ID: ${id}，類型: ${typeof id}`);

        try {
            // 確保 ID 正確轉換
            const tournamentId = String(id);

            // 獲取錦標賽資料前先檢查是否有效
            if (!tournamentId || tournamentId === 'undefined' || tournamentId === 'null') {
                console.error('無效的錦標賽 ID');
                showToast('找不到指定的錦標賽記錄', 'danger');
                return;
            }

            const tournament = await this.dataHandler.getTournament(tournamentId);
            if (!tournament) {
                console.error(`找不到 ID 為 ${tournamentId} 的錦標賽記錄`);
                showToast('找不到指定的錦標賽記錄', 'danger');
                return;
            }

            console.log(`成功找到錦標賽記錄:`, tournament);

            // 設置選中的錦標賽ID
            this.selectedTournamentId = tournamentId;

            // 填充表單
            document.getElementById('tournament-date').value = tournament.date || '';
            document.getElementById('tournament-name').value = tournament.name || '';
            document.getElementById('buyin-amount').value = tournament.buyinAmount || '';
            document.getElementById('addon-amount').value = tournament.addonAmount || '';
            document.getElementById('prize-amount').value = tournament.prizeAmount || '';

            // 顯示刪除按鈕
            this.deleteBtn.classList.remove('d-none');

            // 修改按鈕文本
            this.saveBtn.textContent = '更新記錄';

            // 滾動到表單頂部
            this.form.scrollIntoView({ behavior: 'smooth' });

            return true;
        } catch (error) {
            console.error('載入錦標賽數據時出錯:', error);
            showToast('載入數據時出錯: ' + error.message, 'danger');
            return false;
        }
    }

    /**
     * 保存錦標賽數據
     */
    saveTournament() {
        // 防止重複提交
        if (this.isSaving) {
            console.log('正在處理保存，請勿重複提交');
            return;
        }

        this.isSaving = true;

        // 禁用保存按鈕，顯示加載狀態
        this.saveBtn.disabled = true;
        this.saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 儲存中...';

        try {
            // 獲取表單數據
            const date = document.getElementById('tournament-date').value;
            const name = document.getElementById('tournament-name').value;
            const buyinAmount = parseFloat(document.getElementById('buyin-amount').value) || 0;
            const addonAmount = parseFloat(document.getElementById('addon-amount').value) || 0;
            const prizeAmount = parseFloat(document.getElementById('prize-amount').value) || 0;

            // 驗證必填字段
            if (!date || !name || buyinAmount <= 0) {
                showToast('請填寫日期、名稱和買入金額', 'warning');
                this.resetSaveButtonState();
                return;
            }

            // 創建錦標賽數據對象
            const tournamentData = {
                date,
                name,
                buyinAmount,
                addonAmount,
                prizeAmount
            };

            console.log('準備保存錦標賽數據:', tournamentData);

            // 根據是否有選中的ID決定是更新還是創建
            const isUpdate = !!this.selectedTournamentId;

            // 執行保存
            let result;
            if (isUpdate) {
                // 更新現有記錄
                result = this.dataHandler.updateTournament(this.selectedTournamentId, tournamentData);
            } else {
                // 創建新記錄
                result = this.dataHandler.addTournament(tournamentData);
            }

            // 處理結果
            result.then(response => {
                if (response.success) {
                    const action = isUpdate ? '更新' : '保存';
                    showToast(`記錄已${action}`, 'success');

                    // 重置表單和選中的ID
                    this.resetForm();

                    // 重要：確保 UI 更新
                    this.updateHistoryTable();
                    this.updateSummary();

                    // 確保更新圖表
                    if (typeof chartManager !== 'undefined' && chartManager) {
                        console.log('保存後直接更新圖表...');
                        setTimeout(() => {
                            try {
                                chartManager.updateAllCharts();
                            } catch (chartError) {
                                console.warn('圖表更新失敗，但數據已保存:', chartError);
                            }
                        }, 500);
                    }
                } else {
                    showToast(`${isUpdate ? '更新' : '保存'}記錄失敗: ${response.message}`, 'danger');
                }

                // 無論成功失敗，重置按鈕狀態
                this.resetSaveButtonState();
            }).catch(error => {
                console.error('保存錦標賽數據時出錯:', error);
                showToast('保存數據時出錯: ' + error.message, 'danger');
                this.resetSaveButtonState();
            });
        } catch (error) {
            console.error('處理保存錦標賽數據時出錯:', error);
            showToast('處理保存數據時出錯: ' + error.message, 'danger');
            this.resetSaveButtonState();
        }
    }

    /**
     * 重置保存按鈕狀態
     */
    resetSaveButtonState() {
        this.isSaving = false;
        this.saveBtn.disabled = false;
        this.saveBtn.innerHTML = this.selectedTournamentId ? '更新記錄' : '儲存紀錄';
    }

    /**
     * 確認刪除錦標賽
     * @param {string|number} id - 錦標賽ID
     */
    confirmDeleteTournament(id) {
        console.log(`確認刪除 ID 為 ${id} 的錦標賽記錄`);

        if (!id) {
            console.error('沒有指定要刪除的記錄 ID');
            showToast('沒有指定要刪除的記錄', 'warning');
            return;
        }

        if (confirm('確定要刪除這條記錄嗎？此操作無法撤銷。')) {
            console.log(`用戶確認刪除 ID 為 ${id} 的記錄`);
            this.deleteTournament(id);
        } else {
            console.log(`用戶取消刪除 ID 為 ${id} 的記錄`);
        }
    }

    /**
     * 刪除錦標賽
     * @param {string|number} id - 錦標賽ID，如果未提供則使用選中的ID
     */
    async deleteTournament(id = null) {
        // 使用提供的 ID 或選中的 ID
        const tournamentId = id || this.selectedTournamentId;

        if (!tournamentId) {
            console.error('沒有指定要刪除的記錄 ID');
            showToast('沒有指定要刪除的記錄', 'warning');
            return;
        }

        console.log(`嘗試刪除錦標賽記錄，ID: ${tournamentId}，類型: ${typeof tournamentId}`);

        try {
            // 直接等待 Promise 結果
            const result = await this.dataHandler.deleteTournament(tournamentId);

            if (result.success) {
                showToast('記錄已刪除', 'success');

                // 如果刪除的是當前編輯的記錄，重置表單
                if (String(tournamentId) === String(this.selectedTournamentId)) {
                    this.resetForm();
                }

                // 強制更新 UI
                setTimeout(() => {
                    this.updateSummary();
                    this.updateHistoryTable();

                    // 確保更新圖表
                    if (typeof chartManager !== 'undefined' && chartManager) {
                        try {
                            chartManager.updateAllCharts();
                        } catch (chartError) {
                            console.warn('圖表更新失敗，但記錄已刪除:', chartError);
                        }
                    }
                }, 200);
            } else {
                showToast('刪除記錄失敗: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('刪除錦標賽數據時出錯:', error);
            showToast('刪除數據時出錯: ' + error.message, 'danger');
        }
    }

    /**
     * 重置表單
     */
    resetForm() {
        // 保存當前日期
        const currentDate = document.getElementById('tournament-date').value;

        // 重置表單
        this.form.reset();

        // 恢復日期
        document.getElementById('tournament-date').value = currentDate;

        // 隱藏刪除按鈕
        this.deleteBtn.classList.add('d-none');

        // 恢復按鈕文本
        this.saveBtn.textContent = '儲存紀錄';

        // 清除選中的ID
        this.selectedTournamentId = null;
    }

    /**
     * 快速填寫標準錦標賽
     */
    fillStandardTournament() {
        // 設置當前日期
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('tournament-date').value = today;

        // 填充常見值
        document.getElementById('tournament-name').value = 'Type限時賽 $3400';
        document.getElementById('buyin-amount').value = '3000';
        document.getElementById('addon-amount').value = '400'; // 行政費用

        // 焦點切換到獎金輸入框
        document.getElementById('prize-amount').focus();
    }

    /**
     * 匯出數據
     */
    exportData() {
        try {
            const data = this.dataHandler.getAllTournaments();

            if (!data || data.length === 0) {
                showToast('沒有數據可匯出', 'warning');
                return;
            }

            // 轉換為CSV格式 - 僅保留必要欄位
            const headers = ['日期', '名稱', '買入金額', '行政費用', '獎金', '盈虧'];
            let csvContent = headers.join(',') + '\n';

            data.forEach(tournament => {
                const profit = tournament.prizeAmount - (tournament.buyinAmount + tournament.addonAmount);
                const row = [
                    tournament.date,
                    `"${tournament.name}"`,
                    tournament.buyinAmount,
                    tournament.addonAmount || 0,
                    tournament.prizeAmount || 0,
                    profit
                ];
                csvContent += row.join(',') + '\n';
            });

            // 創建下載連結
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `poker_tournaments_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('數據已匯出', 'success');
        } catch (error) {
            console.error('匯出數據時出錯:', error);
            showToast('匯出數據時出錯: ' + error.message, 'danger');
        }
    }

    /**
     * 更新摘要信息
     */
    updateSummary() {
        try {
            const stats = this.dataHandler.getStatistics() || {
                totalTournaments: 0,
                totalProfit: 0,
                avgProfit: 0,
                roi: 0,
                profitableTournaments: 0
            };

            // 確保所有必要的值都存在，或使用默認值
            const totalProfit = stats.totalProfit || 0;
            const profitableTournaments = stats.profitableTournaments || 0;
            const totalTournaments = stats.totalTournaments || 0;
            const roi = typeof stats.roi === 'number' ? stats.roi : 0;

            // 更新 UI 元素
            document.getElementById('total-profit').textContent = formatCurrency(totalProfit);
            document.getElementById('profitable-sessions').textContent = `${profitableTournaments} / ${totalTournaments}`;
            document.getElementById('roi').textContent = `${roi.toFixed(2)}%`;
            document.getElementById('total-tournaments').textContent = totalTournaments.toString();

            // 設置顏色
            const totalProfitElement = document.getElementById('total-profit');
            if (totalProfit > 0) {
                totalProfitElement.classList.add('text-success');
                totalProfitElement.classList.remove('text-danger');
            } else if (totalProfit < 0) {
                totalProfitElement.classList.add('text-danger');
                totalProfitElement.classList.remove('text-success');
            } else {
                totalProfitElement.classList.remove('text-success', 'text-danger');
            }
        } catch (error) {
            console.error('更新摘要信息時出錯:', error);
            // 發生錯誤時使用默認值
            try {
                document.getElementById('total-profit').textContent = formatCurrency(0);
                document.getElementById('profitable-sessions').textContent = '0 / 0';
                document.getElementById('roi').textContent = '0.00%';
                document.getElementById('total-tournaments').textContent = '0';

                const totalProfitElement = document.getElementById('total-profit');
                totalProfitElement.classList.remove('text-success', 'text-danger');
            } catch (uiError) {
                console.error('在嘗試更新 UI 元素時發生錯誤:', uiError);
            }
        }
    }

    /**
     * 更新歷史表格
     */
    updateHistoryTable() {
        try {
            const tableBody = document.getElementById('history-table-body');
            if (!tableBody) {
                console.error('找不到歷史表格主體元素');
                return;
            }

            tableBody.innerHTML = '';

            const tournaments = this.dataHandler.getAllTournaments();

            if (!tournaments || tournaments.length === 0) {
                const emptyRow = document.createElement('tr');
                const emptyCell = document.createElement('td');
                emptyCell.colSpan = 6; // 設置為 6 列
                emptyCell.className = 'text-center';
                emptyCell.textContent = '尚無記錄';
                emptyRow.appendChild(emptyCell);
                tableBody.appendChild(emptyRow);
                return;
            }

            // 按日期排序，最新的排在前面
            const sortedTournaments = [...tournaments].sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });

            console.log('準備渲染的錦標賽數據:', sortedTournaments);
            const isMobile = window.innerWidth < 768;
            sortedTournaments.forEach(tournament => {
                const profit = tournament.prizeAmount - (tournament.buyinAmount + tournament.addonAmount);
                const profitClass = profit > 0 ? 'text-success' : (profit < 0 ? 'text-danger' : '');

                // 確保 ID 存在，如果沒有則使用時間戳作為備用
                const rowId = tournament.id || Date.now();

                const row = document.createElement('tr');
                row.dataset.id = rowId; // 使用 dataset.id 設置 data-id 屬性
                console.log(`為行設置 ID: ${rowId}`);

                // 日期
                const dateCell = document.createElement('td');
                dateCell.textContent = tournament.date;
                row.appendChild(dateCell);

                // 名稱
                const nameCell = document.createElement('td');
                nameCell.textContent = tournament.name;
                row.appendChild(nameCell);

                // 買入
                const buyinCell = document.createElement('td');
                buyinCell.textContent = formatCurrency(tournament.buyinAmount + (tournament.addonAmount || 0)); // 包含行政費用
                row.appendChild(buyinCell);

                // 獎金
                const prizeCell = document.createElement('td');
                prizeCell.textContent = formatCurrency(tournament.prizeAmount || 0);
                row.appendChild(prizeCell);

                // 盈虧
                const profitCell = document.createElement('td');
                profitCell.textContent = formatCurrency(profit);
                profitCell.className = profitClass;
                row.appendChild(profitCell);

                // 操作
                const actionsCell = document.createElement('td');
                if (isMobile) {
                    actionsCell.innerHTML = `
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${rowId}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn ms-1" data-id="${rowId}">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                }
                else {
                    actionsCell.innerHTML = `
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${rowId}">
                        <i class="bi bi-pencil"></i> 編輯
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn ms-1" data-id="${rowId}">
                        <i class="bi bi-trash"></i> 刪除
                    </button>
                `;
                }
                row.appendChild(actionsCell);

                tableBody.appendChild(row);
            });

            // 確保按鈕點擊事件正確綁定
            this.initializeTableEventListeners();

            // 應用移動端優化，使用可靠的錯誤處理
            if (typeof optimizeHistoryTableForMobile === 'function') {
                try {
                    optimizeHistoryTableForMobile();
                } catch (optimizeError) {
                    console.error('移動端表格優化失敗，但不影響主要功能:', optimizeError);
                }
            }
        } catch (error) {
            console.error('更新歷史表格時出錯:', error);
            // 嘗試顯示一個友好的錯誤信息
            try {
                const tableBody = document.getElementById('history-table-body');
                if (tableBody) {
                    tableBody.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    const errorCell = document.createElement('td');
                    errorCell.colSpan = 6;
                    errorCell.className = 'text-center text-danger';
                    errorCell.textContent = '載入數據時出錯，請刷新頁面重試';
                    errorRow.appendChild(errorCell);
                    tableBody.appendChild(errorRow);
                }
            } catch (displayError) {
                console.error('無法顯示錯誤信息:', displayError);
            }
        }
    }
} 