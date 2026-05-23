import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { CustomerList } from "@/features/customers/customer-list";
import { CustomersExportButton } from "@/features/exports/export-buttons";
import { authClient } from "@/lib/auth-client";

function CustomersPage() {
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";

  return (
    <main className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex gap-2">
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
      <CustomerList />
    </main>
  );
}

export const Route = createFileRoute("/_authed/customers/")({
  component: CustomersPage,
});
