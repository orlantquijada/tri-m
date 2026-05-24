import { createFileRoute } from "@tanstack/react-router";

import { ProductForm } from "@/features/products/product-form";

function NewProductPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">New Product</h1>
      <ProductForm />
    </div>
  );
}

export const Route = createFileRoute("/_authed/products/new")({
  component: NewProductPage,
});
