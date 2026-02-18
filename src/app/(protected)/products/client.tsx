'use client'

import { useState, useMemo, useEffect } from "react"
import { MoreHorizontal, PlusCircle, Upload, Trash2, Download, Loader2, RefreshCw, Edit } from "lucide-react"
import Papa from "papaparse"

import type { Product, Store, DailyProduction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  TableFooter,
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
import Link from "next/link"
import { useStores } from "@/contexts/store-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdmin } from "@/hooks/use-admin"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

const daysOfWeek: (keyof DailyProduction)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holiday'];
const dayLabels: Record<keyof DailyProduction, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
  holiday: '祝',
};

const ScheduleEditor = ({ products, storeId, onSave, onCancel }: { products: Product[], storeId: string, onSave: (schedules: Record<string, Partial<DailyProduction>>) => void, onCancel: () => void }) => {
    const categories = useMemo(() => ['すべて', ...Array.from(new Set(products.map(p => p.category)))], [products]);
    const [selectedCategory, setSelectedCategory] = useState('すべて');
    const [schedules, setSchedules] = useState<Record<string, Partial<DailyProduction>>>({});
    const [rowHeaderInputs, setRowHeaderInputs] = useState<Record<string, string>>({});
    const [tableKey, setTableKey] = useState(Date.now());
    const { toast } = useToast();

    useEffect(() => {
        const initialSchedules = products.reduce((acc, product) => {
            acc[product.id] = product.dailyProduction || {};
            return acc;
        }, {} as Record<string, Partial<DailyProduction>>);
        setSchedules(initialSchedules);
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'すべて') return products;
        return products.filter(p => p.category === selectedCategory);
    }, [products, selectedCategory]);

    const handleScheduleChange = (productId: string, day: keyof DailyProduction, value: string) => {
        const numValue = parseInt(value, 10);
        setSchedules(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [day]: isNaN(numValue) ? undefined : numValue,
            }
        }));
    };

    const handleRowHeaderInputChange = (productId: string, value: string) => {
        setRowHeaderInputs(prev => ({ ...prev, [productId]: value }));
    };

    const handleRowHeaderScheduleChange = (productId: string, value: string) => {
        const numValue = parseInt(value, 10);
        
        if (value === '' || isNaN(numValue) || numValue < 0) {
            setRowHeaderInputs(prev => ({ ...prev, [productId]: '' }));
            return;
        }

        setSchedules(prevSchedules => {
            const newProductSchedule: Partial<DailyProduction> = { ...prevSchedules[productId] };
            daysOfWeek.forEach(day => {
                newProductSchedule[day] = numValue;
            });
            return {
                ...prevSchedules,
                [productId]: newProductSchedule
            };
        });
        
        setTableKey(Date.now());
        setRowHeaderInputs(prev => ({ ...prev, [productId]: '' }));
    };


    const columnTotals = useMemo(() => {
      return daysOfWeek.reduce((acc, day) => {
          acc[day] = filteredProducts.reduce((sum, product) => {
              return sum + (schedules[product.id]?.[day] || 0);
          }, 0);
          return acc;
      }, {} as Record<keyof DailyProduction, number>);
    }, [schedules, filteredProducts, tableKey]);
    
    const grandTotal = useMemo(() => {
        return Object.values(columnTotals).reduce((sum, val) => sum + val, 0);
    }, [columnTotals])

    return (
      <>
        <DialogHeader>
          <DialogTitle>曜日別予定数を一括編集</DialogTitle>
          <DialogDescription>
            カテゴリを選択し、商品ごとの曜日・祝日別製造予定数を入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <ScrollArea className="w-full whitespace-nowrap rounded-md">
                    <TabsList className="inline-flex">
                        {categories.map(category => (
                            <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                        ))}
                    </TabsList>
                </ScrollArea>
            </Tabs>
            <div className="relative block w-full overflow-auto rounded-md border h-[60vh]">
              <table key={tableKey} className="text-sm caption-bottom min-w-max">
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <TableRow>
                          <TableHead className="sticky left-0 bg-muted/80 min-w-[200px]">商品</TableHead>
                          {daysOfWeek.map(day => 
                            <TableHead key={day} className="text-right min-w-[100px]">
                                {dayLabels[day]}
                            </TableHead>
                          )}
                           <TableHead className="text-right min-w-[100px]">
                            一括入力
                            <span className="block text-xs font-normal text-muted-foreground">行全体</span>
                          </TableHead>
                          <TableHead className="text-right font-bold min-w-[80px]">合計</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredProducts.map(product => {
                          const rowTotal = daysOfWeek.reduce((sum, day) => sum + (schedules[product.id]?.[day] || 0), 0);
                          return (
                              <TableRow key={product.id}>
                                  <TableCell className="sticky left-0 bg-background font-medium">{product.name}</TableCell>
                                  {daysOfWeek.map(day => (
                                      <TableCell key={day}>
                                          <Input
                                              type="number"
                                              className="w-20 text-right"
                                              defaultValue={schedules[product.id]?.[day] || ''}
                                              onBlur={(e) => handleScheduleChange(product.id, day, e.target.value)}
                                              placeholder="0"
                                              min="0"
                                          />
                                      </TableCell>
                                  ))}
                                  <TableCell>
                                    <Input
                                        type="number"
                                        placeholder="一括"
                                        className="w-20 text-right"
                                        value={rowHeaderInputs[product.id] || ''}
                                        onChange={(e) => handleRowHeaderInputChange(product.id, e.target.value)}
                                        onBlur={(e) => handleRowHeaderScheduleChange(product.id, e.target.value)}
                                        min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right font-bold">{rowTotal.toLocaleString()}</TableCell>
                              </TableRow>
                          )
                      })}
                  </TableBody>
                  <TableFooter className="sticky bottom-0 bg-muted/80 backdrop-blur-sm">
                      <TableRow>
                          <TableHead className="sticky left-0 bg-muted/80 min-w-[200px]">合計</TableHead>
                          {daysOfWeek.map(day => <TableHead key={day} className="text-right">{columnTotals[day]?.toLocaleString()}</TableHead>)}
                          <TableHead></TableHead>
                          <TableHead className="text-right font-bold">{grandTotal.toLocaleString()}</TableHead>
                      </TableRow>
                  </TableFooter>
              </table>
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>キャンセル</Button>
          <Button onClick={() => onSave(schedules)}>変更を保存</Button>
        </DialogFooter>
      </>
    );
};

const productCategories = [
  '温惣菜',
  '冷惣菜',
  '弁当',
  '丼ぶり',
  '揚げ物',
  '唐揚げ',
  'おこわ',
];

const BulkProductEditor = ({ products, onSave, onCancel }: { products: Product[], onSave: (productsToUpdate: Pick<Product, 'id' | 'category' | 'pricePattern'>[]) => void, onCancel: () => void }) => {
    const [updatedProducts, setUpdatedProducts] = useState<Record<string, { category: string, pricePattern: string }>>({});

    useEffect(() => {
        const initial = products.reduce((acc, product) => {
            acc[product.id] = { category: product.category, pricePattern: product.pricePattern || '' };
            return acc;
        }, {} as Record<string, { category: string, pricePattern: string }>);
        setUpdatedProducts(initial);
    }, [products]);

    const handleCategoryChange = (productId: string, category: string) => {
        setUpdatedProducts(prev => ({
            ...prev,
            [productId]: {
                ...(prev[productId] || { category: '', pricePattern: '' }),
                category: category,
            }
        }));
    };

    const handlePricePatternChange = (productId: string, pricePattern: string) => {
         setUpdatedProducts(prev => ({
            ...prev,
            [productId]: {
                ...(prev[productId] || { category: '', pricePattern: '' }),
                pricePattern: pricePattern,
            }
        }));
    };

    const handleSave = () => {
        const productsToUpdate = Object.entries(updatedProducts).map(([id, data]) => ({
            id,
            ...data,
        }));
        onSave(productsToUpdate);
    };
    
    return (
        <>
            <DialogHeader>
              <DialogTitle>カテゴリ・価格パターンを一括編集</DialogTitle>
              <DialogDescription>
                商品ごとのカテゴリと価格パターンを一括で編集します。
              </DialogDescription>
            </DialogHeader>
            <div className="h-[60vh] overflow-auto border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky top-0 bg-muted">商品名</TableHead>
                            <TableHead className="sticky top-0 bg-muted w-48">カテゴリー</TableHead>
                            <TableHead className="sticky top-0 bg-muted w-48">価格パターン</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map(product => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>
                                    <Select
                                        value={updatedProducts[product.id]?.category || ''}
                                        onValueChange={(value) => handleCategoryChange(product.id, value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="カテゴリーを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {productCategories.map(category => (
                                            <SelectItem key={category} value={category}>
                                                {category}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={updatedProducts[product.id]?.pricePattern || ''}
                                        onChange={(e) => handlePricePatternChange(product.id, e.target.value)}
                                        placeholder="例: 通常"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>キャンセル</Button>
                <Button onClick={handleSave}>変更を保存</Button>
            </DialogFooter>
        </>
    );
};


export default function ProductsClient() {
  const { stores, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  const { products: allProducts, addProduct, updateProduct, deleteProducts, importProductsFromCSV, syncAllProducts, updateSchedules, bulkUpdateProducts, loading: productsLoading, refetchProducts } = useProducts();
  
  const [managedStoreId, setManagedStoreId] = useState<string | undefined>(stores[0]?.id);
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Product | null>(null)
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false)
  const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false)

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
      const existingProduct = products.find(p => p.id === productData.id);
      const updatedProductData = {
         ...existingProduct, 
         ...productData,
         dailyProduction: existingProduct?.dailyProduction || { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 }
      }
      await updateProduct(managedStoreId, updatedProductData as Product);
    } else {
      await addProduct(managedStoreId, productData);
    }
    setIsFormOpen(false)
    setProductToEdit(null)
  }
  
  const handleScheduleSave = (schedules: Record<string, Partial<DailyProduction>>) => {
    if (!managedStoreId) return;
    updateSchedules(managedStoreId, schedules);
    setIsScheduleEditorOpen(false);
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
            importProductsFromCSV(importedProducts);
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

  const handleSyncAll = async () => {
    if (!managedStoreId) {
      toast({
        variant: 'destructive',
        title: '同期元の店舗が選択されていません',
        description: '同期の基準となる店舗を選択してください。',
      });
      return;
    }
    setIsSyncing(true);
    await syncAllProducts(managedStoreId);
    setIsSyncing(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>商品</CardTitle>
            <CardDescription>商品の管理ができます。</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Button variant="outline" size="sm" onClick={refetchProducts} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                商品情報を更新
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBulkEditorOpen(true)} disabled={!managedStoreId}>
                <Edit className="h-4 w-4 mr-2" />
                カテゴリ等を一括編集
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsScheduleEditorOpen(true)} disabled={!managedStoreId}>
                <Edit className="h-4 w-4 mr-2" />
                曜日別予定数を一括編集
            </Button>
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

            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  現在の設定で全店舗を同期
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
      
      <Dialog open={isScheduleEditorOpen} onOpenChange={setIsScheduleEditorOpen}>
        <DialogContent className="max-w-7xl block">
          <Tabs defaultValue="すべて" className="w-full">
            {managedStoreId && <ScheduleEditor products={products} storeId={managedStoreId} onSave={handleScheduleSave} onCancel={() => setIsScheduleEditorOpen(false)} />}
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkEditorOpen} onOpenChange={setIsBulkEditorOpen}>
        <DialogContent className="max-w-4xl">
            {managedStoreId && <BulkProductEditor products={products} onSave={handleBulkUpdate} onCancel={() => setIsBulkEditorOpen(false)} />}
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
