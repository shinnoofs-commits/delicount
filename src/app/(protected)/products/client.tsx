
'use client'

import { useState } from "react"
import { MoreHorizontal, PlusCircle, Plus, Minus, Upload, Trash2 } from "lucide-react"
import Papa from "papaparse"

import type { Product, Category } from "@/lib/types"
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

export default function ProductsClient() {
  const { products, addProduct, updateProduct, deleteProduct, deleteProducts, setProducts } = useProducts();
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const { toast } = useToast()

  const handleAdd = () => {
    setProductToDelete(null)
    setIsFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setProductToDelete(product)
    setIsFormOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setProductsToDelete([])
    setIsDeleteConfirmOpen(true)
  }

  const handleDeleteSelected = () => {
    setProductToDelete(null)
    setProductsToDelete(selectedProductIds)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      toast({ title: "商品が削除されました", description: `「${productToDelete.name}」を削除しました。` });
    } else if (productsToDelete.length > 0) {
      deleteProducts(productsToDelete);
      toast({ title: "商品が削除されました", description: `${productsToDelete.length}件の商品を削除しました。` });
    }
    setIsDeleteConfirmOpen(false)
    setProductToDelete(null)
    setProductsToDelete([])
    setSelectedProductIds([])
  }

  const handleFormSubmit = (productData: Omit<Product, 'id'> & { id?: string }) => {
    const newProductData = { ...productData };

    if (productToDelete && productData.id) {
      updateProduct(newProductData as Product);
    } else {
      addProduct(newProductData as Omit<Product, 'id'>);
    }
    setIsFormOpen(false)
    setProductToDelete(null)
  }
  
  const adjustQuantity = (productId: string, amount: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
        const newQuantity = Math.max(0, product.productionQuantity + amount);
        updateProduct({ ...product, productionQuantity: newQuantity });
    }
  }

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const importedProducts = results.data.map((row: any) => {
            const productCode = row['label_number'] || row['商品コード'];
            const existingProduct = products.find(p => p.productCode === productCode);
            
            let materials, containers;
            if (row.materials_json) {
                try {
                    materials = JSON.parse(row.materials_json);
                } catch (e) {
                    console.error(`Error parsing materials_json for product code ${productCode}:`, e);
                }
            }
            if (row.containers_json) {
                try {
                    containers = JSON.parse(row.containers_json);
                } catch (e) {
                    console.error(`Error parsing containers_json for product code ${productCode}:`, e);
                }
            }

            const csvCategory = row['categor'] || row['カテゴリ'];

            return {
              id: existingProduct?.id || `prod-${Date.now()}-${Math.random()}`,
              name: row['recipe_name'] || row['商品名'],
              productCode: productCode,
              price: parseFloat(row['selling_price'] || row['価格']),
              costPrice: parseFloat(row['total_cost'] || row['原価額']),
              productionQuantity: existingProduct?.productionQuantity || 0,
              category: csvCategory,
              materials: materials || existingProduct?.materials,
              containers: containers || existingProduct?.containers,
            } as Product;
          });

          const updatedProducts = [...products];
          importedProducts.forEach(importedProduct => {
            if (!importedProduct.name || !importedProduct.productCode) return;
            const index = updatedProducts.findIndex(p => p.productCode === importedProduct.productCode);
            if (index !== -1) {
              updatedProducts[index] = { ...updatedProducts[index], ...importedProduct };
            } else {
              updatedProducts.push(importedProduct);
            }
          });
          
          setProducts(updatedProducts);
          toast({
            title: "CSVインポート完了",
            description: `${importedProducts.length}件の商品をインポート/更新しました。`,
          });
        },
        error: (error) => {
            toast({
                variant: 'destructive',
                title: "CSVインポートエラー",
                description: `ファイルの読み込みに失敗しました: ${error.message}`,
            })
        }
      });
    }
  };

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
      <div className="flex items-center justify-end gap-2">
         {selectedProductIds.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
            <Trash2 className="h-4 w-4 mr-2" />
            選択した{selectedProductIds.length}件を削除
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
            <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                CSVで商品をインポート
            </label>
        </Button>
        <Input 
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
        />
        <Button size="sm" onClick={handleAdd}>
          <PlusCircle className="h-4 w-4 mr-2" />
          商品を追加
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>商品</CardTitle>
          <CardDescription>商品の管理ができます。</CardDescription>
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
                  />
                </TableHead>
                <TableHead>名前</TableHead>
                <TableHead>商品コード</TableHead>
                <TableHead className="hidden md:table-cell">カテゴリ</TableHead>
                <TableHead className="text-right">価格</TableHead>
                 <TableHead className="text-right">原価額</TableHead>
                <TableHead className="text-center">製造数量</TableHead>
                <TableHead>
                  <span className="sr-only">アクション</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
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
                  <TableCell className="text-right font-medium">¥{product.price.toLocaleString()}</TableCell>
                   <TableCell className="text-right">¥{product.costPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => adjustQuantity(product.id, -1)}>
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center">{product.productionQuantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => adjustQuantity(product.id, 1)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                  </TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{productToDelete ? '商品を編集' : '商品を追加'}</DialogTitle>
            <DialogDescription>
              {productToDelete ? '商品の詳細を更新します。' : '新しい商品を追加します。'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm product={productToDelete} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>よろしいですか？</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete
                ? `この操作は元に戻せません。商品「${productToDelete?.name}」を完全に削除します。`
                : `この操作は元に戻せません。選択した${productsToDelete.length}件の商品を完全に削除します。`}
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
