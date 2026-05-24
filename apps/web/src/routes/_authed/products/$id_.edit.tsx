import { createFileRoute, useParams } from "@tanstack/react-router";

import { ProductForm } from "@/features/products/product-form";
import { productQueries } from "@/features/products/queries";
import { centsToPesoInput } from "@/lib/format";

function EditProductPage() {
  const { id } = useParams({ from: "/_authed/products/$id_/edit" });
  const { data, error, isLoading } = productQueries.useDetail(id);

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading...</p>;
  }
  if (error || !data) {
    return <p className="p-6 text-destructive">Failed to load product.</p>;
  }

  const defaultValues = {
    description: data.description ?? "",
    distributorId: data.distributorId,
    name: data.name,
    sku: data.sku,
    unitPricePesos: centsToPesoInput(data.unitPriceCents),
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">Edit Product</h1>
      <ProductForm defaultValues={defaultValues} productId={id} />
    </div>
  );
}

export const Route = createFileRoute("/_authed/products/$id_/edit")({
  component: EditProductPage,
});
