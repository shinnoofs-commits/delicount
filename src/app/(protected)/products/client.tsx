'use client'

import { useState } from "react"
import Image from "next/image"
import { MoreHorizontal, PlusCircle } from "lucide-react"

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
import { StockAlertDialog } from "./stock-alert-dialog"
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

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

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
      setProducts(products.filter(p => p.id !== selectedProduct.id))
      setIsDeleteConfirmOpen(false)
      setSelectedProduct(null)
    }
  }

  const handleCheckStock = (product: Product) => {
    setSelectedProduct(product)
    setIsAlertOpen(true)
  }

  const handleFormSubmit = (productData: Product) => {
    if (selectedProduct) {
      // Edit
      setProducts(products.map(p => (p.id === productData.id ? productData : p)))
    } else {
      // Add
      setProducts([...products, { ...productData, id: `prod-${Date.now()}` }])
    }
    setIsFormOpen(false)
    setSelectedProduct(null)
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={handleAdd}>
          <PlusCircle className="h-4 w-4 mr-2" />
          商品を追加
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>商品</CardTitle>
          <CardDescription>商品の管理と在庫の確認ができます。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">画像</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="hidden md:table-cell">カテゴリ</TableHead>
                <TableHead>
                  <span className="sr-only">価格</span>
                </TableHead>
                <TableHead>
                  <span className="sr-only">在庫</span>
                </TableHead>
                <TableHead>
                  <span className="sr-only">アクション</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={product.name}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={product.imageUrl}
                      width="64"
                      data-ai-hint={product.imageHint}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                  <TableCell className="text-right font-medium">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.stock}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleCheckStock(product)}>
                          在庫アラートを確認
                        </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? '商品を編集' : '商品を追加'}</DialogTitle>
            <DialogDescription>
              {selectedProduct ? '商品の詳細を更新します。' : '新しい商品を在庫に追加します。'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm product={selectedProduct} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {selectedProduct && (
        <StockAlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen} product={selectedProduct} />
      )}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>よろしいですか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。商品「{selectedProduct?.name}」を完全に削除します。
            </CRLF>
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
