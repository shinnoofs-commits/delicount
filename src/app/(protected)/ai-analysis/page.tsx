
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransactions } from "@/contexts/transaction-context";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { Loader2, Sparkles, AlertCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from "react";
import type { WasteEntry, WeatherType } from "@/lib/types";
import { useProducts } from "@/contexts/product-context";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useStores } from "@/contexts/store-context";
import { getWasteInsights, type WasteInsightsOutput } from "@/ai/flows/waste-insights-flow";


export default function AiAnalysisPage() {
  const { wasteEntries, loading: wasteLoading } = useTransactions();
  const { products } = useProducts();
  const { userStore } = useStores();
  const { toast } = useToast();
  
  const [aiInsights, setAiInsights] = useState<WasteInsightsOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analyzedLabel, setAnalyzedLabel] = useState<string>('');

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredWasteEntries = useMemo(() => {
    if (!date || !date.from) return [];
    
    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return wasteEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= fromDate && entryDate <= toDate;
    });
  }, [date, wasteEntries]);


  const runAiAnalysis = useCallback(async (preset?: 'last_month' | 'this_month' | 'weekly') => {
    setIsAiLoading(true);
    let targetEntries: WasteEntry[] = [];
    let label = '';
    let from: Date, to: Date;

    const now = new Date();
    if (preset === 'last_month') {
      from = startOfMonth(subMonths(now, 1));
      to = endOfMonth(subMonths(now, 1));
      label = '先月 (' + format(from, 'M月') + ')';
    } else if (preset === 'this_month') {
      from = startOfMonth(now);
      to = endOfMonth(now);
      label = '今月 (' + format(from, 'M月') + ')';
    } else { // weekly
      from = subDays(now, 6);
      to = now;
      label = '直近7日間';
    }
    
    setDate({ from, to });
    targetEntries = wasteEntries.filter(e => {
      const d = new Date(e.date);
      return d >= startOfDay(from) && d <= endOfDay(to);
    });

    if (targetEntries.length === 0) {
      toast({ title: "データ不足", description: "指定された期間に廃棄データが見つかりません。" });
      setIsAiLoading(false);
      return;
    }

    try {
      const summary = {
        period: label,
        entriesCount: targetEntries.length,
        totalWasteCost: targetEntries.reduce((acc, e) => acc + e.totalWasteCost, 0),
        weatherImpact: targetEntries.reduce((acc: any, e) => {
          const w = e.weather || 'unknown';
          acc[w] = (acc[w] || 0) + e.totalWasteCost;
          return acc;
        }, {}),
        products: products.map(p => ({
          name: p.name,
          category: p.category,
          waste: targetEntries.reduce((sum, entry) => {
            const item = entry.items.find(i => i.productId === p.id);
            return sum + (item?.quantity || 0);
          }, 0)
        })).sort((a, b) => b.waste - a.waste).slice(0, 10)
      };

      const result = await getWasteInsights({
        summaryData: JSON.stringify(summary),
        storeName: userStore?.name
      });
      setAiInsights(result);
      setAnalyzedLabel(label);
      toast({ title: "分析完了", description: `${label}の分析が完了しました。` });
    } catch (e) {
      console.error('AI Insight error:', e);
      toast({ variant: "destructive", title: "分析エラー", description: "AIの分析に失敗しました。時間をおいてお試しください。" });
    } finally {
      setIsAiLoading(false);
    }
  }, [wasteEntries, products, userStore, toast]);


  if (wasteLoading || !isClient) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-2 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle>AIからの改善提案（β）</CardTitle>
                <CardDescription>
                  {aiInsights ? `${analyzedLabel} のデータを分析済み` : '通信節約のため、ボタンを押したときのみ分析を実行します。'}
                </CardDescription>
              </div>
            </div>
            {isAiLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-background/50 rounded-lg border">
            <span className="text-xs font-bold mr-2 text-muted-foreground">分析を実行:</span>
            <Button size="sm" variant="outline" onClick={() => runAiAnalysis('this_month')} disabled={isAiLoading} className="h-8 text-xs">
              今月を分析
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAiAnalysis('last_month')} disabled={isAiLoading} className="h-8 text-xs">
              先月を分析
            </Button>
            <Button size="sm" variant="default" onClick={() => runAiAnalysis('weekly')} disabled={isAiLoading} className="h-8 text-xs">
              <PlayCircle className="h-3 w-3 mr-1.5" />
              直近7日間を分析
            </Button>
          </div>

          {!aiInsights && !isAiLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
              <Sparkles className="h-10 w-10 mb-2 opacity-10" />
              <p className="text-sm font-medium">上のボタンから分析期間を指定してください。</p>
              <p className="text-[10px] opacity-60 mt-1">※通信量を抑えるため自動実行はオフになっています。</p>
            </div>
          ) : (
            <div className={cn("space-y-4 transition-opacity", isAiLoading && "opacity-50")}>
              {aiInsights?.summary && (
                <div className="bg-background/50 p-3 rounded-md border text-sm font-medium italic">
                  "{aiInsights.summary}"
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {aiInsights?.insights.map((insight, idx) => {
                  const typeColors = {
                    waste_reduction: "bg-red-100 text-red-700 border-red-200",
                    opportunity_loss: "bg-blue-100 text-blue-700 border-blue-200",
                    weather_pattern: "bg-orange-100 text-orange-700 border-orange-200",
                  };
                  return (
                    <Card key={idx} className="bg-background shadow-sm overflow-hidden flex flex-col">
                      <div className={cn("px-3 py-1 text-[10px] font-bold border-b", typeColors[insight.type as keyof typeof typeColors])}>
                        {insight.type.toUpperCase().replace('_', ' ')}
                      </div>
                      <CardContent className="p-3 flex-1 flex flex-col">
                        <p className="font-bold text-sm mb-1 leading-tight">{insight.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-2 flex-1">{insight.description}</p>
                        <div className="mt-auto space-y-2 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase">推定影響</span>
                            <span className="text-xs font-bold text-destructive">{insight.impact}</span>
                          </div>
                          <div className="flex items-center gap-1.5 p-1.5 bg-muted rounded text-[11px] font-bold">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span>{insight.action}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
