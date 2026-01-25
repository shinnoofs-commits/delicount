
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import type { Store } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: '店舗名は必須です。' }),
  email: z.string().email({ message: '有効なメールアドレスを入力してください。' }),
  password: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.id) { // This is a new store
    if (!data.password || data.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '6文字以上の初期パスワードが必須です。',
        path: ['password'],
      });
    }
  }
});

type FormValues = z.infer<typeof formSchema>

interface StoreFormProps {
  store: Store | null
  onSubmit: (data: FormValues) => void
  onCancel: () => void
}

export function StoreForm({ store, onSubmit, onCancel }: StoreFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: store || {
      name: '',
      email: '',
      password: ''
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
              <FormLabel>店舗名</FormLabel>
              <FormControl>
                <Input placeholder="例：東京本店" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ログイン用メールアドレス</FormLabel>
              <FormControl>
                <Input type="email" placeholder="store@example.com" {...field} disabled={!!store} />
              </FormControl>
               {!!store && <p className="text-xs text-muted-foreground">セキュリティ上の理由により、メールアドレスは変更できません。</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        {!store && (
            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>初期パスワード</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="6文字以上" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </Form>
  )
}
