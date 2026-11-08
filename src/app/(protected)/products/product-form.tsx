
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import type { Product, Store } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const pricePatterns = ['専門店', '量販店'];

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: '名前は2文字以上である必要があります。' }),
  productCode: z.string().min(1, { message: '商品コードは必須です。' }),
  price: z.coerce.number().min(0, { message: '価格は正の数でなければなりません。' }),
  costPrice: z.coerce.number().min(0, { message: '原価は正の数でなければなりません。' }),
  category: z.string().min(1, { message: 'カテゴリーは必須です。' }),
  pricePattern: z.string().optional(),
  isFixedPrice: z.boolean().optional(),
  targetStoreIds: z.array(z.string()).optional(),
})

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product: Omit<Product, 'storeId' | 'dailyProductionSunny' | 'dailyProductionRainy'> | null;
  categories: string[];
  stores?: Store[];
  managedStoreId?: string;
  initialTargetStoreIds?: string[];
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
}

export function ProductForm({ product, categories, stores, managedStoreId, initialTargetStoreIds, onSubmit, onCancel }: ProductFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product 
      ? { 
          ...product, 
          pricePattern: product.pricePattern || '', 
          isFixedPrice: product.isFixedPrice ?? false,
          targetStoreIds: initialTargetStoreIds ?? (managedStoreId ? [managedStoreId] : []),
        }
      : {
        name: '',
        productCode: '',
        price: 0,
        costPrice: 0,
        category: '',
        pricePattern: '',
        isFixedPrice: false,
        targetStoreIds: initialTargetStoreIds ?? (managedStoreId ? [managedStoreId] : []),
    },
  })

  useEffect(() => {
    form.reset(product 
      ? { 
          ...product, 
          pricePattern: product.pricePattern || '', 
          isFixedPrice: product.isFixedPrice ?? false,
          targetStoreIds: initialTargetStoreIds ?? (managedStoreId ? [managedStoreId] : []),
        }
      : {
        name: '',
        productCode: '',
        price: 0,
        costPrice: 0,
        category: '',
        pricePattern: '',
        isFixedPrice: false,
        targetStoreIds: initialTargetStoreIds ?? (managedStoreId ? [managedStoreId] : []),
      });
  }, [product, initialTargetStoreIds, managedStoreId, form]);

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
                    {categories.map(category => (
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
            <FormField
              control={form.control}
              name="isFixedPrice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      価格を固定する
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
        </div>

        {stores && stores.length > 0 && (
          <FormField
            control={form.control}
            name="targetStoreIds"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">登録店舗</FormLabel>
                  <FormDescription>
                    {product ? '商品を更新・追加・削除する店舗を選択してください' : '商品を追加する店舗を選択してください（複数選択可）'}
                  </FormDescription>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-muted/50 rounded-md border">
                  {stores.map((store) => (
                    <FormField
                      key={store.id}
                      control={form.control}
                      name="targetStoreIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={store.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(store.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  return checked
                                    ? field.onChange([...current, store.id])
                                    : field.onChange(
                                        current.filter((value) => value !== store.id)
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {store.name}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="p-4 bg-muted rounded-md mt-4">
            <p className="text-sm text-muted-foreground">
                曜日ごとの製造予定数は、サイドバーの「製造計画」から設定します。
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
