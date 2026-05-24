import { createFileRoute } from "@tanstack/react-router";

import { CustomerForm } from "@/features/customers/customer-form";
import { CustomerIntakeWizard } from "@/features/customers/customer-intake-wizard";
import { features } from "@/lib/features";

function NewCustomerPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">New Customer</h1>
      {features.intakeWizard ? <CustomerIntakeWizard /> : <CustomerForm />}
    </div>
  );
}

export const Route = createFileRoute("/_authed/customers/new")({
  component: NewCustomerPage,
});
