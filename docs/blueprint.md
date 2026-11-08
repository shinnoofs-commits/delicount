# **App Name**: Deli・COUNT (SwiftPOS / 値引き廃棄アプリ)

## Core Features:

- **Waste Entry (廃棄入力 `/pos`)**: Touch-friendly UI for recording end-of-day discarded items by category with weather conditions. Automatically creates daily box documents (`daily_wastes`).
- **Waste Cross Analysis (廃棄クロス分析 `/abc-analysis`)**:
  - Automatically merges identical product names (removes variations in half/full-width spaces and brackets) into single aggregated rows.
  - Displays both quantity and rate for regular sales and each discount bracket: 20% OFF, 30% OFF, 40% OFF.
  - Clickable column headers allow direct sorting by sales quantities for each discount rate.
  - Displays sales composition bars and breakdown tooltips.
  - Full-column CSV export matching on-screen data.
- **Detailed Analytics**:
  - Cross Analysis (`/cross-analysis`): Matrix analysis by day-of-week and weather.
  - AI Score Analysis (`/score-analysis`): T-score ranking of profitability and waste resistance.
  - Compare Analysis (`/compare-analysis`): Inter-store and period comparison.
- **Product Management (`/products`)**: Category box structure, sunny/rainy x day-of-week standard production plans, CSV bulk import/export.
- **System Administration (`/system`)**: JSON backup/restore for single or all stores, DeliSupporter sync simulation (Dry-Run) and immediate production push, daily box migration.
- **User and Permissions Management**: Multi-store administration (`SYSTEM_ADMIN`) and store-restricted staff accounts (`USER`).

## External Integrations:

- **Smaregi POS API Integration**: 
  - Automatically fetches daily transaction data from Smaregi Platform API via OAuth2 (Client Credentials Grant).
  - Fetched data is parsed, categorized into single-item discounts (20%, 30%, 40%) and proportional discounts, and stored in Firestore (`daily_transactions`).
  - Automatic store mapping dynamically matches Smaregi Store IDs (`1` = 港南台, `2` = 本厚木, `3` = 西川口).
  - Implemented as a Next.js Serverless API Route (`/api/cron/smaregi-import`) running under Firebase App Hosting, protected by a Bearer Token (`CRON_SECRET`).
  - Automated execution via Google Cloud Scheduler scheduled at **22:10 JST daily**.

- **DeliSupporter (デリサポーター) Integration**:
  - Daily actual production quantity is automatically calculated as: `Production Quantity = Sales Quantity + Waste Quantity`.
  - Transmitted to DeliSupporter Cloud Functions (`syncProductionActuals`) and saved to `productionOverrides`.
  - Normalized product codes (leading zeros stripped, e.g., `0101` -> `101`).
  - Directly drives DeliSupporter's 3-times-a-week ordering schedule for key packaging suppliers (Sumida Package, Okabe) with Tuesday/Thursday/Saturday delivery.

## Style Guidelines:

- Primary color: Soft Blue (#A0D2EB) and Vibrant Orange for actionable metrics.
- Background color: Clean light gray / slate (#F8FAFC) to ensure clarity and readability.
- Clear visual indicators: Emerald for regular sales, Orange for discounts, Destructive Red for waste and losses.
- Modern dashboard UI with responsive table layouts, dialog popups, and instant search/filtering.