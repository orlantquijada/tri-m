import { createFileRoute, useParams } from "@tanstack/react-router";

import { DistributorForm } from "@/features/distributors/distributor-form";
import { distributorQueries } from "@/features/distributors/queries";
import { AssignDistributorDialog } from "@/features/users/assign-distributor-dialog";

function EditDistributorPage() {
  const { id } = useParams({ from: "/_authed/distributors/$id/edit" });
  const distributorId = Number.parseInt(id, 10);
  const { data, error, isLoading } =
    distributorQueries.useDetail(distributorId);

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Distributor</h1>
        <AssignDistributorDialog distributorId={distributorId} />
      </div>
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
