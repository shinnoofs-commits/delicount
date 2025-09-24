import { products } from "@/lib/data"
import ProductsClient from "./client"
import { Product } from "@/lib/types"

export const metadata = {
  title: "商品 - SwiftPOS",
};

export default function ProductsPage() {
  const allProducts: Product[] = products;

  return (
    <ProductsClient initialProducts={allProducts} />
  )
}
