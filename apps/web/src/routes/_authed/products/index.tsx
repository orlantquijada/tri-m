import { createFileRoute } from "@tanstack/react-router";

import { ProductList } from "@/features/products/product-list";

export const Route = createFileRoute("/_authed/products/")({
  component: ProductList,
});
