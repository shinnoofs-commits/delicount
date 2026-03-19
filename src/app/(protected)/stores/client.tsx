
'use client'

import { useState } from "react"
import { MoreHorizontal, PlusCircle, Trash2, Key, Mail } from "lucide-react"

import type { Store } from "@/lib/types"
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { useUser } from "@/firebase"

export default function StoresClient() {
  const { stores, addStore, updateStore, deleteStore, toggleAdminRole, resetPassword } = useStores()
  const { isAdmin, isAdminLoading } = useAdmin()
  const { user } = useUser()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [storeToEdit, setStoreToEdit] = useState<Store | null>(null)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)
  const [storeToReset, setStoreToReset] = useState<Store | null>(null)

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

  const handleResetPassword = (store: Store) => {
    setStoreToReset(store)
    setIsResetConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (storeToDelete) {
      deleteStore(storeToDelete.id)
    }
    setIsDeleteConfirmOpen(false)
    setStoreToDelete(null)
  }

  const confirmResetPassword = async () => {
    if (storeToReset) {
      await resetPassword(storeToReset.email);
    }
    setIsResetConfirmOpen(false)
    setStoreToReset(null)
  }

  const handleFormSubmit = (storeData: Partial<Store> & { password?: string }) => {
    if (storeData.id) {
      updateStore(storeData as Store)
    } else {
      addStore(storeData as Omit<Store, 'id' | 'userId' | 'isAdmin'> & { password?: string });
    }
    setIsFormOpen(false)
    setStoreToEdit(null)
  }

  const handleToggleAdminRole = (store: Store) => {
    toggleAdminRole(store);
  };


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
          <CardTitle>店舗・アカウント一覧</CardTitle>
          <CardDescription>アカウントの管理・役割の変更ができます。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名 / アカウント名</TableHead>
                <TableHead>ログイン用メールアドレス</TableHead>
                <TableHead>役割</TableHead>
                <TableHead>
                  <span className="sr-only">アクション</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    まだ店舗アカウントが登録されていません。
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.email}</TableCell>
                    <TableCell>
                      {store.isAdmin ? <Badge>管理者</Badge> : <Badge variant="secondary">店舗</Badge>}
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
                          <DropdownMenuItem onClick={() => handleEdit(store)}>
                            店舗名を編集
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAdminRole(store)} disabled={store.userId === user?.uid}>
                            {store.isAdmin ? '店舗アカウントに変更' : '管理者に変更'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleResetPassword(store)}>
                            <Mail className="h-4 w-4 mr-2" />
                            パスワード再設定メールを送信
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(store)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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
              {storeToEdit ? "店舗を編集" : "店舗アカウントを追加"}
            </DialogTitle>
            <DialogDescription>
              {storeToEdit
                ? "店舗の名称を更新します。"
                : "新しい店舗アカウントを作成します。作成されたアカウントは初期状態では「管理者」です。"}
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
              」を完全に削除します。関連するログインアカウントは自動では削除されません。
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

      <AlertDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>パスワード再設定メールを送信しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{storeToReset?.name} ({storeToReset?.email})」宛に、パスワードを再設定するためのリンクが含まれたメールを送信します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetPassword}
            >
              送信する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
