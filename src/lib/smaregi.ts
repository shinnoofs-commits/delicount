import { Transaction, TransactionItem } from './types';

const SMAREGI_CONTRACT_ID = process.env.SMAREGI_CONTRACT_ID!;
const SMAREGI_CLIENT_ID = process.env.SMAREGI_CLIENT_ID!;
const SMAREGI_CLIENT_SECRET = process.env.SMAREGI_CLIENT_SECRET!;

const TOKEN_URL = `https://id.smaregi.jp/app/${SMAREGI_CONTRACT_ID}/token`;
const API_URL = `https://api.smaregi.jp/${SMAREGI_CONTRACT_ID}/pos/transactions`;

/**
 * Gets an OAuth2 access token for Smaregi Platform API using Client Credentials Grant
 */
export async function getSmaregiAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${SMAREGI_CLIENT_ID}:${SMAREGI_CLIENT_SECRET}`).toString('base64');
  
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('scope', 'pos.products:read pos.transactions:read pos.stores:read');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Smaregi Auth Error:', err);
    throw new Error(`Failed to obtain Smaregi access token: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetches transactions from Smaregi for a given date (YYYY-MM-DD)
 */
export async function fetchTransactions(dateStr: string, accessToken: string) {
  const fromTime = `${dateStr}T00:00:00+09:00`;
  const toTime = `${dateStr}T23:59:59+09:00`;
  
  const allTransactions = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const url = new URL(API_URL);
    url.searchParams.append('transaction_date_time-from', fromTime);
    url.searchParams.append('transaction_date_time-to', toTime);
    url.searchParams.append('with_details', 'all');
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('page', page.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Smaregi API Error:', err);
      throw new Error(`Failed to fetch transactions from Smaregi: ${err}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      break; // No more transactions
    }

    allTransactions.push(...data);
    
    if (data.length < limit) {
      break; // Last page
    }
    
    page++;
  }

  return allTransactions;
}

/**
 * Transforms a Smaregi transaction into our app's `Transaction` type
 */
export function transformSmaregiTransaction(sTx: any, storeId: string): Transaction | null {
  // If the transaction is canceled (cancelFlag = 1), ignore it
  if (String(sTx.cancelFlag) === '1') {
    return null;
  }

  // If the transaction is a return (transactionHeadDivision = 2), quantities should be negative
  const isReturn = String(sTx.transactionHeadDivision) === '2';
  const multiplier = isReturn ? -1 : 1;

  const items: TransactionItem[] = [];
  
  let totalSubtotal = 0;
  let sumBundleDiscount = 0;
  let sumSingleDiscount = 0;

  if (sTx.details && Array.isArray(sTx.details)) {
    for (const detail of sTx.details) {
      const rawQty = Number(detail.quantity || 0);
      const qty = rawQty * multiplier;
      const unitPrice = Number(detail.price || 0);
      
      // Sum up all forms of discounts applied to this item
      const itemUnitDiscount = Number(detail.unitDiscountSum || 0);
      const proportionalDiscount = Number(detail.discountPriceProportional || 0);
      const couponProportional = Number(detail.discountCouponProportional || 0);
      const bundleProportional = Number(detail.productBundleProportional || 0);
      const bargainProportional = Number(detail.bargainDiscountProportional || 0);

      const totalItemDiscount = itemUnitDiscount + proportionalDiscount + couponProportional + bundleProportional + bargainProportional;
      
      sumSingleDiscount += totalItemDiscount;
      totalSubtotal += (unitPrice * qty);

      const pCode = detail.productCode || '';
      const pName = detail.productName || '';
      const pCategory = detail.categoryName || '';

      let itemDiscRate = 0;
      const basePrice = unitPrice * qty;
      if (basePrice > 0) {
        itemDiscRate = totalItemDiscount / basePrice;
      }

      items.push({
        productId: pCode, // Fallback ID
        productCode: pCode,
        name: pName,
        quantity: qty,
        unitPrice: unitPrice,
        wasDiscounted: (totalItemDiscount > 0),
        discountRate: itemDiscRate,
        category: pCategory
      });
    }
  }

  // Also include any transaction-level discounts that might not be proportionally distributed (just in case)
  // Usually Smaregi distributes them, but if total discount > sum of item discounts, we adjust.
  const headDiscount = Number(sTx.subtotalDiscountPrice || 0) + Number(sTx.couponDiscount || 0) + Number(sTx.pointDiscount || 0);
  const totalDiscountAmount = Math.max(sumSingleDiscount, headDiscount);
  
  // Smaregi's sTx.total includes tax, but our app often operates on pre-tax subtotal or we just use sTx.total.
  // sTx.total is the final amount paid.
  const finalAmount = Number(sTx.total || (totalSubtotal - totalDiscountAmount));

  return {
    id: sTx.transactionHeadId, // unique tx ID
    storeId: storeId,
    date: new Date(sTx.transactionDateTime), // e.g. 2026-06-16T12:34:56+09:00
    items,
    totalAmount: totalSubtotal,
    discount: totalDiscountAmount > 0 ? { type: 'amount', value: totalDiscountAmount } : null,
    finalAmount: finalAmount,
    paymentMethod: 'Cash', // Defaulting to Cash
    entryType: 'SALE'
  };
}
