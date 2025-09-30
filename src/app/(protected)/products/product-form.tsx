
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: '名前は2文字以上である必要があります。' }),
  productCode: z.string().length(6, { message: '商品コードは6桁である必要があります。' }),
  price: z.coerce.number().min(0, { message: '価格は正の数でなければなりません。' }),
  costPrice: z.coerce.number().min(0, { message: '原価は正の数でなければなりません。' }),
  productionQuantity: z.coerce.number().int().min(0, { message: '製造数量は正の整数でなければなりません。' }),
  category: z.string().min(1, { message: 'カテゴリーは必須です。' }),
  pricePattern: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product: Product | null;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product || {
      name: '',
      productCode: '',
      price: 0,
      costPrice: 0,
      productionQuantity: 0,
      category: '揚げ物',
      pricePattern: '',
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
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>原価額</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="80" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productionQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>製造数量</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="productCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>商品コード</FormLabel>
                <FormControl>
                  <Input placeholder="000001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>カテゴリー</FormLabel>
                  <FormControl>
                    <Input placeholder="例：揚げ物" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="pricePattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>価格パターン</FormLabel>
                  <FormControl>
                    <Input placeholder="例：通常" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
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
