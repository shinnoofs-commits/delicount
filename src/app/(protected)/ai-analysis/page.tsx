'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * AI偏差値分析への統合リダイレクト
 * メニューの「AI偏差値分析（/score-analysis）」へ一本化されたため、
 * /ai-analysis へのアクセスを /score-analysis へ自動転送します。
 */
export default function AiAnalysisPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/score-analysis');
  }, [router]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-bold text-muted-foreground">AI偏差値分析画面へ移動しています...</p>
    </div>
  );
}
