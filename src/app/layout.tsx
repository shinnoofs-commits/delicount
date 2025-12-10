
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { TransactionProvider } from '@/contexts/transaction-context';
import { ProductProvider } from '@/contexts/product-context';

export const metadata: Metadata = {
  title: '廃棄分析ツール',
  description: '廃棄分析に特化したツールです。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <ProductProvider>
            <TransactionProvider>
              {children}
              <Toaster />
            </TransactionProvider>
          </ProductProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
