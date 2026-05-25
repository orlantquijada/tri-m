import { buttonVariants } from "@/components/ui/button";
import { env } from "@/lib/env";

const apiBase = `${env.VITE_API_URL}/api/exports`;

function ExportButton({
  filename,
  href,
  label = "Export CSV",
}: {
  filename: string;
  href: string;
  label?: string;
}) {
  return (
    <a
      className={buttonVariants({ variant: "outline" })}
      download={filename}
      href={href}
    >
      {label}
    </a>
  );
}

export function OverdueExportButton() {
  return (
    <ExportButton filename="overdue.csv" href={`${apiBase}/overdue.csv`} />
  );
}

export function CustomersExportButton() {
  return (
    <ExportButton filename="customers.csv" href={`${apiBase}/customers.csv`} />
  );
}

export function ProductsExportButton() {
  return (
    <ExportButton filename="products.csv" href={`${apiBase}/products.csv`} />
  );
}

export function ProductMovementsExportButton({
  productId,
}: {
  productId: string;
}) {
  return (
    <ExportButton
      filename={`stock-movements-${productId}.csv`}
      href={`${apiBase}/stock-movements.csv?productId=${productId}`}
      label="Export movements"
    />
  );
}
