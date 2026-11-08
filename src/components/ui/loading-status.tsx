'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, ShoppingBag } from 'lucide-react';

const messages = [
  "データを集計しています...",
  "天気と曜日の関連性を調べています...",
  "最適な製造計画のシミュレーションを行っています...",
  "前日の値引き残存率を算出中...",
  "ベーカリーAIが改善提案を焼き上げています...",
  "ダッシュボードを組み立てています...",
];

export function LoadingStatus({ label }: { label?: string }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6 animate-fade-in">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 w-16 h-16 h-16 rounded-full border-4 border-primary/20 animate-ping" />
        <div className="bg-primary/10 p-5 rounded-full border border-primary/25 shadow-inner">
          <Sparkles className="h-10 w-10 text-primary animate-bounce" />
        </div>
      </div>
      
      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-extrabold tracking-tight text-foreground">
          {label || "分析の準備を行っています"}
        </h3>
        <p className="text-sm font-bold text-muted-foreground animate-pulse">
          {messages[msgIdx]}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );
}
