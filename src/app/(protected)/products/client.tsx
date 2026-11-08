
'use client'

import { useState, useMemo, useEffect } from "react"
import { MoreHorizontal, PlusCircle, Upload, RefreshCw, Edit, Loader2, Trash2, History, Download, Sparkles } from "lucide-react"
import Papa from "papaparse"

import type { Product, Store } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProductForm } from "./product-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useProducts } from "@/contexts/product-context"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useStores } from "@/contexts/store-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select"
import { useAdmin } from "@/hooks/useAdmin"
import { useFirestore } from "@/firebase"
import { doc, writeBatch, setDoc, collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore"

const defaultCategories = [
  '温惣菜',
  '冷惣菜',
  '弁当',
  'どんぶり',
  '揚げ物',
  'おこわ',
  '唐揚げ',
  'サラダ',
];

const pricePatterns = ['専門店', '量販店'];

const BulkProductEditor = ({ products, categories, onSave, onCancel, isMaster }: { products: Product[], categories: string[], onSave: (productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => void, onCancel: () => void, isMaster?: boolean }) => {
    const { toast } = useToast();
    const [updatedProducts, setUpdatedProducts] = useState<Record<string, { category: string, pricePattern: string }>>({});
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkCategory, setBulkCategory] = useState('');
    const [bulkPricePattern, setBulkPricePattern] = useState('');

    useEffect(() => {
        const initial = products.reduce((acc, product) => {
            acc[product.id] = { category: product.category, pricePattern: product.pricePattern || '' };
            return acc;
        }, {} as Record<string, { category: string, pricePattern: string }>);
        setUpdatedProducts(initial);
        setSelectedIds(products.map(p => p.id));
    }, [products]);

    const handleApplyBulk = (type: 'category' | 'pricePattern') => {
        const value = type === 'category' ? bulkCategory : bulkPricePattern;
        const valueName = type === 'category' ? 'カテゴリー' : '価格パターン';

        if (!value) {
            toast({ variant: 'destructive', title: `${valueName}が選択されていません` });
            return;
        }

        if (selectedIds.length === 0) {
            toast({ variant: 'destructive', title: '商品が選択されていません' });
            return;
        }

        setUpdatedProducts(prev => {
            const newState = { ...prev };
            selectedIds.forEach(id => {
                newState[id] = {
                    ...(prev[id] || { category: '', pricePattern: '' }),
                    ...(type === 'category' ? { category: value } : { pricePattern: value })
                };
            });
            return newState;
        });

        toast({ title: `${valueName}を一括適用しました` });
    };

    const handleCategoryChange = (productId: string, category: string) => {
        setUpdatedProducts(prev => ({
            ...prev,
            [productId]: { ...(prev[productId] || { category: '', pricePattern: '' }), category }
        }));
    };

    const handlePricePatternChange = (productId: string, pricePattern: string) => {
         setUpdatedProducts(prev => ({
            ...prev,
            [productId]: { ...(prev[productId] || { category: '', pricePattern: '' }), pricePattern }
        }));
    };

    const handleSave = () => {
        const productsToUpdate = selectedIds.map(id => ({
            id,
            ...updatedProducts[id],
        }));
        onSave(productsToUpdate);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedIds(products.map(p => p.id));
        else setSelectedIds([]);
    };

    const handleSelectRow = (productId: string, checked: boolean) => {
        if (checked) setSelectedIds(prev => [...prev, productId]);
        else setSelectedIds(prev => prev.filter(id => id !== productId));
    };
    
    return (
        <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>カテゴリー・価格パターンを一括編集</span>
                {isMaster && <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">マスタ連動</Badge>}
              </DialogTitle>
              <DialogDescription>
                {isMaster ? (
                  <span className="text-amber-800 font-medium">
                    ⚠️ マスタ商品で変更したカテゴリーや価格パターンは、保存時にすべての実店舗へ自動的に反映されます。
                  </span>
                ) : (
                  '一括適用または個別編集してください。'
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-4 p-4 border-y bg-muted/50">
                <div className="flex items-center gap-2">
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                        <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="一括適用カテゴリー" /></SelectTrigger>
                        <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleApplyBulk('category')} disabled={selectedIds.length === 0}>カテゴリーを適用</Button>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={bulkPricePattern} onValueChange={setBulkPricePattern}>
                        <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="一括適用パターン" /></SelectTrigger>
                        <SelectContent>{pricePatterns.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleApplyBulk('pricePattern')} disabled={selectedIds.length === 0}>パターンを適用</Button>
                </div>
            </div>
            <div className="h-[50vh] overflow-auto border-x border-b rounded-b-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky top-0 bg-muted">
                                <Checkbox checked={products.length > 0 && selectedIds.length === products.length} onCheckedChange={(checked) => handleSelectAll(checked as boolean)} />
                            </TableHead>
                            <TableHead className="sticky top-0 bg-muted">商品名</TableHead>
                            <TableHead className="sticky top-0 bg-muted w-48">カテゴリー</TableHead>
                            <TableHead className="sticky top-0 bg-muted w-48">価格パターン</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map(product => (
                            <TableRow key={product.id} data-state={selectedIds.includes(product.id) && 'selected'}>
                                <TableCell><Checkbox checked={selectedIds.includes(product.id)} onCheckedChange={(checked) => handleSelectRow(product.id, checked as boolean)} /></TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>
                                    <Select value={updatedProducts[product.id]?.category || ''} onValueChange={(value) => handleCategoryChange(product.id, value)}>
                                        <SelectTrigger><SelectValue placeholder="カテゴリー" /></SelectTrigger>
                                        <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select value={updatedProducts[product.id]?.pricePattern || ''} onValueChange={(value) => handlePricePatternChange(product.id, value)}>
                                        <SelectTrigger><SelectValue placeholder="パターン" /></SelectTrigger>
                                        <SelectContent>{pricePatterns.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>キャンセル</Button>
                <Button onClick={handleSave} disabled={selectedIds.length === 0}>選択した {selectedIds.length} 件を保存</Button>
            </DialogFooter>
        </>
    );
};

export default function ProductsClient() {
  const firestore = useFirestore();
  const { stores, userStore, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { products: allProducts, addProduct, updateProduct, deleteProducts, importProductsFromCSV, syncAllProducts, syncProductsToStores, bulkUpdateProducts, mergeDuplicateProducts, distributeProducts, copyAllStoresToMaster, toggleProductsFixedPrice, toggleProductsActive, loading: productsLoading, refetchProducts } = useProducts();
  
  const [managedStoreId, setManagedStoreId] = useState<string>('master');
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isMergeConfirmOpen, setIsMergeConfirmOpen] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [targetStoreIds, setTargetStoreIds] = useState<string[]>([]);
  const [updatePrice, setUpdatePrice] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTargetSyncOpen, setIsTargetSyncOpen] = useState(false)
  const [syncTargetStoreIds, setSyncTargetStoreIds] = useState<string[]>([])
  const [syncUpdatePrice, setSyncUpdatePrice] = useState(true)
  const [isTargetSyncing, setIsTargetSyncing] = useState(false)
  const [isSyncFromMasterConfirmOpen, setIsSyncFromMasterConfirmOpen] = useState(false)
  const [isCopyAllToMasterOpen, setIsCopyAllToMasterOpen] = useState(false)
  const [isCopyingToMaster, setIsCopyingToMaster] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Product | null>(null)
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false)
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSavingCategories, setIsSavingCategories] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<Omit<Product, 'id' | 'storeId'>[] | null>(null)
  const [isImportModeDialogOpen, setIsImportModeDialogOpen] = useState(false)
  const [importMode, setImportMode] = useState<'overwrite' | 'skip'>('overwrite')
  const [importTargetStoreId, setImportTargetStoreId] = useState<'master' | 'current'>('master')
  const [isImporting, setIsImporting] = useState(false)

  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchPriceHistory = async () => {
    if (!managedStoreId || !firestore) return;
    setHistoryLoading(true);
    try {
      const q = query(
        collection(firestore, 'stores', managedStoreId, 'price_history'),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPriceHistory(history);
    } catch (e) {
      console.error("Fetch price history error:", e);
      toast({ variant: 'destructive', title: '履歴の取得に失敗しました' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const { toast } = useToast()

  const currentStore = useMemo(() => {
    if (managedStoreId === 'master') {
      const masterDoc = stores.find(s => s.id === 'master');
      return {
        id: 'master',
        name: 'マスタ商品',
        email: '',
        userId: 'master',
        isMaster: true,
        categories: masterDoc?.categories || defaultCategories,
      } as Store;
    }
    return stores.find(s => s.id === managedStoreId);
  }, [stores, managedStoreId]);

  const otherStores = useMemo(() => {
    return stores.filter(s => s.id !== managedStoreId && s.id !== 'master' && !s.isMaster);
  }, [stores, managedStoreId]);

  const isMaster = managedStoreId === 'master';

  const categories = useMemo(() => {
    return currentStore?.categories || defaultCategories;
  }, [currentStore]);

  const handleSaveCategories = async (newCategories: string[]) => {
    if (!managedStoreId || !firestore) return;
    setIsSavingCategories(true);
    try {
      const deletedCategories = categories.filter(c => !newCategories.includes(c));
      const storeRef = doc(firestore, 'stores', managedStoreId);
      await setDoc(storeRef, { categories: newCategories }, { merge: true });

      if (deletedCategories.length > 0) {
        // 現在の店舗／マスタで削除されたカテゴリーを持つ商品を「未分類」に一括変更
        const affectedProducts = allProducts.filter(
          p => p.storeId === managedStoreId && p.category && deletedCategories.includes(p.category)
        );
        if (affectedProducts.length > 0) {
          const updates = affectedProducts.map(p => ({
            id: p.id,
            category: '未分類',
          }));
          await bulkUpdateProducts(managedStoreId, updates);
        }

        // マスタ商品で削除された場合は全店舗の商品も未分類に更新して同期を維持
        if (managedStoreId === 'master') {
          const affectedStoreProds = allProducts.filter(
            p => p.storeId !== 'master' && p.category && deletedCategories.includes(p.category)
          );
          if (affectedStoreProds.length > 0) {
            const prodsByStore = new Map<string, typeof affectedStoreProds>();
            affectedStoreProds.forEach(p => {
              if (!prodsByStore.has(p.storeId)) prodsByStore.set(p.storeId, []);
              prodsByStore.get(p.storeId)!.push(p);
            });
            for (const [storeId, storeProds] of prodsByStore.entries()) {
              await bulkUpdateProducts(storeId, storeProds.map(p => ({ id: p.id, category: '未分類' })));
            }
          }
        }
      }

      toast({ title: "カテゴリーを保存しました" });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "保存エラー", description: "カテゴリーの保存に失敗しました。" });
    } finally {
      setIsSavingCategories(false);
    }
  };
  
  useEffect(() => {
    if (!isAdmin && userStore && managedStoreId === 'master') {
      setManagedStoreId(userStore.id);
    }
  }, [isAdmin, userStore, managedStoreId]);

  const availableCategories = useMemo(() => {
    if (!managedStoreId) return [];
    if (managedStoreId === 'master') {
      return (currentStore?.categories || defaultCategories).filter(Boolean).sort();
    }
    const sourceProducts = allProducts.filter(p => p.storeId === managedStoreId);
    return Array.from(new Set(sourceProducts.map(p => p.category).filter(Boolean))).sort();
  }, [allProducts, managedStoreId, currentStore]);

  const categoriesForForm = useMemo(() => {
    if (managedStoreId === 'master') {
      return Array.from(new Set(categories.filter(Boolean))).sort();
    }
    const uniqueCats = new Set<string>();
    availableCategories.forEach(cat => {
      if (cat) uniqueCats.add(cat);
    });
    categories.forEach(cat => {
      if (cat) uniqueCats.add(cat);
    });
    return Array.from(uniqueCats).sort();
  }, [categories, availableCategories, managedStoreId]);

  const products = useMemo(() => {
    if (!managedStoreId) return [];
    let filtered = allProducts.filter(p => p.storeId === managedStoreId);
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }
    return filtered.sort((a, b) => {
      const aActive = a.isActive ? 1 : 0;
      const bActive = b.isActive ? 1 : 0;
      if (aActive !== bActive) {
        return bActive - aActive;
      }
      const codeA = String(a.productCode || '');
      const codeB = String(b.productCode || '');
      return codeA.localeCompare(codeB, 'ja-JP', { numeric: true, sensitivity: 'base' });
    });
  }, [allProducts, managedStoreId, filterCategory]);

  const loading = productsLoading || storesLoading;

  const handleAdd = () => {
    setProductToEdit(null)
    setIsFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setProductToEdit(product)
    setIsFormOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductsToDelete([product.id])
    setIsDeleteConfirmOpen(true)
  }

  const handleDuplicate = (product: Product) => {
    const { id: _, storeId: __, ...data } = product;
    // idを除去したデータをセットすることで新規作成として扱う
    setProductToEdit({ ...data, name: `${data.name} - コピー` } as any);
    setIsFormOpen(true);
  }

  const handleMergeDuplicates = () => {
      setIsMergeConfirmOpen(true);
  }

  const confirmMerge = async () => {
      if (!managedStoreId) return;
      await mergeDuplicateProducts(managedStoreId);
      setIsMergeConfirmOpen(false);
      toast({ title: "重複商品を統合しました" });
  }

  const handleDistribute = async () => {
    if (!managedStoreId || selectedProductIds.length === 0 || targetStoreIds.length === 0) return;
    setIsDistributing(true);
    try {
      await distributeProducts(managedStoreId, selectedProductIds, targetStoreIds, { updatePrice });
      setIsDistributeOpen(false);
      setSelectedProductIds([]);
      setTargetStoreIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDistributing(false);
    }
  };

  const confirmDelete = async () => {
    if (productsToDelete.length > 0 && managedStoreId) {
        await deleteProducts(managedStoreId, productsToDelete);
        toast({ title: `削除完了` });
    }
    setIsDeleteConfirmOpen(false)
    setProductsToDelete([])
    setSelectedProductIds([])
  }

  const handleFormSubmit = async (productData: Omit<Product, 'id' | 'storeId'> & { id?: string }) => {
    if (!managedStoreId) return;
    if (productData.id) {
      const existingProduct = products.find(p => p.id === productData.id);
      await updateProduct(managedStoreId, { ...existingProduct, ...productData } as Product, existingProduct?.productCode, existingProduct?.price);
    } else {
      await addProduct(managedStoreId, productData);
    }
    setIsFormOpen(false)
    setProductToEdit(null)
  }

  const handleBulkUpdate = (productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => {
    if (!managedStoreId) return;
    bulkUpdateProducts(managedStoreId, productsToUpdate);
    setIsBulkEditorOpen(false);
  }

  const bulkToggleFixedPrice = async (isFixed: boolean) => {
    if (!managedStoreId || selectedProductIds.length === 0) return;
    await toggleProductsFixedPrice(managedStoreId, selectedProductIds, isFixed);
    setSelectedProductIds([]);
    toast({ title: isFixed ? '価格固定をONにしました' : '価格固定をOFFにしました' });
  }

  const bulkToggleActive = async (isActive: boolean) => {
    if (!managedStoreId || selectedProductIds.length === 0) return;
    await toggleProductsActive(managedStoreId, selectedProductIds, isActive);
    setSelectedProductIds([]);
  }

  const handleResetActive = async () => {
    if (!managedStoreId) return;
    const allIds = products.map(p => p.id);
    if (allIds.length === 0) return;
    await toggleProductsActive(managedStoreId, allIds, false);
    toast({ title: "全ての運用対象をリセットしました" });
  }

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
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
          transformHeader: (header: string) => header.trim(),
          complete: (results) => {
            const imported = results.data.map((row: any) => {
              const productCode = (row['label_number'] || row['商品コード'] || row['code'] || '').toString().trim();
              if (!productCode) return null;

              let materials: any[] = [];
              let containers: any[] = [];
              try {
                if (row['materials_json']) {
                  const raw = typeof row['materials_json'] === 'string' ? JSON.parse(row['materials_json']) : row['materials_json'];
                  materials = Array.isArray(raw) ? raw.map((m: any) => ({
                    name: (m.name || m.material_name || '').toString().trim(),
                    quantity: parseFloat(m.quantity || m.qty) || 0
                  })) : [];
                }
                if (row['containers_json']) {
                  const raw = typeof row['containers_json'] === 'string' ? JSON.parse(row['containers_json']) : row['containers_json'];
                  containers = Array.isArray(raw) ? raw.map((c: any) => ({
                    name: (c.name || c.container_name || '').toString().trim(),
                    quantity: parseFloat(c.quantity || c.qty) || 0
                  })) : [];
                }
              } catch (e) {
                console.error('Recipe JSON parse error:', e);
              }

              const rawPrice = (row['selling_price'] || row['価格'] || row['売価'] || row['price'] || '').toString().replace(/,/g, '').trim();
              const rawCost = (row['total_cost'] || row['原価額'] || row['cost'] || '').toString().replace(/,/g, '').trim();

              return {
                name: (row['recipe_name'] || row['商品名'] || row['name'] || '').toString().trim(),
                productCode: productCode,
                price: parseFloat(rawPrice) || 0,
                costPrice: parseFloat(rawCost) || 0,
                category: (row['category'] || row['カテゴリー'] || '').toString().trim(),
                pricePattern: (row['price_pattern_label'] || row['価格パターン'] || '').toString().trim(),
                materials: materials.length > 0 ? materials : undefined,
                containers: containers.length > 0 ? containers : undefined,
              };
            }).filter(Boolean) as Omit<Product, 'id' | 'storeId'>[];

            if (imported.length > 0) {
              setPendingImportData(imported);
              setIsImportModeDialogOpen(true);
            } else {
              toast({ variant: 'destructive', title: "インポート可能なデータが見つかりませんでした" });
            }
            event.target.value = '';
          }
        });
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import error:', error);
      toast({ variant: 'destructive', title: "インポート中にエラーが発生しました" });
    }
  };

  const handleSyncAll = async () => {
    if (!managedStoreId) return;
    setIsSyncConfirmOpen(true);
  }

  const confirmSync = async () => {
    if (!managedStoreId) return;
    setIsSyncing(true);
    await syncAllProducts(managedStoreId);
    setIsSyncing(false);
    setIsSyncConfirmOpen(false);
    toast({ title: "全店舗との同期が完了しました" });
  };

  const handleTargetSync = async () => {
    if (!managedStoreId || syncTargetStoreIds.length === 0) return;
    setIsTargetSyncing(true);
    try {
      await syncProductsToStores(managedStoreId, syncTargetStoreIds, { updatePrice: syncUpdatePrice });
      setIsTargetSyncOpen(false);
      setSyncTargetStoreIds([]);
    } catch (err) {
      console.error('Target sync failed:', err);
    } finally {
      setIsTargetSyncing(false);
    }
  };

  const handleSyncFromMaster = async () => {
    if (!managedStoreId || managedStoreId === 'master') return;
    setIsSyncing(true);
    try {
      await syncProductsToStores('master', [managedStoreId], { updatePrice: true });
      toast({ title: "マスタ商品からの同期が完了しました" });
    } catch (err) {
      console.error('Sync from master failed:', err);
    } finally {
      setIsSyncing(false);
      setIsSyncFromMasterConfirmOpen(false);
    }
  };

  const handleCopyAllToMaster = async () => {
    setIsCopyingToMaster(true);
    try {
      await copyAllStoresToMaster();
    } catch (err) {
      console.error('Failed to copy all stores to master:', err);
    } finally {
      setIsCopyingToMaster(false);
      setIsCopyAllToMasterOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{isMaster ? 'マスタ商品' : '商品管理'}</CardTitle>
              {isMaster && (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold hover:bg-amber-200">
                  ⭐ 全社マスタ
                </Badge>
              )}
            </div>
            <CardDescription>
              {isMaster
                ? '全店舗の基準となる商品マスタです。CSVインポートや新規登録を行い、ここから全店舗または指定店舗へ同期・反映できます。'
                : `「${currentStore?.name || '選択中の店舗'}」に登録されている商品の一覧です。製造計画はサイドバーの「製造計画」から設定してください。`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
                <Select value={managedStoreId} onValueChange={setManagedStoreId}>
                  <SelectTrigger className="w-[210px] font-medium bg-background">
                    <SelectValue placeholder="表示・管理対象を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="master" className="font-bold text-amber-800 focus:text-amber-900 bg-amber-50/50">
                        ⭐ マスタ商品（全社マスタ）
                      </SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        店舗別商品一覧
                      </div>
                      {stores.filter(s => s.id !== 'master' && !s.isMaster).map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => { setIsHistoryOpen(true); fetchPriceHistory(); }}>
              <History className="h-4 w-4 mr-2" />
              商品価格変更履歴
            </Button>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="カテゴリー" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refetchProducts} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />更新</Button>
            <Button variant="outline" size="sm" onClick={() => setIsBulkEditorOpen(true)} disabled={!managedStoreId}><Edit className="h-4 w-4 mr-2" />カテゴリー一括編集</Button>
            <Button variant="outline" size="sm" onClick={() => setIsCategoryEditorOpen(true)} disabled={!managedStoreId}><Edit className="h-4 w-4 mr-2" />カテゴリー修正</Button>
            <Button variant="outline" size="sm" onClick={handleResetActive} disabled={!managedStoreId || products.length === 0} className="text-destructive hover:bg-destructive/10"><RefreshCw className="h-4 w-4 mr-2" />運用リセット</Button>
            <Button variant="outline" size="sm" onClick={handleMergeDuplicates} disabled={!managedStoreId}><RefreshCw className="h-4 w-4 mr-2" />重複を統合</Button>
            {isAdmin && (
              <>
                <Button asChild variant="outline" size="sm" className={isMaster ? "border-amber-400 bg-amber-50/50 hover:bg-amber-100/50 text-amber-900 font-semibold" : ""}>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-1.5 inline" />
                      {isMaster ? 'マスタCSVインポート' : 'CSVインポート'}
                    </label>
                </Button>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />

                {!isMaster && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsSyncFromMasterConfirmOpen(true)}
                    disabled={isSyncing}
                    className="border-amber-500 text-amber-800 hover:bg-amber-50 font-medium"
                  >
                    <Download className="h-4 w-4 mr-2" />マスタから同期
                  </Button>
                )}

                {isMaster && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCopyAllToMasterOpen(true)}
                    disabled={isCopyingToMaster || isSyncing}
                    className="border-amber-400 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-semibold"
                  >
                    {isCopyingToMaster ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-amber-600" />
                    ) : (
                      <Download className="h-4 w-4 mr-1.5 text-amber-600" />
                    )}
                    全店舗から取り込み
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSyncTargetStoreIds([]);
                    setIsTargetSyncOpen(true);
                  }} 
                  disabled={isSyncing || isTargetSyncing || otherStores.length === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />指定店舗同期
                </Button>
                <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={isSyncing || isTargetSyncing || otherStores.length === 0}>
                  <RefreshCw className="h-4 w-4 mr-2" />全店舗同期
                </Button>
              </>
            )}
            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-2 border-r pr-2 mr-2">
                <span className="text-sm text-muted-foreground mr-2">{selectedProductIds.length}件選択中</span>
                <Button variant="secondary" size="sm" onClick={() => bulkToggleActive(true)}>運用対象に追加</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkToggleActive(false)}>運用対象から外す</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkToggleFixedPrice(true)}>価格固定ON</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkToggleFixedPrice(false)}>価格固定OFF</Button>
                <Button variant="secondary" size="sm" onClick={() => setIsDistributeOpen(true)}>他店舗に展開</Button>
                <Button variant="destructive" size="sm" onClick={() => {
                    setProductsToDelete(selectedProductIds);
                    setIsDeleteConfirmOpen(true);
                }}><Trash2 className="h-4 w-4 mr-2" />削除</Button>
              </div>
            )}
            <Button size="sm" onClick={handleAdd}><PlusCircle className="h-4 w-4 mr-2" />商品追加</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Checkbox checked={products.length > 0 && selectedProductIds.length === products.length} onCheckedChange={(checked) => setSelectedProductIds(checked ? products.map(p => p.id) : [])} /></TableHead>
                <TableHead>名前</TableHead>
                <TableHead>コード</TableHead>
                <TableHead className="hidden md:table-cell">カテゴリー</TableHead>
                <TableHead className="text-right whitespace-nowrap">{isMaster ? '基準価格' : '価格'}</TableHead>
                {isMaster && otherStores.map(store => (
                  <TableHead key={store.id} className="text-right whitespace-nowrap text-xs text-muted-foreground">{store.name}価格</TableHead>
                ))}
                <TableHead className="text-right whitespace-nowrap">原価</TableHead>
                <TableHead className="text-center w-[80px]">運用</TableHead>
                <TableHead className="text-center w-[80px]">価格固定</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={isMaster ? 8 + otherStores.length : 8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block" /></TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow><TableCell colSpan={isMaster ? 8 + otherStores.length : 8} className="text-center py-10">商品がありません。</TableCell></TableRow>
              ) : (
                products.map(product => (
                <TableRow key={product.id}>
                   <TableCell><Checkbox checked={selectedProductIds.includes(product.id)} onCheckedChange={(checked) => setSelectedProductIds(prev => checked ? [...prev, product.id] : prev.filter(id => id !== product.id))} /></TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.productCode}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">¥{(product.price || 0).toLocaleString()}</TableCell>
                  {isMaster && otherStores.map(store => {
                    const storeProd = allProducts.find(p => p.storeId === store.id && p.productCode === product.productCode);
                    return (
                      <TableCell key={store.id} className="text-right font-normal text-xs text-muted-foreground">
                        {storeProd ? `¥${(storeProd.price || 0).toLocaleString()}` : <span className="text-slate-300">未同期</span>}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">¥{(product.costPrice || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={product.isActive || false} 
                      onCheckedChange={(checked) => {
                        if (managedStoreId) {
                          toggleProductsActive(managedStoreId, [product.id], checked as boolean);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={product.isFixedPrice || false} 
                      onCheckedChange={(checked) => {
                        if (managedStoreId) {
                          toggleProductsFixedPrice(managedStoreId, [product.id], checked as boolean);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(product)}>編集</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(product)}>複製</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(product)} className="text-destructive">削除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{productToEdit ? '商品編集' : '商品追加'}</span>
              {isMaster && <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">マスタ連動</Badge>}
            </DialogTitle>
          </DialogHeader>
          {isMaster && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-md mb-2 flex items-center gap-2">
              <span className="text-base">⭐</span>
              <div>
                <p className="font-semibold">マスタ商品連動モード</p>
                <p className="text-amber-800">ここで変更（カテゴリー・価格パターン・価格等）を保存すると、すべての実店舗へ自動的に即時反映されます。</p>
              </div>
            </div>
          )}
          <ProductForm product={productToEdit} categories={categoriesForForm} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isBulkEditorOpen} onOpenChange={setIsBulkEditorOpen}>
        <DialogContent className="max-w-4xl">
            {managedStoreId && <BulkProductEditor isMaster={isMaster} products={products} categories={categoriesForForm} onSave={handleBulkUpdate} onCancel={() => setIsBulkEditorOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryEditorOpen} onOpenChange={setIsCategoryEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>カテゴリーの編集</DialogTitle>
            <DialogDescription>
              この店舗で利用可能な商品カテゴリーを追加または削除します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder="新しいカテゴリー名 (例: 寿司)" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                className="flex-1"
              />
              <Button 
                onClick={() => {
                  const trimmed = newCategoryName.trim();
                  if (!trimmed) return;
                  if (categories.includes(trimmed)) {
                    toast({ variant: 'destructive', title: "既に存在するカテゴリー名です" });
                    return;
                  }
                  const updated = [...categories, trimmed];
                  handleSaveCategories(updated);
                  setNewCategoryName('');
                }}
                disabled={isSavingCategories}
              >
                追加
              </Button>
            </div>
            
            <div className="border rounded-md max-h-60 overflow-y-auto p-2 bg-slate-50">
              <p className="text-xs font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">現在登録されているカテゴリー</p>
              <div className="divide-y">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between py-2 px-2 hover:bg-white rounded transition-colors group">
                    <span className="text-sm font-bold text-slate-800">{cat}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const updated = categories.filter(c => c !== cat);
                        handleSaveCategories(updated);
                      }}
                      disabled={isSavingCategories}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCategoryEditorOpen(false)} className="w-full">
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除確認</AlertDialogTitle>
            <AlertDialogDescription>
              {productsToDelete.length}件の商品を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isTargetSyncOpen} onOpenChange={setIsTargetSyncOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>指定店舗へ商品データを同期</DialogTitle>
            <DialogDescription>
              同期元店舗の全商品（{products.length}品）を選択した店舗へ同期・反映します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">同期元店舗</label>
              <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-md text-sm font-medium text-slate-800">
                <span className="flex items-center gap-1.5 font-bold">
                  {isMaster ? '⭐ マスタ商品（全社マスタ）' : (currentStore?.name || '店舗未選択')}
                </span>
                <span className="text-xs text-muted-foreground">{products.length}品 登録中</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">同期先店舗を選択（複数選択可）</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setSyncTargetStoreIds(otherStores.map(s => s.id))}
                  >
                    全選択
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setSyncTargetStoreIds([])}
                  >
                    選択解除
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md bg-slate-50/50">
                {otherStores.map(store => {
                  const isChecked = syncTargetStoreIds.includes(store.id);
                  const storeProdCount = allProducts.filter(p => p.storeId === store.id).length;
                  return (
                    <label
                      key={store.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer text-sm transition-all",
                        isChecked ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20" : "bg-white hover:bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setSyncTargetStoreIds(prev =>
                              checked ? [...prev, store.id] : prev.filter(id => id !== store.id)
                            );
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 break-words leading-snug">
                            {store.name}
                          </div>
                          {store.email && (
                            <div className="text-xs text-muted-foreground break-all">
                              {store.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 pl-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {storeProdCount}品 登録済
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start space-x-2 p-2.5 bg-slate-50 rounded-md border">
              <Checkbox
                id="sync-update-price"
                checked={syncUpdatePrice}
                onCheckedChange={(c) => setSyncUpdatePrice(c as boolean)}
                className="mt-0.5"
              />
              <div className="grid gap-1 leading-none">
                <label htmlFor="sync-update-price" className="text-sm font-semibold cursor-pointer">
                  既存商品の価格を同期元の価格で上書きする
                </label>
                <p className="text-[11px] text-muted-foreground">
                  チェックを外すと、同期先で既に登録されている商品の価格は維持されます。
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isTargetSyncing} onClick={() => setIsTargetSyncOpen(false)}>
              キャンセル
            </Button>
            <Button
              disabled={syncTargetStoreIds.length === 0 || isTargetSyncing}
              onClick={handleTargetSync}
            >
              {isTargetSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {syncTargetStoreIds.length > 0 ? `${syncTargetStoreIds.length}店舗に同期を実行` : '同期先を選択してください'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isMaster ? 'マスタ商品を全店舗に同期' : '全店舗同期'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isMaster
                ? `「マスタ商品（全社マスタ）」の全商品（${products.length}品）を、すべての実店舗（${otherStores.length}店舗）へ同期しますか？各店舗に最新の商品データが展開されます。`
                : `「${currentStore?.name || '選択中の店舗'}」の商品設定（全${products.length}品）を他の全店舗に反映しますか？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsSyncConfirmOpen(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSync} disabled={isSyncing}>
              {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isMaster ? '全店舗に同期を実行' : '実行'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSyncFromMasterConfirmOpen} onOpenChange={setIsSyncFromMasterConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>マスタ商品から同期</AlertDialogTitle>
            <AlertDialogDescription>
              「マスタ商品（全社マスタ）」の最新商品設定を取り込み、「{currentStore?.name}」に反映します。未登録商品は追加され、既存商品の価格・原価もマスタの最新情報で更新されます。実行しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsSyncFromMasterConfirmOpen(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncFromMaster} disabled={isSyncing}>
              {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              マスタから同期を実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCopyAllToMasterOpen} onOpenChange={setIsCopyAllToMasterOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>全店舗の商品をマスタに取り込み</AlertDialogTitle>
            <AlertDialogDescription>
              データベースに登録されている全実店舗（{otherStores.length}店舗）の商品データをスキャンし、「マスタ商品（全社マスタ）」にコピー・統合します。
              同一商品（商品コードまたは名称が一致）は自動統合され、本部の価格・レシピが優先されます。実行しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsCopyAllToMasterOpen(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyAllToMaster} disabled={isCopyingToMaster}>
              {isCopyingToMaster && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              取り込みを実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isMergeConfirmOpen} onOpenChange={setIsMergeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重複商品の統合</AlertDialogTitle>
            <AlertDialogDescription>
              商品コードと商品名が一致する商品を統合し、価格を平均化します。固定価格の商品は平均化から除外されます。実行しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsMergeConfirmOpen(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMerge}>実行</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDistributeOpen} onOpenChange={setIsDistributeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>他店舗に商品を展開</DialogTitle>
            <DialogDescription>
              選択した{selectedProductIds.length}件の商品を他の店舗にコピーまたは更新します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">展開先の店舗を選択（複数選択可）</p>
              <div className="space-y-2 max-h-56 overflow-y-auto p-2 border rounded-md bg-slate-50/50">
                {otherStores.map(store => {
                  const isChecked = targetStoreIds.includes(store.id);
                  return (
                    <label 
                      key={store.id} 
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-sm transition-all",
                        isChecked ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20" : "bg-white hover:bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                        <Checkbox 
                          id={`store-${store.id}`} 
                          checked={isChecked} 
                          onCheckedChange={(checked) => {
                            setTargetStoreIds(prev => checked ? [...prev, store.id] : prev.filter(id => id !== store.id))
                          }} 
                        />
                        <span className="font-medium text-slate-900 break-words leading-snug">
                          {store.name}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-md">
              <Checkbox id="update-price" checked={updatePrice} onCheckedChange={(c) => setUpdatePrice(c as boolean)} />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="update-price" className="text-sm font-bold">既存の商品の価格を上書きする</label>
                <p className="text-[11px] text-muted-foreground">チェックを外すと、コピー先で価格が違う場合は価格を維持します。</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDistributeOpen(false)}>キャンセル</Button>
            <Button onClick={handleDistribute} disabled={targetStoreIds.length === 0 || isDistributing}>
              {isDistributing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              反映を実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModeDialogOpen} onOpenChange={setIsImportModeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>CSV商品のインポート設定</DialogTitle>
            <DialogDescription>
              インポート先および重複商品の処理方法を選択してください。（インポート対象: {pendingImportData?.length || 0}品）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!isMaster && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">インポート先</label>
                <div className="space-y-2">
                  <label className={cn(
                    "flex items-start space-x-3 cursor-pointer p-3 border rounded-md transition-colors",
                    importTargetStoreId === 'master' ? "bg-amber-50/60 border-amber-300" : "hover:bg-slate-50"
                  )}>
                    <input
                      type="radio"
                      name="importTargetStoreId"
                      value="master"
                      checked={importTargetStoreId === 'master'}
                      onChange={() => setImportTargetStoreId('master')}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                        ⭐ マスタ商品（全社マスタ）に登録
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">推奨</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        全社共通のマスタとして登録します。登録後、各店舗への一括同期や個別同期が可能です。
                      </span>
                    </div>
                  </label>
                  
                  <label className={cn(
                    "flex items-start space-x-3 cursor-pointer p-3 border rounded-md transition-colors",
                    importTargetStoreId === 'current' ? "bg-primary/5 border-primary" : "hover:bg-slate-50"
                  )}>
                    <input
                      type="radio"
                      name="importTargetStoreId"
                      value="current"
                      checked={importTargetStoreId === 'current'}
                      onChange={() => setImportTargetStoreId('current')}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-bold block text-slate-800">
                        現在の店舗（{currentStore?.name}）に直接登録
                      </span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        この店舗のみに商品を追加・更新します。他店舗には反映されません。
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {isMaster && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  インポート先: <strong>マスタ商品（全社マスタ）</strong>
                  <br />
                  インポート完了後、「全店舗同期」または「指定店舗同期」で各店舗に反映できます。
                </span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">重複商品の処理方法</label>
              <div className="space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer p-3 border rounded-md hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="importMode"
                    value="overwrite"
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-bold block text-slate-800">CSVの価格・原価で上書きする</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      既存商品の価格・原価・原材料レシピをCSVのデータで更新します。（※「価格固定」がONの商品はスキップされます）
                    </span>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 cursor-pointer p-3 border rounded-md hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="importMode"
                    value="skip"
                    checked={importMode === 'skip'}
                    onChange={() => setImportMode('skip')}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-bold block text-slate-800">既存の価格・原価を維持する</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      既存商品は更新せず、まだ登録されていない新規の商品のみをインポートします。
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={isImporting} onClick={() => {
              setIsImportModeDialogOpen(false);
              setPendingImportData(null);
            }}>キャンセル</Button>
            <Button disabled={isImporting} onClick={async () => {
              const targetStore = (isMaster || importTargetStoreId === 'master') ? 'master' : managedStoreId;
              if (!targetStore) {
                toast({ variant: 'destructive', title: 'エラー', description: 'インポート先の店舗が選択されていません。' });
                return;
              }
              if (pendingImportData && pendingImportData.length > 0) {
                setIsImporting(true);
                try {
                  await importProductsFromCSV(targetStore, pendingImportData, importMode);
                  if (targetStore === 'master' && managedStoreId !== 'master') {
                    setManagedStoreId('master');
                  }
                } catch (err) {
                  console.error('Import failed:', err);
                } finally {
                  setIsImporting(false);
                  setIsImportModeDialogOpen(false);
                  setPendingImportData(null);
                }
              }
            }}>
              {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              インポートを実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>商品価格変更履歴</DialogTitle>
            <DialogDescription>
              最近変更された商品の価格変更履歴です。（最新50件を表示）
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {historyLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : priceHistory.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">価格の変更履歴はありません。</p>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日時</TableHead>
                      <TableHead>商品コード</TableHead>
                      <TableHead>商品名</TableHead>
                      <TableHead className="text-right">旧価格</TableHead>
                      <TableHead className="text-right">新価格</TableHead>
                      <TableHead>更新者</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((history) => {
                      const date = history.updatedAt instanceof Timestamp 
                        ? history.updatedAt.toDate() 
                        : new Date(history.updatedAt);
                      return (
                        <TableRow key={history.id}>
                          <TableCell className="whitespace-nowrap">{date.toLocaleString()}</TableCell>
                          <TableCell className="font-mono">{history.productCode}</TableCell>
                          <TableCell className="font-medium">{history.productName}</TableCell>
                          <TableCell className="text-right text-muted-foreground">¥{history.oldPrice?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-slate-800">¥{history.newPrice?.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{history.updatedBy}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryOpen(false)} className="w-full">閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
