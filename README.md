# 打字練習 · Typing Trainer

一個統一嘅打字練習網頁 App：粵語（SGPB 雙拼）、韓文（두벌식）、西班牙文（重音唔使特登打），
同一套 UI、同一套練習流程。純前端，進度儲喺瀏覽器 localStorage，唔使開戶口、冇後端。

Live site: GitHub Pages（`https://<user>.github.io/typing-trainer/`）

## 點樣跑

```bash
npm install
npm run dev     # 本地開發，http://localhost:5173/typing-trainer/
npm run build   # TypeScript + Vite 生產 build（輸出 dist/）
npm run preview # 預覽生產 build
```

## 功能

- **每課 10 個詞**：粵語 6,000 詞 / 600 課，韓文 6,000 詞 / 600 課，西班牙文（試行版詞庫，見下）。
- **練習流程**：答啱即進下一詞；打錯會震一震、計錯數；完成一課有總結（準確率、用時、錯字）。
- **順序 / 隨機**：每課可以順序或者隨機練。
- **進度格**：全部課數一目了然，撳一課即練。
- **統計**：準確率、完成課數、累計詞數、錯得最多嘅詞、最近完成嘅課。
- **字典**：搜尋字、拼音、雙拼碼、英文等，撳「練呢個字」直接跳去練。
- **鍵盤 / 認鍵記憶卡**：每個語言嘅鍵位表 + 每鍵一張記憶卡（可隨機抽卡測驗）。
- **深色模式**：右上角切換，偏好會記住。
- **手機優先**：練習畫面用 `visualViewport` 高度，唔會畀螢幕鍵盤遮住個字、輸入框或者提示。

## 語言插件架構

加一種新語言 = **一個資料夾 + 一份詞庫**，唔使改 core：

```
src/
  core/            # 共享引擎：關卡、練習流程、儲存、Hangul 拆字
    types.ts       # LanguageAdapter 介面、WordView、進度型別
    hangul.ts      # 韓文字節拆做字母（자모提示）
    storage.ts     # localStorage（每種語言獨立命名空間）
  hooks/
    usePractice.ts # 練習引擎：答啱進階、錯咗震動、完成總結、儲存
    useVisualViewport.ts
  languages/       # 每種語言一個 adapter
    cantonese/adapter.ts
    korean/adapter.ts
    spanish/adapter.ts
    index.ts       # 註冊表：加語言就係呢度加一行
  data/
    cantonese-words.json   # 6,000 詞（verbatim）
    korean-words.json      # 6,000 詞（verbatim）
    spanish-words.json     # ⚠️ 試行版 55 詞 STUB，待真實 6,000 詞詞庫取代
  components/      # 共享 UI（練習卡、關卡格、統計、字典、鍵盤、主頁）
    ui/            # shadcn 風格組件（手寫，Tailwind + Radix）
```

每個 adapter 提供：

- `words: WordView[]` — 全部詞，UI 淨係用呢個統一形狀
- `matches(input, word)` — 點樣判斷答啱（粵語：SGPB 碼；韓文：韓文全等；西班牙文：去重音比較）
- `keymapGroups` / `keyCards` — 鍵位表同認鍵記憶卡
- `inputProps` — 輸入框屬性（唔自動大寫、唔自動改正等）

### 點樣加新語言

1. 將詞庫放喺 `src/data/<id>-words.json`（`items` 陣列）。
2. 喺 `src/languages/<id>/adapter.ts` 實現 `LanguageAdapter`（參考西班牙文 adapter，最簡單）。
3. 喺 `src/languages/index.ts` 註冊。
4. 詞數唔使係 6,000——關卡數 = `ceil(詞數 / 10)`，自動計。

## 各語言行為

| 語言 | 打咩 | 卡片顯示 | 鍵盤 |
| --- | --- | --- | --- |
| 粵語 | SGPB 雙拼碼（拉丁字母） | 粵語拼音**放大、橙紅色**喺上面；普通話拼音細啲、灰色喺下面；例句 + 英文 | SGPB 鍵位：聲母本身（gw→R、kw→U、ng→V），韻母按元音家族分組；26 張認鍵卡 |
| 韓文 | 韓文（두벌식），有字母提示 | 韓文大字，羅馬拼音橙紅色，中文釋義行先再英文，品詞，例句 + 翻譯 | 두벌식鍵位表；26 張認鍵卡 |
| 西班牙文 | 西班牙文，**唔使打重音** | 中文釋義行先再英文，例句 + 翻譯；永遠顯示正確重音寫法 | 重音指南（a→á、n→ñ、u→ü…） |

## 兩個硬教訓（唔好 regress）

1. **練習畫面要 fit 得落螢幕鍵盤上面**：`useVisualViewport` 監聽 `visualViewport`，
   將可見高度寫入 `--vv` CSS 變數；練習畫面高度 = `var(--vv)`（減去頂欄），輸入框
   固定喺可見範圍底部。
2. **每個詞用一個全新嘅 input 元素**：`PracticeScreen` 入面嘅 `<input>` 用
   `key={`${adapter.id}:${level}:${sessionId}:${index}`}`，React 每次換詞都會
   remount，IME 嘅組字狀態唔會由上一個詞漏落下一個詞度造成假錯誤。

## 詞庫來源（verbatim，唔好改）

- 粵語：`sgpb-6000-words.json`（rime-cantonese Jyutping + CC-CEDICT + SGPB 雙拼碼）。
- 韓文：`korean-words.json`（TOPIK 官方學習者詞表 + 頻率補充）。
- 西班牙文：而家係 **55 詞試行版**（`"_stub": true`），完整 6,000 詞詞庫到咗之後
  直接取代 `src/data/spanish-words.json` 就得，adapter 係通用讀取，唔會 hardcode 詞數。

## 部署

`.github/workflows/deploy.yml`：push 到 `main` 就自動 `npm ci` → `npm run build` →
deploy 去 GitHub Pages。Vite `base` 係 `/typing-trainer/`（如果 repo 改名，喺
`vite.config.ts` 改埋）。
