import { createFileRoute, useParams } from "@tanstack/react-router";

import { ProductDetail } from "@/features/products/product-detail";

function ProductDetailPage() {
  const { id } = useParams({ from: "/_authed/products/$id" });
  return <ProductDetail productId={id} />;
}

export const Route = createFileRoute("/_authed/products/$id")({
  component: ProductDetailPage,
});
