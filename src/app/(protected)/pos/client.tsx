
'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Plus, Minus, Trash2, Loader2, CalendarIcon } from 'lucide-react';
import type { Product, WasteItem, WasteEntry } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/contexts/transaction-context';
import { useProducts } from '@/contexts/product-context';
import { useStores } from '@/contexts/store-context';
import { useAdmin } from '@/hooks/use-admin';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type WasteListItem = {
  product: Product;
  quantity: number;
};

export default function PosClient() {
  const { addWasteEntry, loading: wasteLoading } = useTransactions();
  const { products: allProducts, loading: productsLoading } = useProducts();
  const { userStore, loading: storesLoading } = useStores();
  const { isAdmin } = useAdmin();
  
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [wasteList, setWasteList] = useState<WasteListItem[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const { toast } = useToast();

  const categories = useMemo(() => ['すべて', ...Array.from(new Set(allProducts.map(p => p.category)))], [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesCategory = selectedCategory === 'すべて' || product.category === selectedCategory;
      return matchesCategory;
    });
  }, [selectedCategory, allProducts]);

  const addToWasteList = useCallback((product: Product) => {
    setWasteList(prevList => {
      const existingItem = prevList.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevList.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevList, { product, quantity: 1 }];
    });
    toast({
      title: "廃棄リストに追加しました",
      description: `${product.name} をリストに追加しました。`,
      duration: 500,
    })
  }, [toast]);

  const updateQuantity = (productId: string, quantity: number) => {
    setWasteList(prevList => {
      if (quantity <= 0) {
        return prevList.filter(item => item.product.id !== productId);
      }
      return prevList.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearWasteList = () => {
    setWasteList([]);
  };

  const totalWasteCost = useMemo(() => {
    return wasteList.reduce((acc, item) => acc + item.product.costPrice * item.quantity, 0);
  }, [wasteList]);
  
  const totalWastePrice = useMemo(() => {
    return wasteList.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [wasteList]);

  const handleRecordWaste = async () => {
    if (wasteList.length === 0) {
      toast({
        variant: "destructive",
        title: "リストが空です",
        description: "廃棄する商品を追加してください。",
      });
      return;
    }
    
    if (!userStore) {
        toast({
            variant: "destructive",
            title: "店舗が設定されていません",
            description: "このアカウントには店舗が紐付いていません。管理者に連絡してください。",
        });
        return;
    }

    const newWasteEntry: Omit<WasteEntry, 'id' | 'userId'> = {
      storeId: userStore.id,
      date: date,
      items: wasteList.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
      })),
      totalWasteCost,
    };

    await addWasteEntry(newWasteEntry);
    clearWasteList();
  };

  const isLoading = productsLoading || storesLoading;

  if (isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>管理者アカウント</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">廃棄入力は店舗アカウントで行ってください。</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isLoading && !userStore) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>店舗が紐付いていません</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">このアカウントには店舗が紐付いていません。管理者に連絡して店舗を割り当ててもらってください。</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 items-start lg:grid-cols-3">
      {/* Product Selection */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList>
                {categories.map(category => (
                    <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                ))}
            </TabsList>
          </ScrollArea>
        </Tabs>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredProducts.map(product => (
            <Card 
                key={product.id} 
                onClick={() => addToWasteList(product)} 
                className="cursor-pointer hover:shadow-lg hover:border-destructive transition-all flex flex-col min-h-24"
            >
            <CardContent className="p-4 flex-1 flex flex-col justify-center">
                <div className="text-center">
                    <p className="font-semibold text-sm break-words">{product.name}</p>
                    <p className="text-xs text-muted-foreground">原価: ¥{product.costPrice.toLocaleString()}</p>
                </div>
            </CardContent>
            </Card>
        ))}
        </div>
      </div>

      {/* Waste List Section */}
      <div className="lg:col-span-1 sticky top-6">
        <Card className="flex flex-col h-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              廃棄商品リスト
              <Button variant="ghost" size="icon" onClick={clearWasteList} disabled={wasteList.length === 0}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">リストをクリア</span>
              </Button>
            </CardTitle>
            <div className="flex items-center gap-2 pt-2 text-sm">
                <p className="font-medium">廃棄日:</p>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[200px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP", { locale: ja }) : <span>日付を選択</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => { if(d) setDate(d) }}
                            initialFocus
                            locale={ja}
                            disabled={(d) => d > new Date() || d < new Date("2000-01-01")}
                        />
                    </PopoverContent>
                </Popover>
            </div>
          </CardHeader>
          <div className="flex-grow">
            <div className="p-6">
              {wasteList.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  <p>廃棄リストは空です。</p>
                  <p className="text-sm">商品をクリックして追加してください。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wasteList.map(item => (
                    <div key={item.product.id} className="space-y-2">
                       <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm flex-grow min-w-0 break-words pr-2">{item.product.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-medium text-sm w-20 text-right text-destructive">¥{(item.product.price * item.quantity).toLocaleString()}</span>
                            <span className="font-medium text-sm w-20 text-right">¥{(item.product.costPrice * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="w-12 text-center text-lg">x{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                         <div className="flex-1 text-right text-xs text-muted-foreground">
                            <span>売: ¥{item.product.price.toLocaleString()}</span> / <span>原: ¥{item.product.costPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <CardFooter className="flex flex-col gap-4 mt-auto !p-6 bg-muted/50">
            <div className="w-full space-y-2 text-sm">
              <Separator />
               <div className="flex justify-between">
                  <span>機会損失額 (売価)</span>
                  <span className="text-destructive">¥{totalWastePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                  <span>廃棄合計額 (原価)</span>
                  <span>¥{totalWasteCost.toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" size="lg" disabled={wasteList.length === 0 || wasteLoading} onClick={handleRecordWaste}>
               {wasteLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Trash2 className="mr-2 h-5 w-5"/>}
               廃棄を記録
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
