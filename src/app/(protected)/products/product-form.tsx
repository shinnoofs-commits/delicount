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
  productCode: z.string().min(1, { message: '商品コードは必須です。' }),
  price: z.coerce.number().min(0, { message: '価格は正の数でなければなりません。' }),
  costPrice: z.coerce.number().min(0, { message: '原価は正の数でなければなりません。' }),
  category: z.string().min(1, { message: 'カテゴリーは必須です。' }),
  pricePattern: z.string().optional(),
  dailyProduction: z.object({
    sun: z.coerce.number().min(0),
    mon: z.coerce.number().min(0),
    tue: z.coerce.number().min(0),
    wed: z.coerce.number().min(0),
    thu: z.coerce.number().min(0),
    fri: z.coerce.number().min(0),
    sat: z.coerce.number().min(0),
    holiday: z.coerce.number().min(0),
  }).optional(),
})

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product: Omit<Product, 'storeId'> | null;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
}

const daysOfWeek = [
    { name: 'mon', label: '月' },
    { name: 'tue', label: '火' },
    { name: 'wed', label: '水' },
    { name: 'thu', label: '木' },
    { name: 'fri', label: '金' },
    { name: 'sat', label: '土' },
    { name: 'sun', label: '日' },
    { name: 'holiday', label: '祝' },
] as const;


export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product 
      ? {
        ...product,
        dailyProduction: product.dailyProduction ?? { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 }
      }
      : {
        name: '',
        productCode: '',
        price: 0,
        costPrice: 0,
        category: '揚げ物',
        pricePattern: '',
        dailyProduction: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, holiday: 0 },
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
        </div>
        <div className="grid grid-cols-2 gap-4">
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

        <div className="space-y-2">
            <FormLabel>曜日・祝日ごとの製造予定数</FormLabel>
            <div className="grid grid-cols-8 gap-2">
                {daysOfWeek.map(day => (
                <FormField
                    key={day.name}
                    control={form.control}
                    name={`dailyProduction.${day.name}`}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-normal">{day.label}</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                ))}
            </div>
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
