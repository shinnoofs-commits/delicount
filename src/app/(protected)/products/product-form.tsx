
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'

import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: '名前は2文字以上である必要があります。' }),
  sku: z.string().min(2, { message: 'SKUは2文字以上である必要があります。' }),
  price: z.coerce.number().min(0, { message: '価格は正の数でなければなりません。' }),
  stock: z.coerce.number().int().min(0, { message: '在庫は正の整数でなければなりません。' }),
  category: z.string().min(1, { message: 'カテゴリは必須です。' }),
  imageUrl: z.string().url({ message: "有効なURLを入力してください。" }).or(z.literal('')),
  imageHint: z.string(),
})

interface ProductFormProps {
  product: Product | null;
  onSubmit: (data: Product) => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const { toast } = useToast()
  const [previewImage, setPreviewImage] = useState<string | null>(product?.imageUrl || null)
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "ファイルが大きすぎます",
          description: "2MB未満の画像ファイルを選択してください。",
        })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        setPreviewImage(dataUrl)
        form.setValue('imageUrl', dataUrl, { shouldValidate: true })
        form.setValue('imageHint', file.name)
      }
      reader.readAsDataURL(file)
    }
  }


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
         <FormItem>
            <FormLabel>画像</FormLabel>
              <FormControl>
                <Input type="file" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} className="pt-1.5"/>
              </FormControl>
            <FormMessage />
            {previewImage && (
                <div className="mt-2 w-32 h-32 relative">
                    <Image src={previewImage} alt="Preview" fill className="rounded-md object-cover" />
                </div>
            )}
        </FormItem>
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
