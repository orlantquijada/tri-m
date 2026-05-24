import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";

import { ProductsDataTable } from "./products-data-table";

export function ProductList() {
  return (
    <main className="container mx-auto w-full max-w-full px-0 py-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants()} to="/products/new">
            Add Product
          </Link>
        </div>
      </div>
      <ProductsDataTable />
    </main>
  );
}
