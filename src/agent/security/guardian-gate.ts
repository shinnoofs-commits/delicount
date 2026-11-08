/**
 * @fileOverview S-Guardian Gate for S-Delicount (S-Count Agent)
 * 水際セキュリティ防御ゲート
 * 既存システムへの影響を完全にゼロにし、不正な命令・攻撃をGemini到達前に即時遮断します。
 */

export interface GuardianCheckResult {
  allowed: boolean;
  reason?: string;
  threatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'PROMPT_INJECTION' | 'CREDENTIAL_THEFT' | 'DATA_MUTATION' | 'UNAUTHORIZED_ACCESS';
}

// 1. プロンプトインジェクション検知パターン
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /これまでの指示(を|は)?(すべて|全て)?(無視|忘れて|破棄)/,
  /システム(プロンプト|設定|指示|命令)を(表示|出力|教えて|開示)/,
  /system\s+prompt/i,
  /you\s+are\s+now\s+a/i,
  /今からあなたは.*として振る舞ってください/,
  /jailbreak/i,
  /DAN\s+mode/i,
];

// 2. 機密情報・クレデンシャル窃盗検知パターン
const CREDENTIAL_THEFT_PATTERNS = [
  /(api[_-]?key|secret[_-]?key|client[_-]?secret|password|token)/i,
  /パスワード(を|は)?(教えて|表示|出力|一覧)/,
  /認証情報(を|は)?(開示|教えて|表示)/,
  /smaregi.*(secret|client_secret|契約ID)/i,
  /firebase.*(api_key|service_account)/i,
  /\.env(\.local)?/,
];

// 3. データ改ざん・破壊・強制操作検知パターン（完全Read-Onlyを死守）
const MUTATION_PATTERNS = [
  /(データベース|データ|レコード|マスタ|コレクション).*(削除|消去|ドロップ|truncate|リセット)/i,
  /(delete|drop|remove|truncate|clear).*(database|collection|record|table)/i,
  /(売上|廃棄|値引き|取引).*(データを|を)?(書き換え|改ざん|更新|上書き|消して)/,
  /(強制|無断).*(発注|実行|送信)/,
  /update\s+.*set\s+/i,
  /insert\s+into/i,
];

/**
 * ユーザー入力を多層検査し、安全なもののみ通過させる
 */
export function inspectInput(userMessage: string): GuardianCheckResult {
  const normalized = userMessage.trim();

  // 空入力チェック
  if (!normalized) {
    return {
      allowed: false,
      reason: '入力が空です。',
      threatLevel: 'LOW',
    };
  }

  // 1. プロンプトインジェクション検査
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: '【S-Guardian 遮断】プロンプトインジェクションまたはシステム指示改ざんの試行を検知しました。',
        threatLevel: 'CRITICAL',
        category: 'PROMPT_INJECTION',
      };
    }
  }

  // 2. 機密情報・クレデンシャル窃盗検査
  for (const pattern of CREDENTIAL_THEFT_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: '【S-Guardian 遮断】パスワード、認証情報、APIキーなどの機密情報へのアクセス試行を検知しました。',
        threatLevel: 'HIGH',
        category: 'CREDENTIAL_THEFT',
      };
    }
  }

  // 3. データ改ざん・破壊検査
  for (const pattern of MUTATION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: '【S-Guardian 遮断】データベースの更新・削除・改ざん操作は安全のため物理的に遮断されています（完全Read-Only）。',
        threatLevel: 'CRITICAL',
        category: 'DATA_MUTATION',
      };
    }
  }

  // すべてクリア
  return {
    allowed: true,
    threatLevel: 'NONE',
  };
}
