
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2, Wand2 } from 'lucide-react'
import { generateImage } from '@/ai/flows/generate-image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ImageGenerationDialogProps {
  isOpen: boolean
  onClose: () => void
  onImageGenerated: (imageUrl: string, imageHint: string) => void
  productName: string
}

export function ImageGenerationDialog({ isOpen, onClose, onImageGenerated, productName }: ImageGenerationDialogProps) {
  const [prompt, setPrompt] = useState(`美味しそうな${productName}、日本の惣菜屋のスタイル、白い背景`)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setGeneratedImageUrl(null)
    try {
      const result = await generateImage({ prompt });
      if (result.imageUrl) {
        // Use a proxy to fetch the image and avoid CORS issues if any, and to confirm it's a valid image
        const response = await fetch(result.imageUrl);
        if (!response.ok) {
            throw new Error(`画像の取得に失敗しました: ${response.statusText}`);
        }
        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);
        setGeneratedImageUrl(objectURL);

      } else {
        throw new Error('画像が生成されませんでした。')
      }
    } catch (e: any) {
      console.error(e)
      setError('画像の生成に失敗しました。プロンプトを変更して再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const handleUseImage = () => {
    if (generatedImageUrl) {
      onImageGenerated(generatedImageUrl, prompt.substring(0, 50).replace(/'/g, ''))
      toast({
        title: "画像が設定されました",
        description: "商品フォームの画像URLが更新されました。",
      })
      onClose()
    }
  }
  
  const handleClose = () => {
    if (generatedImageUrl) {
        URL.revokeObjectURL(generatedImageUrl);
    }
    setGeneratedImageUrl(null)
    setError(null)
    setLoading(false)
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AIによる画像生成</DialogTitle>
          <DialogDescription>
            商品の画像を説明するプロンプトを入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">プロンプト</Label>
            <Input
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例: 木のテーブルの上にある美味しそうなコロッケ"
            />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !prompt}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            画像を生成
          </Button>

          {loading && (
             <div className="flex items-center justify-center pt-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {generatedImageUrl && (
            <div className="space-y-4 pt-4">
               <p className="text-sm font-medium">生成された画像:</p>
                <div className="relative aspect-square w-full rounded-md border">
                    <Image
                    src={generatedImageUrl}
                    alt="Generated product image"
                    fill
                    sizes="400px"
                    className="object-cover rounded-md"
                    />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button type="button" onClick={handleUseImage} disabled={!generatedImageUrl}>
            この画像を使用する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
