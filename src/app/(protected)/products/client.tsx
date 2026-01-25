
'use client'

import { useState, useMemo, useEffect } from "react"
import { MoreHorizontal, PlusCircle, Upload, Trash2, Download, Loader2 } from "lucide-react"
import Papa from "papaparse"

import type { Product, Store } from "@/lib/types"
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import Link from "next/link"
import { useStores } from "@/contexts/store-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdmin } from "@/hooks/use-admin"

export default function ProductsClient() {
  const { stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { products: allProducts, addProduct, updateProduct, deleteProducts, importProductsFromCSV, loading: productsLoading } = useProducts();
  
  const [managedStoreId, setManagedStoreId] = useState<string | undefined>(stores[0]?.id);
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Product | null>(null)
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const { toast } = useToast()
  
  useEffect(() => {
    if (!managedStoreId && stores.length > 0) {
      setManagedStoreId(stores[0].id);
    }
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

  const handleDeleteSelected = () => {
    setProductsToDelete(selectedProductIds)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (productsToDelete.length > 0 && managedStoreId) {
        await deleteProducts(managedStoreId, productsToDelete);
        const singular = productsToDelete.length === 1;
        const productName = singular ? `「${products.find(p => p.id === productsToDelete[0])?.name}」` : `${productsToDelete.length}件の商品`;
        toast({ title: `商品が削除されました`, description: `${productName}を削除しました。` });
    }
    setIsDeleteConfirmOpen(false)
    setProductsToDelete([])
    setSelectedProductIds([])
  }

  const handleFormSubmit = async (productData: Omit<Product, 'id' | 'storeId'> & { id?: string }) => {
    if (!managedStoreId) return;

    if (productData.id) {
      await updateProduct(managedStoreId, { ...productData, storeId: managedStoreId } as Product);
    } else {
      await addProduct(managedStoreId, productData);
    }
    setIsFormOpen(false)
    setProductToEdit(null)
  }

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !managedStoreId) return;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const importedProducts = results.data.map((row: any) => {
            const productCode = row['label_number'] || row['商品コード'];
            if (!productCode || productCode.trim() === '') return null;
            
            const price = parseFloat(row['selling_price'] || row['価格']);
            const costPrice = parseFloat(row['total_cost'] || row['原価額']);
            
            const productData: any = {
              name: row['recipe_name'] || row['商品名'],
              productCode: productCode,
              price: isNaN(price) ? 0 : price,
              costPrice: isNaN(costPrice) ? 0 : costPrice,
              category: row['category'] || row['カテゴリー'],
              pricePattern: row['price_pattern_label'] || '',
            };
            
            if (!productData.name || !productData.category) return null;

            if (row.materials_json) {
              try {
                productData.materials = JSON.parse(row.materials_json);
              } catch (e) { 
                console.error(`Error parsing materials_json for product code ${productCode}:`, e); 
              }
            }
            if (row.containers_json) {
              try {
                productData.containers = JSON.parse(row.containers_json);
              } catch (e) { 
                console.error(`Error parsing containers_json for product code ${productCode}:`, e); 
              }
            }

            return productData;
          }).filter(Boolean) as Omit<Product, 'id' | 'storeId'>[];


          if (importedProducts.length > 0) {
            importProductsFromCSV(managedStoreId, importedProducts);
          }
          
          event.target.value = '';
        },
        error: (error) => {
            toast({ variant: 'destructive', title: "CSVインポートエラー", description: `ファイルの読み込みに失敗しました: ${error.message}` })
        }
      });
  };
  
  const handleCsvDownload = () => {
    if (products.length === 0) {
      toast({ variant: 'destructive', title: 'エクスポートするデータがありません' });
      return;
    }
    const csv = Papa.unparse(products.map(({ id, storeId, ...rest }) => rest));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const storeName = stores.find(s => s.id === managedStoreId)?.name || 'products';
    link.setAttribute('download', `${storeName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(products.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  }

  const handleSelectRow = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds(prev => [...prev, productId]);
    } else {
      setSelectedProductIds(prev => prev.filter(id => id !== productId));
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>商品</CardTitle>
            <CardDescription>商品の管理ができます。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && stores.length > 0 && (
                <Select value={managedStoreId} onValueChange={setManagedStoreId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="管理対象の店舗を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            )}
             {selectedProductIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="h-4 w-4 mr-2" />
                選択した{selectedProductIds.length}件を削除
              </Button>
            )}
            {isAdmin && (
              <>
                <Button asChild variant="outline" size="sm">
                    <label htmlFor="csv-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        CSVインポート
                    </label>
                </Button>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
              </>
            )}
            
            {isAdmin && (
               <Button variant="outline" size="sm" onClick={handleCsvDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  CSVエクスポート
              </Button>
            )}

            <Button size="sm" onClick={handleAdd}>
              <PlusCircle className="h-4 w-4 mr-2" />
              商品を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead padding="checkbox">
                  <Checkbox
                    checked={selectedProductIds.length > 0 && selectedProductIds.length === products.length}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    aria-label="すべての商品を選択"
                    disabled={products.length === 0}
                  />
                </TableHead>
                <TableHead>名前</TableHead>
                <TableHead>商品コード</TableHead>
                <TableHead className="hidden md:table-cell">カテゴリー</TableHead>
                <TableHead className="hidden lg:table-cell">価格パターン</TableHead>
                <TableHead className="text-right">価格</TableHead>
                 <TableHead className="text-right">原価額</TableHead>
                <TableHead>
                  <span className="sr-only">アクション</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin inline-block" />
                    </TableCell>
                </TableRow>
              ) : !isAdmin && stores.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        <p className="mb-2">店舗が登録されていません。</p>
                        <Button asChild>
                            <Link href="/stores">店舗を登録する</Link>
                        </Button>
                    </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    商品がありません。
                  </TableCell>
                </TableRow>
              ) : (
                products.map(product => (
                <TableRow key={product.id} data-state={selectedProductIds.includes(product.id) && "selected"}>
                   <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectRow(product.id, checked as boolean)}
                      aria-label={`${product.name}を選択`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.productCode}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                  <TableCell className="hidden lg:table-cell">{product.pricePattern}</TableCell>
                  <TableCell className="text-right font-medium">¥{product.price.toLocaleString()}</TableCell>
                   <TableCell className="text-right">¥{product.costPrice.toLocaleString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">メニューを開閉</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>アクション</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(product)}>編集</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(product)} className="text-destructive">
                          削除
                        </DropdownMenuItem>
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
            <DialogTitle>{productToEdit ? '商品を編集' : '商品を追加'}</DialogTitle>
            <DialogDescription>
              {productToEdit ? '商品の詳細を更新します。' : '新しい商品を追加します。'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm product={productToEdit} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>よろしいですか？</AlertDialogTitle>
            <AlertDialogDescription>
              {`この操作は元に戻せません。選択した${productsToDelete.length}件の商品を完全に削除します。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
