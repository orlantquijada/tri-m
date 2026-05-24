import { Link, createFileRoute, useParams } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { productQueries } from "@/features/products/queries";
import { formatPesoOrDash } from "@/lib/format";

function ProductDetailPage() {
  const { id } = useParams({ from: "/_authed/products/$id" });
  const { data, error, isLoading } = productQueries.useDetail(id);

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading...</p>;
  }
  if (error || !data) {
    return <p className="p-6 text-destructive">Failed to load product.</p>;
  }

  return (
    <main className="container mx-auto w-full max-w-3xl px-4 py-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">{data.sku}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={buttonVariants({ variant: "outline" })}
            params={{ id: data.id }}
            to="/products/$id_/edit"
          >
            Edit
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <Badge
              variant={data.status === "archived" ? "outline" : "secondary"}
            >
              {data.status}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Unit price</dt>
          <dd className="mt-1 tabular-nums">
            {formatPesoOrDash(data.unitPriceCents)}
          </dd>
        </div>
        {data.description && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">{data.description}</dd>
          </div>
        )}
      </dl>
    </main>
  );
}

export const Route = createFileRoute("/_authed/products/$id")({
  component: ProductDetailPage,
});
