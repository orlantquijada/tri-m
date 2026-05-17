import { createFileRoute } from "@tanstack/react-router";

import { DistributorForm } from "@/features/distributors/distributor-form";

function NewDistributorPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">New Distributor</h1>
      <DistributorForm />
    </div>
  );
}

export const Route = createFileRoute("/_authed/distributors/new")({
  component: NewDistributorPage,
});
