import { createFileRoute, useParams } from "@tanstack/react-router";

import { DistributorForm } from "@/features/distributors/distributor-form";
import { useDistributorQuery } from "@/features/distributors/queries";

function EditDistributorPage() {
  const { id } = useParams({ from: "/_authed/distributors/$id/edit" });
  const distributorId = Number.parseInt(id, 10);
  const { data, error, isLoading } = useDistributorQuery(distributorId);

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading...</p>;
  }
  if (error || !data) {
    return <p className="p-6 text-destructive">Failed to load distributor.</p>;
  }

  const defaultValues = {
    assignedArea: data.assignedArea ?? "",
    name: data.name,
    phone: data.phone,
    status: data.status,
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">Edit Distributor</h1>
      <DistributorForm
        distributorId={distributorId}
        defaultValues={defaultValues}
      />
    </div>
  );
}

export const Route = createFileRoute("/_authed/distributors/$id/edit")({
  component: EditDistributorPage,
});
