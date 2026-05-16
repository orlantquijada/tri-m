import { createFileRoute } from "@tanstack/react-router";

import { CustomerList } from "@/features/customers/CustomerList";

function CustomersPage() {
  return (
    <main className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">Customers</h1>
      <CustomerList />
    </main>
  );
}

export const Route = createFileRoute("/_authed/customers/")({
  component: CustomersPage,
});
