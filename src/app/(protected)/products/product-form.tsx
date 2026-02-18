'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: '名前は2文字以上である必要があります。' }),
  productCode: z.string().min(1, { message: '商品コードは必須です。' }),
  price: z.coerce.number().min(0, { message: '価格は正の数でなければなりません。' }),
  costPrice: z.coerce.number().min(0, { message: '原価は正の数でなければなりません。' }),
  category: z.string().min(1, { message: 'カテゴリーは必須です。' }),
  pricePattern: z.string().optional(),
})

const productCategories = [
  '温惣菜',
  '冷惣菜',
  '弁当',
  '丼ぶり',
  '揚げ物',
  '唐揚げ',
  'おこわ',
];

const pricePatterns = ['専門店', '量販店'];

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product: Omit<Product, 'storeId' | 'dailyProduction'> | null;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product 
      ? { ...product, pricePattern: product.pricePattern || '' }
      : {
        name: '',
        productCode: '',
        price: 0,
        costPrice: 0,
        category: '',
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
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリーを選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {productCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="パターンを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pricePatterns.map(pattern => (
                        <SelectItem key={pattern} value={pattern}>
                          {pattern}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="p-4 bg-muted rounded-md mt-4">
            <p className="text-sm text-muted-foreground">
                曜日ごとの製造予定数は、商品一覧ページの「<span className="font-semibold">曜日別予定数を一括編集</span>」ボタンから設定します。
            </p>
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
