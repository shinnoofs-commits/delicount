# Deli・COUNT（デリカウント / SwiftPOS）システム仕様書 & 外部連携設計書

- **文書バージョン**: 4.1 (Production)
- **更新日**: 2026-10-26
- **対象読者**: システム管理者、開発エンジニア、店舗マネージャー

---

## 1. システム概要と仕組み

### 1.1. システムの目的
「Deli・COUNT（デリカウント）」は、惣菜・弁当店における**「値引き販売」**および**「廃棄ロス」**を日次・月次で可視化・分析し、粗利益を最大化する適正製造計画と、発注・製造管理システム「デリサポーター（DeliSupporter）」への実績自動連動を実現するクラウド型店舗DXシステムです。

### 1.2. 実製造数の自動算出原理
従来のPOSレジデータ単体では「店頭で実際に何個製造されたか」を把握できません。
デリカウントでは、店舗スタッフが入力した当日の廃棄データと、スマレジPOSの売上トランザクションデータをクラウド上で突き合わせ、以下の数式により手入力なしで正確な製造実績を確定します。

$$\text{実製造数} = \text{スマレジ総売上数} + \text{POS廃棄数}$$

---

## 2. システム全体アーキテクチャ

```mermaid
flowchart TD
    subgraph StoreFront["店舗現場 (Store)"]
        POS["スマレジ POSレジ<br/>(店頭販売・値引き)"]
        Tablet["タブレット端末<br/>(閉店後 廃棄入力)"]
    end

    subgraph DeliCountCloud["デリカウント (Cloud Backend)"]
        AppHosting["Firebase App Hosting<br/>(Next.js 15 App Router)"]
        CronJob["Google Cloud Scheduler<br/>(毎日 22:10 JST 実行)"]
        CronEndpoint["/api/cron/smaregi-import"]
        Firestore["Google Cloud Firestore<br/>(ボックス化 NoSQL DB)"]
    end

    subgraph ExternalServices["外部連携サービス"]
        SmaregiAPI["スマレジ Platform API<br/>(OAuth 2.0 /transactions)"]
        DeliSupporter["デリサポーター (DeliSupporter)<br/>Cloud Functions /productionOverrides"]
    end

    POS -->|日次取引蓄積| SmaregiAPI
    Tablet -->|廃棄数登録| AppHosting
    AppHosting -->|daily_wastes保存| Firestore

    CronJob -->|定期トリガー (22:10)| CronEndpoint
    CronEndpoint -->|OAuth2 トークン取得 & Fetch| SmaregiAPI
    SmaregiAPI -->|取引データ返却| CronEndpoint
    CronEndpoint -->|daily_transactions保存| Firestore

    CronEndpoint -->|売上 + 廃棄 ＝ 実製造数 算出| CronEndpoint
    CronEndpoint -->|POST /syncProductionActuals| DeliSupporter
    DeliSupporter -->|日別製造調整 & 週3回発注連動| DeliSupporter
```

---

## 3. 外部システム連携仕様

### 3.1. スマレジ（Smaregi Platform API）連携
* **認証方式**: OAuth 2.0 Client Credentials Grant
* **認証エンドポイント**: `https://id.smaregi.jp/app/{contract_id}/token`
* **APIエンドポイント**: `https://api.smaregi.jp/{contract_id}/pos/transactions`
* **実行スケジュール**: 毎日 22:10 JST（Google Cloud Scheduler: `smaregi-daily-import`）
* **店舗マッピング**:
  * スマレジ店舗コード `1` ➔ 港南台店 (`539lvCjZRUUrhxw1uy88`)
  * スマレジ店舗コード `2` ➔ 本厚木店 (`MyIPMYpz2OvqHJFH4zwc`)
  * スマレジ店舗コード `3` ➔ 西川口店 (`vBENyaqdzHcG6upmNIj6`)
* **値引き区分自動判別ロジック**:
  * 明細から単品値引き（20%引, 30%引, 40%引, 定額値引き）を判定。
  * 合計按分値引き（クーポンや全体割引）を明細比率で按分。
  * キャンセル・返品伝票（`status: cancel`）は自動除外。

---

### 3.2. デリサポーター（DeliSupporter）連携
* **目的**: デリサポーターの「日別製造調整（`productionOverrides`）」への製造実績登録、および原材料在庫消費・発注数自動更新。
* **エンドポイント (本番)**: `https://asia-northeast1-fir-01278470-c0ea3.cloudfunctions.net/syncProductionActuals`
* **エンドポイント (ローカル)**: `http://localhost:3000/api/sync/production`
* **認証**: HTTP Header `x-api-key: delicount-sync-secret-2026`
* **送信ペイロード**:
```json
{
  "storeId": "hon-atsugi",
  "date": "2026-10-20",
  "dryRun": false,
  "items": [
    {
      "productCode": "40092",
      "productName": "和牛すき焼きとだし巻き玉子御膳",
      "sales": 17,
      "waste": 0,
      "quantity": 17
    },
    {
      "productCode": "20351",
      "productName": "横濱塩唐揚げ　4個入り",
      "sales": 0,
      "waste": 2,
      "quantity": 2
    }
  ]
}
```
* **商品コード正規化ルール**: デリサポーター側のマスタ形式に合わせ、**先頭ゼロを除去した形式**（`0101` → `101`, `040092` → `40092`）で連携。
* **仕入先納品日設定と週3回発注スケジュール連動**:
  * 主要資材・包材仕入先（スミダパッケージ、オカベ）の納品可能曜日は**「火曜・木曜・土曜」**（納品不可: 日・月・水・金）。
  * デリカウントから製造実績が連携されると、デリサポーター側の発注エンジン（`calculateDeliveryDate`）が直前の納品日に使用量を集約し、必要発注数を自動更新。
  * **発注運用サイクル**:
    1. **金曜 22:10 実績確定**: 翌週 火・水 製造分 ➔ **火曜 納品**
    2. **日曜 22:10 実績確定**: 翌週 木・金 製造分 ➔ **木曜 納品**
    3. **火曜 22:10 実績確定**: 週末 土・日・翌月 製造分 ➔ **土曜 納品**

---

## 4. アプリケーション機能仕様

### 4.1. 廃棄クロス分析（`/abc-analysis`）
* **同一商品名の名寄せ統合**:
  商品コードやIDに変更履歴がある場合でも、正規化された商品名（全角半角スペース除去、全角括弧正規化、小文字化）をキーとして1行に統合集計。
* **値引き率別個数の明記とソート**:
  「定価販売」「20%引」「30%引」「40%引」の各カラムに**個数（点数）と率（%）を併記**（例: `15個 (6.2%)`）。ヘッダークリックで各値引き率の販売個数順で昇順・降順ソート可能。
* **上部サマリーKPIカード**:
  値引販売率（%）と全合計個数、およびヘッダー部に `20%: X / 30%: Y / 40%: Z` の内訳を常時表示。
* **商品詳細ポップアップ**:
  商品名クリック時にモーダルを表示し、定価、20%引、30%引、40%引、廃棄の各数量と構成バーをグラフ表示。
* **CSV出力**:
  画面の全集計項目（定価、各値引区分個数・率、廃棄個数・金額・率、実質売上、粗利など）を完全一致でCSVエクスポート。

### 4.2. その他の分析・管理機能
* **廃棄入力 (`/pos`)**: タッチUIによる天候選択、カテゴリー別数量入力、日別廃棄保存。
* **ダッシュボード (`/dashboard`)**: 本日の売上・粗利・ロス金額、重要KPIサマリー。
* **詳細クロス分析 (`/cross-analysis`)**: 曜日×天候マトリクス集計による廃棄傾向特定。
* **AI偏差値分析 (`/score-analysis`)**: カテゴリ内での収益力・消化率・ロス耐性の偏差値（T-Score）化。
* **比較分析 (`/compare-analysis`)**: 前月・前年・店舗間（本厚木 vs 港南台）比較。
* **商品マスタ (`/products`)**: 部門別ボックス管理、晴雨×各曜日別の標準製造数、CSV一括インポート/エクスポート。
* **システム管理 (`/system`)**: JSONバックアップ/復元、デリサポ連携シミュレーション（Dry-Run）および本番送信。

---

## 5. データベース設計（NoSQL ボックスアーキテクチャ）

Firestoreの読み取り回数を削減し、1ヶ月間の大量トランザクション集計でも高速にレスポンスするため、日別・部門別にドキュメントを集約する「ボックス設計」を採用しています。

* `stores/{storeId}/daily_transactions/{YYYY-MM-DD}`: 当日の全取引トランザクション配列
* `stores/{storeId}/daily_wastes/{YYYY-MM-DD}`: 当日の廃棄入力明細配列＋天候データ
* `stores/{storeId}/product_boxes/{category}`: 部門ごとの商品マスタ＋曜日・天候別標準製造数
* `users/{userId}`: ユーザー基本情報および権限（`SYSTEM_ADMIN` / `USER`）
* `stores/{storeId}`: 店舗基本情報およびスマレジ店舗ID設定
