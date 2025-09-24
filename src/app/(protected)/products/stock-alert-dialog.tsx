'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';

import type { Product } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateStockLevelThreshold, GenerateStockLevelThresholdOutput } from '@/ai/flows/generate-stock-level-threshold';
import { transactions } from '@/lib/data';

interface StockAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

export function StockAlertDialog({ open, onOpenChange, product }: StockAlertDialogProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GenerateStockLevelThresholdOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const fetchThreshold = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
          const historicalSalesData = transactions
            .flatMap(t => t.items)
            .filter(item => item.productId === product.id);

          const response = await generateStockLevelThreshold({
            productId: product.id,
            currentStockLevel: product.stock,
            historicalSalesData: JSON.stringify(historicalSalesData),
          });
          setResult(response);
        } catch (e) {
          setError('Failed to generate recommendation. Please try again.');
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchThreshold();
    }
  }, [open, product]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Stock Level Recommendation</DialogTitle>
          <DialogDescription>
            For product: <strong>{product.name}</strong> (Current Stock: {product.stock})
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Generating recommendation...</span>
            </div>
          )}
          {error && (
             <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {result && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Optimal Stock Threshold: {result.optimalThreshold} units</AlertTitle>
              <AlertDescription>
                <strong>Reasoning:</strong> {result.reasoning}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
