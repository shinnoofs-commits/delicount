'use client';

import { useState } from "react";
import { 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Database, 
  History,
  FileJson,
  RefreshCcw
} from "lucide-react";
import { collection, getDocs, writeBatch, doc, getDoc, setDoc, query, orderBy } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useStores } from "@/contexts/store-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRightLeft, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BackupData {
  version: string;
  timestamp: string;
  stores: any[];
  products: Record<string, any[]>; // storeId -> products
  productBoxes?: Record<string, any[]>; // storeId -> product_boxes
}

export default function SystemClient() {
  const firestore = useFirestore();
  const { stores: allStoresList } = useStores();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [targetStoreId, setTargetStoreId] = useState<string>("auto");
  const [isMigrating, setIsMigrating] = useState(false);
  const [isMigratingProducts, setIsMigratingProducts] = useState(false);
  const [isMigratingWaste, setIsMigratingWaste] = useState(false);

  // DeliSupporter Sync State
  const [syncDate, setSyncDate] = useState<string>(() => {
    const d = new Date(Date.now() + 9 * 3600000 - 86400000);
    return d.toISOString().split('T')[0];
  });
  const [syncStoreId, setSyncStoreId] = useState<string>("MyIPMYpz2OvqHJFH4zwc"); // デフォルト: 本厚木店
  const [syncDryRun, setSyncDryRun] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [isResultOpen, setIsResultOpen] = useState<boolean>(false);

  const handleSyncDeliSupporter = async (overrideDryRun?: boolean) => {
    const effectiveDryRun = overrideDryRun !== undefined ? overrideDryRun : syncDryRun;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync-delisupporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: syncStoreId === 'all' ? undefined : syncStoreId,
          date: syncDate,
          dryRun: effectiveDryRun,
        }),
      });
      const data = await res.json();
      setSyncResult(data);
      setIsResultOpen(true);
      if (data.success) {
        toast({
          title: effectiveDryRun ? "シミュレーション完了" : "デリサポーター連携完了",
          description: `${syncDate} の実績製造数を${effectiveDryRun ? 'プレビュー表示しました' : 'デリサポーターへ反映しました'}。`,
        });
      } else {
        toast({
          title: "連携で一部エラーが発生しました",
          description: data.error || "詳細をモーダルでご確認ください。",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "通信エラー",
        description: error.message || "デリサポーター連携に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = async () => {
    if (!firestore) return;
    setIsExporting(true);
    try {
      const backup: BackupData = {
        version: "1.2",
        timestamp: new Date().toISOString(),
        stores: [],
        products: {},
        productBoxes: {}
      };

      // 1. Fetch stores
      if (selectedStoreId === "all") {
        const storesSnapshot = await getDocs(collection(firestore, "stores"));
        backup.stores = storesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        const storeDoc = await getDoc(doc(firestore, "stores", selectedStoreId));
        if (storeDoc.exists()) {
          backup.stores = [{ id: storeDoc.id, ...storeDoc.data() }];
        }
      }

      // 2. Fetch products and product_boxes for each store
      for (const store of backup.stores) {
        // A. product_boxes (Box architecture)
        const boxesSnap = await getDocs(collection(firestore, "stores", store.id, "product_boxes"));
        const boxes = boxesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (backup.productBoxes) {
          backup.productBoxes[store.id] = boxes;
        }

        // Flatten products from boxes for backward compatibility
        const flattenedFromBoxes: any[] = [];
        boxes.forEach((box: any) => {
          if (box.products && Array.isArray(box.products)) {
            flattenedFromBoxes.push(...box.products);
          }
        });

        // B. Legacy products fallback if product_boxes were empty
        if (flattenedFromBoxes.length > 0) {
          backup.products[store.id] = flattenedFromBoxes;
        } else {
          const productsSnapshot = await getDocs(collection(firestore, "stores", store.id, "products"));
          backup.products[store.id] = productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }

      // 3. Generate JSON and download
      const fileNameSuffix = selectedStoreId === "all" ? "all" : (backup.stores[0]?.name || selectedStoreId);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `delicount_backup_${fileNameSuffix}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "バックアップ完了", description: `${selectedStoreId === "all" ? '全データ' : '店舗データ'}をエクスポートしました。` });
    } catch (error) {
      console.error("Export Error:", error);
      toast({ variant: "destructive", title: "エクスポート失敗", description: "データの取得中にエラーが発生しました。" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = async () => {
    if (!firestore || !restoreFile) return;
    setIsImporting(true);
    try {
      const text = await restoreFile.text();
      const backup: BackupData = JSON.parse(text);

      if (!backup.stores || !backup.products) {
        throw new Error("無効なバックアップファイル形式です。");
      }

      const batch = writeBatch(firestore);

      // Determine if it's a single store restore to a different target
      const isSingleStoreBackup = backup.stores.length === 1;
      const effectiveTargetStoreId = (isSingleStoreBackup && targetStoreId !== "auto") ? targetStoreId : null;

      // 1. Restore stores
      for (const storeData of backup.stores) {
        const { id, ...data } = storeData;
        const finalStoreId = effectiveTargetStoreId || id;
        const storeRef = doc(firestore, "stores", finalStoreId);
        // If restoring to a different store ID, we might want to update the name if it's a clone, but usually we just merge.
        batch.set(storeRef, data, { merge: true });
      }

      // 2. Restore product_boxes and products
      // If productBoxes is present, write directly to product_boxes
      if (backup.productBoxes && Object.keys(backup.productBoxes).length > 0) {
        for (const [storeId, boxes] of Object.entries(backup.productBoxes)) {
          const finalStoreId = effectiveTargetStoreId || storeId;
          for (const boxData of boxes) {
            const { id, ...data } = boxData;
            const boxRef = doc(firestore, "stores", finalStoreId, "product_boxes", id);
            batch.set(boxRef, { ...data, storeId: finalStoreId }, { merge: true });
          }
        }
      }

      // Restore products (and synthesize product_boxes if productBoxes was absent)
      for (const [storeId, products] of Object.entries(backup.products)) {
        const finalStoreId = effectiveTargetStoreId || storeId;
        
        // Write to legacy products for safety
        for (const productData of products) {
          const { id, ...data } = productData;
          const productRef = doc(firestore, "stores", finalStoreId, "products", id);
          batch.set(productRef, { ...data, storeId: finalStoreId }, { merge: true });
        }

        // If productBoxes was not in backup, group products into product_boxes
        if (!backup.productBoxes || Object.keys(backup.productBoxes).length === 0) {
          const catMap = new Map<string, any[]>();
          products.forEach((p: any) => {
            const cat = p.category || '未分類';
            if (!catMap.has(cat)) catMap.set(cat, []);
            catMap.get(cat)!.push(p);
          });
          for (const [cat, prods] of catMap.entries()) {
            const boxRef = doc(firestore, "stores", finalStoreId, "product_boxes", cat);
            batch.set(boxRef, {
              id: cat,
              storeId: finalStoreId,
              category: cat,
              products: prods,
              updatedAt: new Date()
            }, { merge: true });
          }
        }
      }

      await batch.commit();
      toast({ title: "復元完了", description: "バックアップデータから復元しました。反映を確認してください。" });
      setRestoreFile(null);
    } catch (error: any) {
      console.error("Import Error:", error);
      toast({ variant: "destructive", title: "復元失敗", description: error.message || "データの書き込み中にエラーが発生しました。" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleMigrateToDailyBoxes = async () => {
    if (!firestore) return;
    setIsMigrating(true);
    try {
      // 1. Fetch stores
      const storesSnapshot = await getDocs(collection(firestore, "stores"));
      const storeIds = storesSnapshot.docs.map(d => d.id);
      
      let totalMigrated = 0;
      for (const storeId of storeIds) {
        // Fetch all existing old transactions
        const txSnap = await getDocs(collection(firestore, "stores", storeId, "transactions"));
        const transactions = txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Group by YYYY-MM-DD
        const grouped = new Map<string, any[]>();
        transactions.forEach((tx: any) => {
          const dateVal = tx.date;
          const timestampMs = (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) ? dateVal.seconds * 1000 : dateVal;
          const dateStr = new Date(timestampMs).toISOString().split('T')[0];
          if (!grouped.has(dateStr)) grouped.set(dateStr, []);
          grouped.get(dateStr)!.push(tx);
        });

        const batch = writeBatch(firestore);
        
        for (const [dateStr, txs] of grouped.entries()) {
          const boxRef = doc(firestore, "stores", storeId, "daily_transactions", dateStr);
          const existingBoxSnap = await getDoc(boxRef);
          
          if (!existingBoxSnap.exists()) {
             batch.set(boxRef, {
               id: dateStr,
               storeId,
               date: new Date(dateStr),
               transactions: txs
             });
             totalMigrated += txs.length;
          }
        }
        await batch.commit();
      }
      toast({ title: "マイグレーション完了", description: `${totalMigrated} 件の取引データをボックスに移行しました。` });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "マイグレーション失敗", description: e.message });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateProducts = async () => {
    if (!firestore) return;
    setIsMigratingProducts(true);
    try {
      const storesSnapshot = await getDocs(collection(firestore, "stores"));
      let totalMigrated = 0;
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;
        const prodSnap = await getDocs(collection(firestore, "stores", storeId, "products"));
        const products = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const grouped = new Map<string, any[]>();
        products.forEach(p => {
          const cat = p.category || '未分類';
          if (!grouped.has(cat)) grouped.set(cat, []);
          grouped.get(cat)!.push(p);
        });

        const batch = writeBatch(firestore);
        for (const [cat, prods] of grouped.entries()) {
          const boxRef = doc(firestore, "stores", storeId, "product_boxes", cat);
          const existingBoxSnap = await getDoc(boxRef);
          if (!existingBoxSnap.exists()) {
             batch.set(boxRef, {
               id: cat,
               storeId,
               category: cat,
               products: prods,
               updatedAt: new Date()
             });
             totalMigrated += prods.length;
          }
        }
        await batch.commit();
      }
      toast({ title: "商品マスタ移行完了", description: `${totalMigrated} 件の商品をボックスに移行しました。` });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "商品マスタ移行失敗", description: e.message });
    } finally {
      setIsMigratingProducts(false);
    }
  };

  const handleMigrateWaste = async () => {
    if (!firestore) return;
    setIsMigratingWaste(true);
    try {
      const storesSnapshot = await getDocs(collection(firestore, "stores"));
      let totalMigrated = 0;
      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;
        const wasteSnap = await getDocs(collection(firestore, "stores", storeId, "waste"));
        const wastes = wasteSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const grouped = new Map<string, any[]>();
        wastes.forEach(w => {
          const dateVal = w.date;
          const timestampMs = (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) ? dateVal.seconds * 1000 : dateVal;
          const dateStr = new Date(timestampMs).toISOString().split('T')[0];
          if (!grouped.has(dateStr)) grouped.set(dateStr, []);
          grouped.get(dateStr)!.push(w);
        });

        const batch = writeBatch(firestore);
        for (const [dateStr, entries] of grouped.entries()) {
          const boxRef = doc(firestore, "stores", storeId, "daily_wastes", dateStr);
          const existingBoxSnap = await getDoc(boxRef);
          if (!existingBoxSnap.exists()) {
             batch.set(boxRef, {
               id: dateStr,
               storeId,
               date: new Date(dateStr),
               entries: entries
             });
             totalMigrated += entries.length;
          }
        }
        await batch.commit();
      }
      toast({ title: "廃棄データ移行完了", description: `${totalMigrated} 件の廃棄データをボックスに移行しました。` });
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "廃棄データ移行失敗", description: e.message });
    } finally {
      setIsMigratingWaste(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6">
      <div className="flex items-center gap-2 px-2">
        <Database className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">システム管理</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              データのバックアップ
            </CardTitle>
            <CardDescription>
              現在の全店舗の設定、商品マスタ、製造計画をJSONファイルとして保存します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label>バックアップ対象</Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="対象を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての店舗 (全データ)</SelectItem>
                  {allStoresList.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted rounded-md text-xs text-muted-foreground">
              保存されるデータ:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{selectedStoreId === "all" ? '全店舗' : '選択した店舗'}の基本情報</li>
                <li>{selectedStoreId === "all" ? '全店舗' : '選択した店舗'}の商品マスタ</li>
                <li>各商品の製造計画（晴天/雨天）</li>
                <li>運用対象・価格固定設定</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              バックアップ実行 (ダウンロード)
            </Button>
          </CardFooter>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              データの復元
            </CardTitle>
            <CardDescription>
              過去にダウンロードしたバックアップファイルからデータを復元します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="backup-file">バックアップファイル (.json)</Label>
              <Input 
                id="backup-file" 
                type="file" 
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label>復元先店舗 (店舗別のバックアップの場合)</Label>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="対象を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自動 (元の店舗に復元)</SelectItem>
                  {allStoresList.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name} に復元</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                復元を実行すると、現在のデータがバックアップファイルの内容で上書きされます。
                「復元先店舗」を指定した場合、その店舗のデータが上書きされます。
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={!restoreFile || isImporting}>
                  {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  復元を実行
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当にデータを復元しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    選択されたファイル「{restoreFile?.name}」を使用してデータを復元します。
                    既存のデータはバックアップの内容で上書き（または不足分が追加）されます。
                    この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    復元を確定する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>

      {/* デリサポーター連携 */}
      <Card className="border-indigo-200 bg-indigo-50/20 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base text-indigo-950">デリサポーター実績連携</CardTitle>
            </div>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 self-start sm:self-auto">
              日別製造調整・発注連動
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            スマレジの当日売上数とPOS廃棄数を合算し、商品別の「実製造数」としてデリサポーター（日別製造調整）へ送信します。
            送信された実績数は在庫消費計算に反映され、3日後の発注計算へ自動連動します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">対象店舗</Label>
              <Select value={syncStoreId} onValueChange={setSyncStoreId}>
                <SelectTrigger className="mt-1 bg-white">
                  <SelectValue placeholder="店舗を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全対象店舗一括送信</SelectItem>
                  {allStoresList
                    .filter(s => s.id !== 'master' && s.id !== 'hMYyGcUiHo6mOTQ75c8Y')
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">対象日付 (実績日)</Label>
              <Input
                type="date"
                value={syncDate}
                onChange={(e) => setSyncDate(e.target.value)}
                className="mt-1 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1 bg-white p-2.5 rounded-md border border-indigo-100">
            <Checkbox
              id="syncDryRun"
              checked={syncDryRun}
              onCheckedChange={(checked) => setSyncDryRun(Boolean(checked))}
            />
            <Label htmlFor="syncDryRun" className="text-xs cursor-pointer font-medium text-slate-700">
              シミュレーション実行（Dry-Run: DB書き込みを行わず、商品照合結果と実製造数をプレビュー確認します）
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-indigo-50/50 border-t border-indigo-100/60 py-3 gap-2">
          <span className="text-xs text-muted-foreground">
            ※ 安全のため、まずはシミュレーション実行で照合件数をご確認ください。
          </span>
          <Button
            onClick={() => handleSyncDeliSupporter()}
            disabled={isSyncing || !syncDate}
            className={syncDryRun ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : syncDryRun ? (
              <ArrowRightLeft className="h-4 w-4 mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {syncDryRun ? "プレビュー確認を実行" : "本番送信を実行"}
          </Button>
        </CardFooter>
      </Card>

      {/* 連携結果プレビューモーダル */}
      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
              デリサポーター連携結果 ({syncResult?.targetDate || syncDate})
            </DialogTitle>
            <DialogDescription className="text-xs">
              {syncResult?.dryRun ? "【シミュレーション】実際のデータ更新は行われていません。" : "【本番送信完了】デリサポーターの日別製造調整に反映されました。"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {syncResult?.results?.map((res: any, idx: number) => {
              const d = res.data;
              const storeObj = allStoresList.find(s => s.id === res.storeId);
              const storeTitle = storeObj?.name || res.storeId;

              if (res.status === 'error') {
                return (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                    <p className="font-semibold">{storeTitle}：エラーが発生しました</p>
                    <p className="mt-1">{res.error}</p>
                  </div>
                );
              }

              const matchedItems: any[] = d?.matched || [];
              const skippedItems: any[] = d?.skipped || [];
              const summary = d?.summary || {};

              return (
                <div key={idx} className="border rounded-md p-3 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-sm text-slate-800">{storeTitle}</h4>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      照合成功: {summary.matchedCount || matchedItems.length}件 / 受信: {summary.totalReceived || (matchedItems.length + skippedItems.length)}件
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded border">
                      <div className="text-muted-foreground text-[10px]">POS総稼働商品</div>
                      <div className="font-bold text-sm">{summary.totalReceived || (matchedItems.length + skippedItems.length)}</div>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                      <div className="text-indigo-600 text-[10px]">マスタ照合</div>
                      <div className="font-bold text-sm text-indigo-700">{summary.matchedCount || matchedItems.length}</div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                      <div className="text-emerald-600 text-[10px]">ポートフォリオ内</div>
                      <div className="font-bold text-sm text-emerald-700">{summary.inPortfolioCount ?? matchedItems.filter((m: any) => m.inPortfolio).length}</div>
                    </div>
                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                      <div className="text-amber-600 text-[10px]">対象外 (袋等)</div>
                      <div className="font-bold text-sm text-amber-700">{summary.skippedCount ?? skippedItems.length}</div>
                    </div>
                  </div>

                  {matchedItems.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-slate-700 mb-1">照合商品一覧（製造数 = 売上 + 廃棄）</div>
                      <div className="max-h-48 overflow-y-auto border rounded bg-white text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-100 text-[11px] sticky top-0">
                            <tr>
                              <th className="p-1.5 border-b">コード</th>
                              <th className="p-1.5 border-b">商品名</th>
                              <th className="p-1.5 border-b text-right">売上</th>
                              <th className="p-1.5 border-b text-right">廃棄</th>
                              <th className="p-1.5 border-b text-right font-bold text-indigo-600">実製造数</th>
                              <th className="p-1.5 border-b text-center">PF区分</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-[11px]">
                            {matchedItems.map((item: any, mIdx: number) => (
                              <tr key={mIdx} className="hover:bg-slate-50">
                                <td className="p-1.5 font-mono text-slate-500">{item.productCode}</td>
                                <td className="p-1.5 font-medium truncate max-w-[180px]">{item.productName || item.delicountName}</td>
                                <td className="p-1.5 text-right">{item.sales}</td>
                                <td className="p-1.5 text-right">{item.waste > 0 ? <span className="text-red-500 font-bold">+{item.waste}</span> : 0}</td>
                                <td className="p-1.5 text-right font-bold text-indigo-600">{item.actualQuantity ?? (item.sales + item.waste)}</td>
                                <td className="p-1.5 text-center">
                                  {item.inPortfolio ? (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">登録済</span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">マスタのみ</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsResultOpen(false)}>
              閉じる
            </Button>
            {syncResult?.dryRun && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  handleSyncDeliSupporter(false);
                }}
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                この内容で本番送信を実行する
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            システムの健全性
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            定期的なバックアップは、データの誤削除や操作ミスからの保護に有効です。
            特に、CSVによる一括インポートや店舗間のデータ反映を行う前にはバックアップを推奨します。
          </p>
          <div className="mt-4 border-t pt-4 border-primary/20">
             <h4 className="text-sm font-bold mb-2">システムメンテナンス</h4>
             <p className="text-xs text-muted-foreground mb-4">過去のバラバラな取引データを「日別ボックス」に詰め直し、システムの動作を高速化します。この操作は一度だけ実行すれば完了します。</p>
             <div className="flex flex-col sm:flex-row gap-2 mt-4">
               <Button variant="outline" size="sm" onClick={handleMigrateToDailyBoxes} disabled={isMigrating}>
                 {isMigrating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                 取引データの日別ボックス化を実行
               </Button>
               <Button variant="outline" size="sm" onClick={handleMigrateProducts} disabled={isMigratingProducts}>
                 {isMigratingProducts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                 商品マスタの部門別ボックス化を実行
               </Button>
               <Button variant="outline" size="sm" onClick={handleMigrateWaste} disabled={isMigratingWaste}>
                 {isMigratingWaste ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                 廃棄データの日別ボックス化を実行
               </Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
