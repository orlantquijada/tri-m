import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { CustomersDataTable } from "@/features/customers/customers-data-table";
import { CustomersExportButton } from "@/features/exports/export-buttons";
import { authClient } from "@/lib/auth-client";

function CustomersPage() {
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";

  return (
    <main className="container mx-auto w-full max-w-full px-0 py-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/customers/missing-location"
            >
              Missing location
            </Link>
          )}
          <CustomersExportButton />
          <Link to="/customers/new" className={buttonVariants()}>
            Add Customer
          </Link>
        </div>
      </div>
      <CustomersDataTable />
    </main>
  );
}

export const Route = createFileRoute("/_authed/customers/")({
  component: CustomersPage,
});
