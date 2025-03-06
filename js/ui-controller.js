class UIController {
    constructor(dataHandler) {
        this.dataHandler = dataHandler;
        this.form = document.getElementById('limitedTournamentForm');
        this.blindLevelsContainer = document.querySelector('.blinds-container');
        this.addBlindLevelButton = document.getElementById('addBlindLevel');
        this.quickFillButton = document.getElementById('quickFillBtn');
        this.currentEditId = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 表單提交處理
        this.form.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // 加入盲注級別
        // this.addBlindLevelButton.addEventListener('click', this.addBlindLevelField.bind(this));
        
        // 快速填寫CTP標準賽
        this.quickFillButton.addEventListener('click', this.fillStandardTournament.bind(this));
        
        // 自動計算淨收益
        document.getElementById('tournament-buyin').addEventListener('input', this.calculateProfit.bind(this));
        document.getElementById('tournament-fee').addEventListener('input', this.calculateProfit.bind(this));
        document.getElementById('tournament-prize').addEventListener('input', this.calculateProfit.bind(this));
    }
    
    // 處理編輯記錄
    handleEditTournament(e) {
        const id = Number(e.target.dataset.id);
        const tournament = this.dataHandler.getTournament(id);
        if (!tournament) return;

        // 填充表單
        document.getElementById('tournament-date').value = tournament.date;
        document.getElementById('tournament-venue').value = tournament.venue;
        document.getElementById('tournament-hours').value = tournament.hours;
        document.getElementById('tournament-buyin').value = tournament.buyin;
        document.getElementById('tournament-fee').value = tournament.fee;
        document.getElementById('tournament-prize').value = tournament.prize;
        document.getElementById('tournament-notes').value = tournament.notes || '';
        document.getElementById('tournament-profit').value = tournament.netProfit;

        // 更改提交按鈕文字
        const submitBtn = this.form.querySelector('button[type="submit"]');
        submitBtn.textContent = '更新記錄';
        
        // 儲存當前編輯的ID
        this.currentEditId = id;
        
        // 滾動到表單
        this.form.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 處理表單提交
    handleFormSubmit(e) {
        e.preventDefault();
        
        const tournamentData = {
            date: document.getElementById('tournament-date').value,
            venue: document.getElementById('tournament-venue').value,
            hours: Number(document.getElementById('tournament-hours').value),
            buyin: Number(document.getElementById('tournament-buyin').value),
            fee: Number(document.getElementById('tournament-fee').value),
            prize: Number(document.getElementById('tournament-prize').value),
            notes: document.getElementById('tournament-notes').value
        };

        if (this.currentEditId) {
            // 更新現有記錄
            this.dataHandler.updateTournament(this.currentEditId, tournamentData);
            this.currentEditId = null;
            const submitBtn = this.form.querySelector('button[type="submit"]');
            submitBtn.textContent = '儲存記錄';
        } else {
            // 添加新記錄
            this.dataHandler.addTournament(tournamentData);
        }

        // 重置表單但保留當前日期和場地
        const currentDate = document.getElementById('tournament-date').value;
        const currentVenue = document.getElementById('tournament-venue').value;
        this.form.reset();
        document.getElementById('tournament-date').value = currentDate;
        document.getElementById('tournament-venue').value = currentVenue;

        // 更新UI
        this.updateSummary();
        this.updateHistoryTable();
        chartManager.updateAllCharts();
    }
    
    // 添加盲注級別欄位
    addBlindLevelField() {
        const levelCount = document.querySelectorAll('input[name="blindLevel"]').length + 1;
        
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-3 mb-2';
        
        colDiv.innerHTML = `
            <div class="input-group">
                <span class="input-group-text">級別${levelCount}</span>
                <input type="text" class="form-control" placeholder="${levelCount*100*2}/${levelCount*100*4}" name="blindLevel">
            </div>
        `;
        
        this.blindLevelsContainer.appendChild(colDiv);
    }
    
    // 重置盲注級別欄位
    resetBlindLevelFields() {
        this.blindLevelsContainer.innerHTML = `
            <div class="col-md-3 mb-2">
                <div class="input-group">
                    <span class="input-group-text">級別1</span>
                    <input type="text" class="form-control" placeholder="100/200" name="blindLevel">
                </div>
            </div>
            <div class="col-md-3 mb-2">
                <div class="input-group">
                    <span class="input-group-text">級別2</span>
                    <input type="text" class="form-control" placeholder="200/400" name="blindLevel">
                </div>
            </div>
            <div class="col-md-3 mb-2">
                <div class="input-group">
                    <span class="input-group-text">級別3</span>
                    <input type="text" class="form-control" placeholder="300/600" name="blindLevel">
                </div>
            </div>
        `;
    }
    
    // 填充標準賽資料
    fillStandardTournament() {
        const template = this.dataHandler.getTournamentTemplate('standard');
        if (template) {
            document.getElementById('tournament-venue').value = template.venue;
            document.getElementById('tournament-hours').value = template.hours;
            document.getElementById('tournament-buyin').value = template.buyin;
            document.getElementById('tournament-fee').value = template.fee;
            
            // 設置今天的日期
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('tournament-date').value = today;
            
            // 設置焦點到獎金欄位
            document.getElementById('tournament-prize').focus();
            
            // 計算淨收益
            this.calculateProfit();
        }
    }
    
    // 計算淨收益
    calculateProfit() {
        const buyin = Number(document.getElementById('tournament-buyin').value) || 0;
        const fee = Number(document.getElementById('tournament-fee').value) || 0;
        const prize = Number(document.getElementById('tournament-prize').value) || 0;
        
        const profit = prize - (buyin + fee);
        document.getElementById('tournament-profit').value = profit;
    }
    
    // 處理刪除記錄
    handleDeleteTournament(e) {
        const id = Number(e.target.dataset.id);
        if (confirm('確定要刪除這筆記錄嗎？')) {
            this.dataHandler.deleteTournament(id);
            this.updateSummary();
            this.updateHistoryTable();
            chartManager.updateAllCharts();
        }
    }

    // 更新歷史記錄表格
    updateHistoryTable() {
        const tableBody = document.getElementById('historyTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        
        const allTournaments = this.dataHandler.getAllTournaments();
        
        allTournaments.forEach(tournament => {
            const row = tableBody.insertRow();
            
            row.insertCell(0).textContent = tournament.date;
            row.insertCell(1).textContent = tournament.venue;
            row.insertCell(2).textContent = this.formatCurrency(tournament.buyin);
            row.insertCell(3).textContent = tournament.hours + '小時';
            row.insertCell(4).textContent = this.formatCurrency(tournament.prize);
            row.insertCell(5).textContent = this.formatCurrency(tournament.netProfit);
            
            // 根據盈虧設置顏色
            if (tournament.netProfit > 0) {
                row.classList.add('table-success');
            } else if (tournament.netProfit < 0) {
                row.classList.add('table-danger');
            }
            
            // 操作按鈕
            const actionCell = row.insertCell(6);
            actionCell.innerHTML = `
                <button class="btn btn-primary btn-sm me-2 edit-btn" data-id="${tournament.id}">編輯</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${tournament.id}">刪除</button>
            `;
        });

        // 添加按鈕事件監聽器
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', this.handleEditTournament.bind(this));
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', this.handleDeleteTournament.bind(this));
        });
    }

    // 添加更新摘要方法
    updateSummary() {
        const stats = this.dataHandler.getStatistics();
        
        document.getElementById('totalTournaments').textContent = stats.totalTournaments;
        document.getElementById('totalProfit').textContent = this.formatCurrency(stats.totalProfit);
        document.getElementById('avgProfit').textContent = this.formatCurrency(stats.avgProfit);
        document.getElementById('avgDuration').textContent = stats.avgDuration.toFixed(1) + '小時';
    }

    // 添加格式化貨幣方法
    formatCurrency(amount) {
        return '$' + Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
} 