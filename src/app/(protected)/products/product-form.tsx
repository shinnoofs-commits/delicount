'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: '名前は2文字以上である必要があります。' }),
  sku: z.string().min(2, { message: 'SKUは2文字以上である必要があります。' }),
  price: z.coerce.number().min(0, { message: '価格は正の数でなければなりません。' }),
  stock: z.coerce.number().int().min(0, { message: '在庫は正の整数でなければなりません。' }),
  category: z.string().min(1, { message: 'カテゴリは必須です。' }),
  imageUrl: z.string().url({ message: "有効なURLを入力してください。" }),
  imageHint: z.string(),
})

interface ProductFormProps {
  product: Product | null;
  onSubmit: (data: Product) => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: product || {
      id: '',
      name: '',
      sku: '',
      price: 0,
      stock: 0,
      category: '揚げ物',
      imageUrl: '',
      imageHint: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>商品名</FormLabel>
              <FormControl>
                <Input placeholder="例：絶品コロッケ" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>価格</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="150" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>在庫</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="SKU001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>カテゴリ</FormLabel>
                <FormControl>
                  <Input placeholder="例：揚げ物" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>画像URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit">商品を保存</Button>
        </div>
      </form>
    </Form>
  )
}
