
'use client'

import { useState } from "react"
import { MoreHorizontal, PlusCircle, Building, Trash2 } from "lucide-react"

import type { Store } from "@/lib/types"
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
import { StoreForm } from "./store-form"
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
import { useStores } from "@/contexts/store-context"
import { useToast } from "@/hooks/use-toast"
import { useAdmin } from "@/hooks/use-admin"

export default function StoresClient() {
  const { stores, addStore, updateStore, deleteStore } = useStores()
  const { isAdmin, isAdminLoading } = useAdmin()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [storeToEdit, setStoreToEdit] = useState<Store | null>(null)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)

  const { toast } = useToast()

  if (isAdminLoading || !isAdmin) {
    return null
  }

  const handleAdd = () => {
    setStoreToEdit(null)
    setIsFormOpen(true)
  }

  const handleEdit = (store: Store) => {
    setStoreToEdit(store)
    setIsFormOpen(true)
  }

  const handleDelete = (store: Store) => {
    setStoreToDelete(store)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (storeToDelete) {
      deleteStore(storeToDelete.id)
      toast({
        title: "店舗が削除されました",
        description: `「${storeToDelete.name}」を削除しました。`,
      })
    }
    setIsDeleteConfirmOpen(false)
    setStoreToDelete(null)
  }

  const handleFormSubmit = (storeData: Omit<Store, 'id'> & { id?: string }) => {
    if (storeData.id) {
      updateStore(storeData as Store)
    } else {
      addStore(storeData)
    }
    setIsFormOpen(false)
    setStoreToEdit(null)
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button size="sm" onClick={handleAdd}>
          <PlusCircle className="h-4 w-4 mr-2" />
          店舗を追加
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>店舗一覧</CardTitle>
          <CardDescription>事業全体の店舗を管理します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名</TableHead>
                <TableHead>所在地</TableHead>
                <TableHead>
                  <span className="sr-only">アクション</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    まだ店舗が登録されていません。
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.location}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(store)}>
                            編集
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(store)}
                            className="text-destructive"
                          >
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {storeToEdit ? "店舗を編集" : "店舗を追加"}
            </DialogTitle>
            <DialogDescription>
              {storeToEdit
                ? "店舗の詳細を更新します。"
                : "新しい店舗を追加します。"}
            </DialogDescription>
          </DialogHeader>
          <StoreForm
            store={storeToEdit}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>よろしいですか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。「{storeToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
