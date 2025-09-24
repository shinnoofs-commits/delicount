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
  { value: 'Cash', label: 'Cash', icon: Banknote },
  { value: 'Credit Card', label: 'Credit Card', icon: CreditCard },
  { value: 'E-Money', label: 'E-Money', icon: Smartphone },
  { value: 'QR Code', label: 'QR Code', icon: QrCode },
  { value: 'Points', label: 'Points', icon: Coins },
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
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Total amount to be paid is <strong>${total.toFixed(2)}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <label htmlFor="payment-method" className="text-sm font-medium">Payment Method</label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger id="payment-method" className="w-full">
              <SelectValue placeholder="Select a payment method" />
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
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
