'use client'

import { useState } from 'react'
import { Banknote, CreditCard, QrCode, Smartphone, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CartItem } from '@/lib/types'

const paymentMethods = [
  { value: 'Cash', label: '現金', icon: Banknote },
  { value: 'Credit Card', label: 'クレジットカード', icon: CreditCard },
  { value: 'E-Money', label: '電子マネー', icon: Smartphone },
  { value: 'QR Code', label: 'QRコード', icon: QrCode },
  { value: 'Points', label: 'ポイント', icon: Coins },
]

interface CheckoutDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  total: number
  cartItems: CartItem[]
}

export function CheckoutDialog({ isOpen, onClose, onConfirm, total }: CheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('Credit Card')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>支払いを完了</DialogTitle>
          <DialogDescription>
            お支払い総額は <strong>¥{total.toLocaleString()}</strong> です。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <label htmlFor="payment-method" className="text-sm font-medium">お支払い方法</label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger id="payment-method" className="w-full">
              <SelectValue placeholder="お支払い方法を選択" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map(method => (
                <SelectItem key={method.value} value={method.value}>
                  <div className="flex items-center gap-2">
                    <method.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{method.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="button" onClick={onConfirm} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            支払いを確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
