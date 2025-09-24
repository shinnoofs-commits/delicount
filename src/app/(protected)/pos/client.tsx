'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Search, X, Plus, Minus, Percent, Tag, CreditCard } from 'lucide-react';
import { products as allProducts } from '@/lib/data';
import type { Product, CartItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckoutDialog } from './checkout-dialog';
import { useToast } from '@/hooks/use-toast';

const categories = ['すべて', ...Array.from(new Set(allProducts.map(p => p.category)))];

export default function PosClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState({ type: 'percentage', value: 0 });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { toast } = useToast();

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesCategory = selectedCategory === 'すべて' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    toast({
      title: "カートに追加しました",
      description: `${product.name} をカートに追加しました。`,
    })
  }, [toast]);

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prevCart => {
      if (quantity <= 0) {
        return prevCart.filter(item => item.product.id !== productId);
      }
      return prevCart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setDiscount({ type: 'percentage', value: 0 });
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discount.type === 'percentage') {
      return Math.round((subtotal * discount.value) / 100);
    }
    return Math.min(discount.value, subtotal);
  }, [subtotal, discount]);
  
  const taxAmount = Math.round((subtotal - discountAmount) * 0.1); // 10% tax for example
  const total = subtotal - discountAmount + taxAmount;

  return (
    <div className="grid flex-1 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 h-[calc(100vh-theme(spacing.24))]">
      {/* Product Selection */}
      <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-4">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="商品名またはSKUで検索..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
            </CardHeader>
        </Card>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
                {categories.map(category => (
                    <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                ))}
            </TabsList>
        </Tabs>

        <ScrollArea className="flex-1 -m-2 p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
                <Card 
                    key={product.id} 
                    onClick={() => addToCart(product)} 
                    className="cursor-pointer hover:shadow-lg hover:border-primary transition-all flex flex-col"
                >
                <CardContent className="p-2 flex-1 flex flex-col">
                    <div className="aspect-square w-full relative">
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                            className="rounded-md object-cover"
                            data-ai-hint={product.imageHint}
                        />
                    </div>
                    <div className="pt-2 text-center">
                        <p className="font-semibold text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">¥{product.price.toLocaleString()}</p>
                    </div>
                </CardContent>
                </Card>
            ))}
            </div>
        </ScrollArea>
      </div>

      {/* Cart Section */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            カート
            <Button variant="ghost" size="icon" onClick={clearCart} disabled={cart.length === 0}>
                <X className="h-4 w-4" />
                <span className="sr-only">カートを空にする</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <p>カートは空です。</p>
                <p className="text-sm">商品を追加してください。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-start gap-4">
                    <Image src={item.product.imageUrl} alt={item.product.name} width={64} height={64} className="rounded-md object-cover aspect-square" data-ai-hint={item.product.imageHint} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">¥{item.product.price.toLocaleString()}</p>
                       <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-5 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                    </div>
                    <p className="font-medium text-sm">¥{(item.product.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </ScrollArea>
        <CardFooter className="flex flex-col gap-4 mt-auto !p-6 bg-muted/50">
          <div className="w-full space-y-2 text-sm">
             <div className="flex justify-between">
                <span>小計</span>
                <span>¥{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
                <span>割引</span>
                <div className="flex items-center gap-2 w-32">
                  <Input type="number" 
                    className="h-8 text-right" 
                    value={discount.value} 
                    onChange={e => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                  />
                  <Button variant={discount.type === 'percentage' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setDiscount({ type: 'percentage', value: discount.value })}>
                    <Percent className="h-4 w-4"/>
                  </Button>
                  <Button variant={discount.type === 'amount' ? 'secondary' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setDiscount({ type: 'amount', value: discount.value })}>
                    <CreditCard className="h-4 w-4"/>
                  </Button>
                </div>
            </div>
             <div className="flex justify-between text-muted-foreground">
                <span></span>
                <span>-¥{discountAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
                <span>税 (10%)</span>
                <span>¥{taxAmount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
                <span>合計</span>
                <span>¥{total.toLocaleString()}</span>
            </div>
          </div>
          <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)}>
             <Tag className="mr-2 h-5 w-5"/> 販売を完了
          </Button>
        </CardFooter>
      </Card>
      {isCheckoutOpen && (
        <CheckoutDialog 
            isOpen={isCheckoutOpen} 
            onClose={() => setIsCheckoutOpen(false)}
            onConfirm={() => {
                setIsCheckoutOpen(false);
                toast({ title: '販売完了！', description: `取引額 ¥${total.toLocaleString()} が記録されました` });
                clearCart();
            }}
            total={total}
            cartItems={cart}
        />
      )}
    </div>
  );
}
