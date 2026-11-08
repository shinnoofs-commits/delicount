'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStores } from '@/contexts/store-context';
import { useFirestore } from '@/firebase';
import { writeBatch, doc, collection, getDocs, getDoc, query } from 'firebase/firestore';
import { Transaction, Product, TransactionItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase/provider';
import { POSBackupService, POSBackupMetadata } from '@/lib/backup-service';
import { useEffect, useMemo } from 'react';
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle, Database, Trash2, History, RotateCcw, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetStoreId, setTargetStoreId] = useState<string>('');
  const [importMode, setImportMode] = useState<'single' | 'auto'>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ txCount: number; productCount: number } | null>(null);
  const [multiStats, setMultiStats] = useState<Record<string, { txCount: number; productCount: number; name: string }> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { stores } = useStores();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [backups, setBackups] = useState<POSBackupMetadata[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  const backupService = useMemo(() => {
    if (!firestore || !storage) return null;
    return new POSBackupService(firestore, storage);
  }, [firestore, storage]);

  const loadBackups = async () => {
    if (!backupService || !targetStoreId) return;
    try {
      const history = await backupService.listBackups(targetStoreId);
      setBackups(history);
    } catch (e) {
      console.error("Failed to load backups", e);
    }
  };

  useEffect(() => {
    if (targetStoreId) {
      loadBackups();
    }
  }, [targetStoreId, backupService]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStats(null);
    }
  };

  const processImport = async () => {
    if (!file || !firestore) return;
    if (importMode === 'single' && !targetStoreId) {
      toast({ variant: 'destructive', title: 'エラー', description: 'インポート先の店舗を選択してください。' });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStats(null);
    setMultiStats(null);

    // 1. 対象店舗IDマッピングの構築
    const csvStoreIdMap: Record<number, string> = {};
    const targetStoreIds = new Set<string>();

    if (importMode === 'auto') {
      stores.forEach(s => {
        if (s.name.includes('港南台')) { csvStoreIdMap[1] = s.id; targetStoreIds.add(s.id); }
        else if (s.name.includes('本厚木')) { csvStoreIdMap[2] = s.id; targetStoreIds.add(s.id); }
        else if (s.name.includes('西川口')) { csvStoreIdMap[3] = s.id; targetStoreIds.add(s.id); }
      });
      if (targetStoreIds.size === 0) {
        toast({ variant: 'destructive', title: '店舗マッピングエラー', description: 'データベース上に港南台・本厚木・西川口のいずれの店舗も見つかりません。' });
        setIsProcessing(false);
        return;
      }
    } else {
      targetStoreIds.add(targetStoreId);
    }

    // 2. 自動バックアップの作成
    try {
      if (backupService) {
        for (const sId of targetStoreIds) {
          await backupService.createBackup(sId);
        }
        if (targetStoreId) {
          loadBackups();
        }
      }
    } catch (e) {
      console.error("Backup failed, still proceeding with import", e);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(buffer);

      let encoding = 'utf-8';
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        decoder.decode(uint8Array);
      } catch (e) {
        encoding = 'shift-jis'; 
      }

      const decoder = new TextDecoder(encoding);
      const content = decoder.decode(uint8Array);

      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: async (results) => {
          try {
            const data = results.data as any[];
            
            // storeId -> txId -> rows
            const storeTransactionsMap = new Map<string, Map<string, any[]>>();

            // 1. Group rows by store and txId
            data.forEach(row => {
              const txId = String(row['取引ID'] || '');
              if (!txId) return;

              const csvStoreNum = Number(row['店舗ID'] || 0);
              const storeId = importMode === 'auto' ? csvStoreIdMap[csvStoreNum] : targetStoreId;
              if (!storeId) return; // 対象外の店舗はスキップ

              // Initialize maps for storeId if not exists
              if (!storeTransactionsMap.has(storeId)) {
                storeTransactionsMap.set(storeId, new Map());
              }

              const txMap = storeTransactionsMap.get(storeId)!;

              if (!txMap.has(txId)) {
                txMap.set(txId, []);
              }
              txMap.get(txId)?.push(row);
            });

            // Write batch setup
            let opCount = 0;
            let currentTx = 0;
            let totalTx = 0;
            storeTransactionsMap.forEach(txMap => { totalTx += txMap.size; });

            const storeImportSummary: Record<string, { txCount: number; productCount: number; name: string }> = {};

            // Loop per store
            for (const storeId of storeTransactionsMap.keys()) {
              const txMap = storeTransactionsMap.get(storeId)!;
              const storeObj = stores.find(s => s.id === storeId);
              const storeName = storeObj?.name || '不明';

              storeImportSummary[storeId] = {
                txCount: txMap.size,
                productCount: 0,
                name: storeName
              };

              // Read from product_boxes (Box architecture) with fallback to products
              const existingProductMaps = new Map<string, string>();
              
              // 1. Check product_boxes
              try {
                const qBoxes = query(collection(firestore, 'stores', storeId, 'product_boxes'));
                const boxesSnap = await getDocs(qBoxes);
                boxesSnap.forEach(d => {
                  const bData = d.data();
                  const prods = (bData.products || []) as any[];
                  prods.forEach(p => {
                    const pId = p.id || p.productId;
                    if (p.productCode && p.name && pId) {
                      existingProductMaps.set(`${p.productCode}_${p.name}`, pId);
                    }
                    if (p.productCode && pId) existingProductMaps.set(String(p.productCode), pId);
                  });
                });
              } catch (e) {
                console.warn('Failed to read product_boxes, falling back to products', e);
              }

              // 2. Fallback / supplementary check from legacy products collection
              try {
                const qProducts = query(collection(firestore, 'stores', storeId, 'products'));
                const existingProductsSnap = await getDocs(qProducts);
                existingProductsSnap.forEach(d => {
                  const data = d.data();
                  if (data.productCode && data.name && !existingProductMaps.has(`${data.productCode}_${data.name}`)) {
                    existingProductMaps.set(`${data.productCode}_${data.name}`, d.id);
                  }
                  if (data.productCode && !existingProductMaps.has(String(data.productCode))) {
                    existingProductMaps.set(String(data.productCode), d.id);
                  }
                });
              } catch (_) {}

              // Group parsed transactions by Date (YYYY-MM-DD)
              const dailyTxGroup = new Map<string, Transaction[]>();

              for (const [txId, rows] of txMap.entries()) {
                const dateStr = String(rows[0]['取引日時'] || '');
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) continue;

                let totalSubtotal = 0;
                let totalFinalValue = 0;
                let sumBundleDiscount = 0;
                let sumSingleDiscount = 0;

                const items: TransactionItem[] = rows.map(r => {
                  const isCancel = String(r['取消区分']) === '1';
                  
                  const rawQty = Number(r['数量'] || 0);
                  const qty = (isCancel && rawQty > 0) ? -rawQty : rawQty;
                  
                  const unitPrice = Number(r['販売単価'] || r['商品単価'] || 0);
                  const singleDiscount = Number(r['単品値引'] || 0) * (isCancel ? -1 : 1);
                  const bundleDiscount = Number(r['小計値引き按分'] || 0) * (isCancel ? -1 : 1);
                  
                  sumBundleDiscount += bundleDiscount;
                  sumSingleDiscount += singleDiscount;
                  totalSubtotal += (unitPrice * qty);
                  
                  const rawFinalVal = Number(r['値引き後合計'] || (unitPrice * Math.abs(rawQty)));
                  const itemFinalValue = (isCancel && rawFinalVal > 0) ? -rawFinalVal : rawFinalVal;
                  totalFinalValue += itemFinalValue;

                  const pCode = String(r['商品コード'] || '');
                  const pName = String(r['商品名'] || '');
                  const pCategory = String(r['部門'] || r['部門名'] || '');
                  const compKey = `${pCode}_${pName}`;
                  const docId = existingProductMaps.get(compKey) || existingProductMaps.get(pCode) || pCode;

                  let itemDiscRate = 0;
                  const basePrice = unitPrice * qty;
                  if (basePrice > 0) {
                    itemDiscRate = (singleDiscount + bundleDiscount) / basePrice;
                  }

                  return {
                    productId: docId,
                    name: pName,
                    quantity: qty,
                    unitPrice: unitPrice,
                    wasDiscounted: (singleDiscount > 0 || bundleDiscount > 0),
                    discountRate: itemDiscRate,
                    category: pCategory
                  };
                });

                const totalDiscountAmount = sumBundleDiscount + sumSingleDiscount;

                const transactionData: Transaction = {
                  id: txId,
                  storeId: storeId,
                  date: date,
                  items,
                  totalAmount: totalSubtotal,
                  discount: totalDiscountAmount > 0 ? { type: 'amount', value: totalDiscountAmount } : null,
                  finalAmount: totalFinalValue,
                  paymentMethod: 'Cash',
                  entryType: 'SALE'
                };

                const dayKey = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                if (!dailyTxGroup.has(dayKey)) dailyTxGroup.set(dayKey, []);
                dailyTxGroup.get(dayKey)!.push(transactionData);

                currentTx++;
                if (currentTx % 100 === 0) {
                  setProgress(Math.round((currentTx / totalTx) * 100));
                }
              }

              // Batch write to daily_transactions
              let batch = writeBatch(firestore);
              for (const [dayKey, newTxs] of dailyTxGroup.entries()) {
                 const boxRef = doc(firestore, 'stores', storeId, 'daily_transactions', dayKey);
                 const existingSnap = await getDoc(boxRef);
                 let finalTxs: Transaction[] = existingSnap.exists() ? (existingSnap.data().transactions || []) : [];
                 
                 // Merge by ID
                 for (const nTx of newTxs) {
                    const idx = finalTxs.findIndex(t => t.id === nTx.id);
                    if (idx >= 0) finalTxs[idx] = nTx;
                    else finalTxs.push(nTx);
                 }
                 
                 batch.set(boxRef, {
                    id: dayKey,
                    storeId,
                    date: new Date(dayKey),
                    transactions: finalTxs
                 }, { merge: true });
                 
                 opCount++;
                 if (opCount >= 490) {
                   await batch.commit();
                   batch = writeBatch(firestore);
                   opCount = 0;
                 }
              }
              if (opCount > 0) {
                await batch.commit();
                opCount = 0;
              }
            }

            setProgress(100);
            if (importMode === 'auto') {
              setMultiStats(storeImportSummary);
              toast({ 
                title: '自動振り分けインポート完了', 
                description: `${Object.keys(storeImportSummary).length}店舗への振り分けが完了しました。（エンコーディング: ${encoding.toUpperCase()}）` 
              });
            } else {
              const summaryObj = storeImportSummary[targetStoreId] || { txCount: 0, productCount: 0 };
              setStats({ txCount: summaryObj.txCount, productCount: summaryObj.productCount });
              toast({ 
                title: 'インポート完了', 
                description: `${summaryObj.txCount}件の取引データを統合しました。（エンコーディング: ${encoding.toUpperCase()}）` 
              });
            }

          } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'エラー', description: 'インポート中にエラーが発生しました。' });
          } finally {
            setIsProcessing(false);
            setFile(null);
          }
        },
        error: () => {
          toast({ variant: 'destructive', title: 'エラー', description: 'CSVの読み込みに失敗しました。' });
          setIsProcessing(false);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDeleteAll = async () => {
    if (!targetStoreId) return;

    setIsDeleting(true);
    try {
      // 1. 自動バックアップの作成
      if (backupService) {
        try {
          await backupService.createBackup(targetStoreId);
          loadBackups();
        } catch (backupError: any) {
          console.error("Backup failed:", backupError);
          toast({ 
            variant: 'destructive', 
            title: 'バックアップ失敗', 
            description: `データの保護に失敗したため、削除を中止しました: ${backupError.message}` 
          });
          setIsDeleting(false);
          return;
        }
      }
      
      const q = query(collection(firestore, 'stores', targetStoreId, 'daily_transactions'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast({ title: 'データなし', description: '削除する取引データはありません。' });
        setIsDeleting(false);
        return;
      }

      let deletedCount = 0;
      let batch = writeBatch(firestore);
      let batchCount = 0;
      
      for (const transDoc of snapshot.docs) {
        batch.delete(doc(firestore, 'stores', targetStoreId, 'daily_transactions', transDoc.id));
        batchCount++;
        deletedCount++;
        
        if (batchCount >= 400) {
          await batch.commit();
          batch = writeBatch(firestore);
          batchCount = 0;
          toast({ title: '削除中...', description: `${deletedCount}件のボックスを削除済み` });
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      toast({ title: '削除完了', description: `全取引データ（${deletedCount}箱）をすべて削除しました。` });
    } catch (e: any) {
      console.error(e);
      toast({ 
        variant: 'destructive', 
        title: '削除エラー', 
        description: `データの削除中にエラーが発生しました: ${e.message}` 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (backup: POSBackupMetadata) => {
    if (!backupService || !targetStoreId) return;
    
    setIsRestoring(true);
    try {
      // 復元前にバックアップを作成（現在の状態も履歴として残す）
      await backupService.createBackup(targetStoreId);
      
      await backupService.restoreBackup(targetStoreId, backup);
      toast({ title: '復元完了', description: `${backup.transactionCount}件の取引データを復元しました。` });
      loadBackups();
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: '復元エラー', description: 'バックアップの復元に失敗しました。' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (backup: POSBackupMetadata) => {
    if (!backupService || !targetStoreId) return;
    try {
      await backupService.deleteBackup(targetStoreId, backup);
      loadBackups();
      toast({ title: 'バックアップを削除しました' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-black">POSデータ 一括インポート</h1>
        <p className="text-muted-foreground mt-2 font-bold">
          数年分のPOSトランザクションデータをCSVから一括で解析・統合し、AI分析の精度を向上させます。<br/>
          （バンドル値引き・単品値引きは自動判別されます）
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> インポート設定
          </CardTitle>
          <CardDescription>CSVファイル（店舗ID/取引日時/商品コード/単品値引などの列を含む）を選択し、各店舗へ振り分け登録します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="font-bold text-md">インポートモード</Label>
            <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
              <SelectTrigger className="h-12 border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto" className="font-bold">自動振り分けインポート (店舗ID 1=港南台, 2=本厚木, 3=西川口)</SelectItem>
                <SelectItem value="single" className="font-bold">選択店舗への単一インポート</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importMode === 'single' && (
            <div className="space-y-2">
              <Label className="font-bold text-md">対象店舗 (必須)</Label>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger className="h-12 border-2">
                  <SelectValue placeholder="データをインポートする店舗を選択" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id} className="font-bold">{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">※提供されたCSVの「店舗ID=2」などが本店に該当する場合は、ここで「本店」を選んでください。</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-bold text-md">POS CSVファイル (必須)</Label>
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors">
              <UploadCloud className="h-10 w-10 text-primary mb-3" />
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="w-full max-w-xs text-sm"
              />
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center text-sm font-bold text-blue-900">
                <span>インポート処理中... 大量データの場合、数分かかります。</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {stats && (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-1 shrink-0" />
              <div>
                <h4 className="font-black text-emerald-900">インポート成功</h4>
                <p className="text-sm text-emerald-700 font-bold mt-1">
                  {stats.txCount.toLocaleString()} 件の取引データ（レシート単位）と、<br/>
                  {stats.productCount.toLocaleString()} 件の商品マスターデータを統合しました。
                </p>
              </div>
            </div>
          )}

          {multiStats && (
            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-1 shrink-0" />
                <div>
                  <h4 className="font-black text-emerald-900">自動振り分けインポート成功</h4>
                  <p className="text-sm text-emerald-700 font-bold mt-1">
                    各店舗へPOSトランザクションデータと商品マスターを自動で振り分け登録しました。
                  </p>
                </div>
              </div>
              <div className="border-t pt-3 space-y-2">
                {Object.entries(multiStats).map(([storeId, s]) => (
                  <div key={storeId} className="flex justify-between items-center text-xs text-emerald-800 font-bold">
                    <span>🏢 {s.name}</span>
                    <span>取引数: {s.txCount.toLocaleString()}件 / 商品数: {s.productCount.toLocaleString()}件</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
        <CardFooter className="bg-muted/30 border-t p-4 flex justify-end">
          <Button 
            size="lg" 
            onClick={processImport} 
            disabled={!file || (importMode === 'single' && !targetStoreId) || isProcessing}
            className="font-black text-md min-w-[200px]"
          >
            {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>処理中...</> : 'インポートを実行'}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm font-medium leading-relaxed">
          <p className="font-black mb-1">データ置き換えとAI連携に関する注意</p>
          CSVからのインポート時、「取引日時」と「取引ID」をキーとしてFirebaseに登録されます。同じ取引IDが存在する場合は上書き・マージされます。インポートされたデータは即座にダッシュボード画面や、AIによる将来の値引き率予測コンテキストへと反映されます。単品での値引きとバンドル（まとめ）小計値引きはシステム内部でフラグ化して保持されます。
        </div>
      </div>
      
      <Card className="border-2 border-destructive/20 bg-destructive/5 backdrop-blur-sm mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> 危険な操作 (Danger Zone)
          </CardTitle>
          <CardDescription>
            間違ったファイルをインポートしてしまった場合などは、ここで選択した店舗のPOS履歴を空（リセット）にできます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             <p className="text-sm font-bold text-destructive/80">上記の「インポート設定」で選択されている店舗のPOSデータが対象です。</p>
             <AlertDialog>
               <AlertDialogTrigger asChild>
                 <Button
                    variant="destructive"
                    size="lg"
                    disabled={isProcessing || isDeleting}
                    className="font-black"
                    onClick={(e) => {
                      if (!targetStoreId) {
                        e.preventDefault();
                        toast({ variant: 'destructive', title: 'エラー', description: '上部の「インポート設定」で、削除したい店舗を先に選択してください。' });
                      }
                    }}
                 >
                    {isDeleting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>削除中...</> : '全POSデータをリセット'}
                 </Button>
               </AlertDialogTrigger>
               <AlertDialogContent>
                 <AlertDialogHeader>
                   <AlertDialogTitle className="text-destructive font-black">データの全件リセット確認</AlertDialogTitle>
                   <AlertDialogDescription className="font-bold">
                     この操作は取り消せません。<br/>
                     現在選択されている店舗の「すべてのPOS連携履歴」が完全にデータベースから消去されます。<br/>
                     本当によろしいですか？
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter>
                   <AlertDialogCancel className="font-bold">キャンセル</AlertDialogCancel>
                   <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive font-black text-destructive-foreground hover:bg-destructive/90">
                     はい、削除してリセットします
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
          </div>
        </CardContent>
      </Card>
 
      {targetStoreId && (
        <Card className="border-2 border-primary/20 bg-background/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> バックアップ履歴
            </CardTitle>
            <CardDescription>
              インポートや削除の直前に自動保存された履歴です。最大5件まで保持されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {backups.length > 0 ? (
              <div className="space-y-3">
                {backups.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">
                          {new Date(b.timestamp).toLocaleString('ja-JP', {
                            month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })} のバックアップ
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold">
                          取引数: {b.transactionCount}件
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="font-bold h-8 text-xs" disabled={isRestoring || isProcessing || isDeleting}>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" /> 復元
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black">バックアップの復元</AlertDialogTitle>
                              <AlertDialogDescription className="font-bold">
                                現在のPOSデータが上書きされ、この時点の状態に戻ります。<br/>
                                本当に復元しますか？
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="font-bold">キャンセル</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRestore(b)} className="font-black">復元を実行</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                        onClick={() => handleDeleteBackup(b)}
                        disabled={isRestoring || isProcessing || isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-bold border-2 border-dashed rounded-lg">
                バックアップ履歴はありません
              </div>
            )}
          </CardContent>
        </Card>
      )}
 
      {isRestoring && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border-2 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <h3 className="text-xl font-black">バックアップから復元中...</h3>
                <p className="text-sm text-muted-foreground font-bold">大量のデータを処理しているため、数分かかる場合があります。この画面のままお待ちください。</p>
            </div>
        </div>
      )}
    </div>
  );
}
