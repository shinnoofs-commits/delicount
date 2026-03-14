'use client'

import { useState, useMemo, useEffect } from "react"
import { MoreHorizontal, PlusCircle, Upload, RefreshCw, Edit, Loader2 } from "lucide-react"
import Papa from "papaparse"

import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdmin } from "@/hooks/use-admin"

const productCategories = [
  '温惣菜',
  '冷惣菜',
  '弁当',
  '丼ぶり',
  '揚げ物',
  '唐揚げ',
  'おこわ',
];

const pricePatterns = ['専門店', '量販店'];

const BulkProductEditor = ({ products, onSave, onCancel }: { products: Product[], onSave: (productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => void, onCancel: () => void }) => {
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
        const valueName = type === 'category' ? 'カテゴリ' : '価格パターン';

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
              <DialogTitle>カテゴリ・価格パターンを一括編集</DialogTitle>
              <DialogDescription>一括適用または個別編集してください。</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-4 p-4 border-y bg-muted/50">
                <div className="flex items-center gap-2">
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                        <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="一括適用カテゴリ" /></SelectTrigger>
                        <SelectContent>{productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleApplyBulk('category')} disabled={selectedIds.length === 0}>カテゴリを適用</Button>
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
                                        <SelectTrigger><SelectValue placeholder="カテゴリ" /></SelectTrigger>
                                        <SelectContent>{productCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                <Button onClick={handleSave} disabled={selectedIds.length === 0}>選択した{selectedIds.length}件を保存</Button>
            </DialogFooter>
        </>
    );
};

export default function ProductsClient() {
  const { stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { products: allProducts, addProduct, updateProduct, deleteProducts, importProductsFromCSV, syncAllProducts, bulkUpdateProducts, loading: productsLoading, refetchProducts } = useProducts();
  
  const [managedStoreId, setManagedStoreId] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Product | null>(null)
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false)
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false)

  const { toast } = useToast()
  
  useEffect(() => {
    if (!managedStoreId && stores.length > 0) setManagedStoreId(stores[0].id);
  }, [stores, managedStoreId]);

  const products = useMemo(() => {
    if (!managedStoreId) return [];
    return allProducts.filter(p => p.storeId === managedStoreId);
  }, [allProducts, managedStoreId]);

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
      await updateProduct(managedStoreId, { ...existingProduct, ...productData } as Product);
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

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported = results.data.map((row: any) => {
          const productCode = row['label_number'] || row['商品コード'];
          if (!productCode) return null;
          return {
            name: row['recipe_name'] || row['商品名'],
            productCode,
            price: parseFloat(row['selling_price'] || row['価格']) || 0,
            costPrice: parseFloat(row['total_cost'] || row['原価額']) || 0,
            category: row['category'] || row['カテゴリー'],
            pricePattern: row['price_pattern_label'] || '',
          };
        }).filter(Boolean) as Omit<Product, 'id' | 'storeId'>[];
        if (imported.length > 0) importProductsFromCSV(imported);
        event.target.value = '';
      }
    });
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
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>商品管理</CardTitle>
            <CardDescription>登録されている商品の一覧です。製造計画はサイドバーの「製造計画」から設定してください。</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && stores.length > 0 && (
                <Select value={managedStoreId} onValueChange={setManagedStoreId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="店舗を選択" /></SelectTrigger>
                  <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
            )}
            <Button variant="outline" size="sm" onClick={refetchProducts} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />更新</Button>
            <Button variant="outline" size="sm" onClick={() => setIsBulkEditorOpen(true)} disabled={!managedStoreId}><Edit className="h-4 w-4 mr-2" />カテゴリ一括編集</Button>
            {isAdmin && (
              <>
                <Button asChild variant="outline" size="sm">
                    <label htmlFor="csv-upload" className="cursor-pointer">CSVインポート</label>
                </Button>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
                <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={isSyncing}><RefreshCw className="h-4 w-4 mr-2" />全店舗同期</Button>
              </>
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
                <TableHead className="text-right">価格</TableHead>
                <TableHead className="text-right">原価</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="h-6 w-6 animate-spin inline-block" /></TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10">商品がありません。</TableCell></TableRow>
              ) : (
                products.map(product => (
                <TableRow key={product.id}>
                   <TableCell><Checkbox checked={selectedProductIds.includes(product.id)} onCheckedChange={(checked) => setSelectedProductIds(prev => checked ? [...prev, product.id] : prev.filter(id => id !== product.id))} /></TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.productCode}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                  <TableCell className="text-right">¥{product.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{product.costPrice.toLocaleString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(product)}>編集</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>{productToEdit ? '編集' : '追加'}</DialogTitle></DialogHeader>
          <ProductForm product={productToEdit} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isBulkEditorOpen} onOpenChange={setIsBulkEditorOpen}>
        <DialogContent className="max-w-4xl">
            {managedStoreId && <BulkProductEditor products={products} onSave={handleBulkUpdate} onCancel={() => setIsBulkEditorOpen(false)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>削除確認</AlertDialogTitle><AlertDialogDescription>選択した商品を削除しますか？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>全店舗同期</AlertDialogTitle><AlertDialogDescription>この店舗の商品設定を全店舗に反映しますか？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsSyncConfirmOpen(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSync} disabled={isSyncing}>{isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}実行</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
