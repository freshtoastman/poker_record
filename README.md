# 撲克營收追蹤器

一個簡單的網頁應用，用於追蹤和分析撲克遊戲的營收表現。

## 功能

- 上傳CSV/Excel文件導入數據
- 手動輸入撲克遊戲記錄
- 查看營收時間趨勢圖表
- 分析不同遊戲類型的表現
- 查看歷史記錄和統計摘要

## 使用方法

1. 通過CSV/Excel上傳批量數據，或使用表單手動輸入記錄
2. 查看自動生成的圖表和統計資訊
3. 所有數據保存在本地瀏覽器中

## CSV/Excel格式

上傳的文件應包含以下列：
- date: 日期 (YYYY-MM-DD)
- gameType: 遊戲類型
- revenue: 營收金額
- duration: 遊戲時長(小時)

## 技術實現

- 純HTML/CSS/JavaScript前端實現
- 使用Chart.js生成圖表
- 使用localStorage保存數據
- 使用SheetJS庫處理Excel/CSV文件 