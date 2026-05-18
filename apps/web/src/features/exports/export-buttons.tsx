import { buttonVariants } from "@/components/ui/button";
import { env } from "@/lib/env";

const apiBase = `${env.VITE_API_URL}/api/exports`;

export function OverdueExportButton() {
  return (
    <a
      href={`${apiBase}/overdue.csv`}
      download="overdue.csv"
      className={buttonVariants({ variant: "outline" })}
    >
      Export CSV
    </a>
  );
}

export function CustomersExportButton() {
  return (
    <a
      href={`${apiBase}/customers.csv`}
      download="customers.csv"
      className={buttonVariants({ variant: "outline" })}
    >
      Export CSV
    </a>
  );
}
