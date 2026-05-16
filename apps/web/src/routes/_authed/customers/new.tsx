import { createFileRoute } from "@tanstack/react-router";

import { CustomerForm } from "@/features/customers/customer-form";

function NewCustomerPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">New Customer</h1>
      <CustomerForm />
    </div>
  );
}

export const Route = createFileRoute("/_authed/customers/new")({
  component: NewCustomerPage,
});
