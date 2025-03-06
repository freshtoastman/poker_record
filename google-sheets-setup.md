# Google Sheets API 設置指南

本應用可以選擇使用 Google 試算表作為數據庫，或者使用瀏覽器本地存儲。如果您想使用 Google 試算表功能，您需要完成以下幾個步驟：

## 0. 選擇存儲方式

打開應用後，系統會詢問您使用哪種存儲方式：
- **使用 Google 試算表**：您的數據將存儲在雲端，可以在多個設備間同步
- **使用本地存儲**：您的數據將只保存在當前瀏覽器中

如果您選擇使用本地存儲，則無需進行以下設置。如果您想使用 Google 試算表，請繼續閱讀以下步驟。

## 1. 創建 Google 試算表

1. 登入您的 Google 帳戶，前往 [Google 試算表](https://sheets.google.com/)
2. 創建一個新的試算表
3. 創建兩個工作表：
   - 第一個工作表命名為 `Users`（用於存儲用戶列表）
   - 系統會自動為每個用戶創建一個名為 `Tournaments_用戶名` 的工作表

## 2. 獲取試算表 ID

1. 在您的試算表 URL 中找到試算表 ID，URL 格式如下：
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=0
   ```
2. 複製 `YOUR_SPREADSHEET_ID` 部分，以便稍後使用

## 3. 設置 Google Cloud 項目並啟用 API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建一個新項目
3. 在側邊欄選擇 "APIs & Services" -> "Library"
4. 搜索 "Google Sheets API" 並啟用
5. 回到 "APIs & Services" -> "Credentials"
6. 點擊 "Create Credentials" 並選擇 "API Key"
7. 複製生成的 API 密鑰
8. 點擊 "Create Credentials" 並選擇 "OAuth client ID"
9. 選擇 "Web application" 作為應用類型
10. 在 "Authorized JavaScript origins" 中添加您的網站 URL（或者開發時使用 `http://localhost:8000`）
11. 點擊 "Create" 並複製生成的客戶端 ID

## 4. 配置應用程序

1. 打開 `js/sheets-data-handler.js` 文件
2. 找到以下代碼段：
   ```javascript
   // Google API 密鑰和客戶端ID (請在實際使用時替換為您自己的密鑰)
   this.API_KEY = 'YOUR_API_KEY';
   this.CLIENT_ID = 'YOUR_CLIENT_ID';
   this.SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
   ```
3. 將 `YOUR_API_KEY`、`YOUR_CLIENT_ID` 和 `YOUR_SPREADSHEET_ID` 替換為您之前獲取的相應值

## 5. 設置試算表權限

1. 回到您的 Google 試算表
2. 點擊右上角的 "Share" 按鈕
3. 確保設置適當的權限，以便您的應用程序可以訪問試算表
4. 如果您是使用 API Key，則需要將試算表設為公開（提醒：這意味著任何人都可以讀取您的數據）
5. 如果您是使用 OAuth，則試算表可以保持私有，因為用戶將通過自己的 Google 帳戶授權訪問

## 6. 測試您的設置

1. 在完成以上設置後，打開您的應用
2. 應用將引導您登入 Google 帳戶
3. 授權後，您應該能夠創建用戶並開始使用 Google 試算表作為數據庫

## 在本地存儲和 Google Sheets 之間切換

- 如果您想從本地存儲切換到 Google Sheets，只需完成上述設置步驟，然後重新加載應用
- 如果您想從 Google Sheets 切換回本地存儲，可以點擊初始化時的"使用本地存儲"按鈕
- 注意：兩種存儲方式的數據不會自動同步。如果您需要遷移數據，建議使用匯出/匯入功能

## 注意事項

- 在生產環境中，您應該設置 API 密鑰限制，以增強安全性
- 考慮實施額外的安全措施，如數據加密
- 定期備份您的試算表數據
- Google Sheets API 有使用限制，如果您的應用使用頻率高，可能需要升級到付費方案或考慮使用其他數據庫解決方案 