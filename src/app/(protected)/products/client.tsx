
'use client'

import { useState } from "react"
import Image from "next/image"
import { MoreHorizontal, PlusCircle, Plus, Minus, Upload } from "lucide-react"
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

export default function ProductsClient() {
  const { products, addProduct, updateProduct, deleteProduct, setProducts } = useProducts();
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { toast } = useToast()

  const handleAdd = () => {
    setSelectedProduct(null)
    setIsFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }

  const handleDelete = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteProduct(selectedProduct.id);
      setIsDeleteConfirmOpen(false)
      setSelectedProduct(null)
    }
  }

  const handleFormSubmit = (productData: Omit<Product, 'id'> & { id?: string }) => {
    const newProductData = {
        ...productData,
        imageUrl: productData.imageUrl || 'https://placehold.co/400x400/png?text=No+Image',
        imageHint: productData.imageHint || 'product image'
    };

    if (selectedProduct && productData.id) {
      updateProduct(newProductData as Product);
    } else {
      addProduct(newProductData as Omit<Product, 'id'>);
    }
    setIsFormOpen(false)
    setSelectedProduct(null)
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
            const existingProduct = products.find(p => p.productCode === row['商品コード']);
            
            let materials, containers;
            if (row.materials_json) {
                try {
                    materials = JSON.parse(row.materials_json);
                } catch (e) {
                    console.error(`Error parsing materials_json for product code ${row['商品コード']}:`, e);
                }
            }
            if (row.containers_json) {
                try {
                    containers = JSON.parse(row.containers_json);
                } catch (e) {
                    console.error(`Error parsing containers_json for product code ${row['商品コード']}:`, e);
                }
            }

            return {
              id: existingProduct?.id || `prod-${Date.now()}-${Math.random()}`,
              name: row['商品名'],
              productCode: row['商品コード'],
              price: parseFloat(row['価格']),
              costPrice: parseFloat(row['原価額']),
              productionQuantity: existingProduct?.productionQuantity || 0,
              category: existingProduct?.category || '未分類',
              imageUrl: existingProduct?.imageUrl || 'https://placehold.co/400x400/png?text=No+Image',
              imageHint: existingProduct?.imageHint || 'product image',
              materials: materials || existingProduct?.materials,
              containers: containers || existingProduct?.containers,
            } as Product;
          });

          const updatedProducts = [...products];
          importedProducts.forEach(importedProduct => {
            const index = updatedProducts.findIndex(p => p.id === importedProduct.id);
            if (index !== -1) {
              updatedProducts[index] = { ...updatedProducts[index], ...importedProduct };
            } else {
              updatedProducts.push(importedProduct);
            }
          });
          
          setProducts(updatedProducts);
          toast({
            title: "CSVインポート完了",
            description: `${importedProducts.length}件の商品をインポートしました。`,
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


  return (
    <>
      <div className="flex items-center justify-end gap-2">
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
                <TableHead className="hidden w-[100px] sm:table-cell">画像</TableHead>
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
                <TableRow key={product.id}>
                  <TableCell className="hidden sm:table-cell">
                    {product.imageUrl && (
                      <Image
                        alt={product.name}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={product.imageUrl}
                        width="64"
                        data-ai-hint={product.imageHint}
                      />
                    )}
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
            <DialogTitle>{selectedProduct ? '商品を編集' : '商品を追加'}</DialogTitle>
            <DialogDescription>
              {selectedProduct ? '商品の詳細を更新します。' : '新しい商品を追加します。'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm product={selectedProduct} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>よろしいですか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。商品「{selectedProduct?.name}」を完全に削除します。
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
