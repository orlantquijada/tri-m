import { createFileRoute, useParams } from "@tanstack/react-router";

import { DistributorForm } from "@/features/distributors/distributor-form";
import { distributorQueries } from "@/features/distributors/queries";
import { AssignDistributorDialog } from "@/features/users/assign-distributor-dialog";
import { userQueries } from "@/features/users/queries";
import { ResetPasswordDialog } from "@/features/users/reset-password-dialog";

function AssignedUsersSection({ distributorId }: { distributorId: string }) {
  const { data: users = [], isLoading } = userQueries.useList();
  const assigned = users.filter((u) => u.distributorId === distributorId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading users...</p>;
  }

  if (assigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No assigned users yet.</p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {assigned.map((u) => (
        <li
          key={u.id}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
          <ResetPasswordDialog targetUserId={u.id} targetUserName={u.name} />
        </li>
      ))}
    </ul>
  );
}

function EditDistributorPage() {
  const { id } = useParams({ from: "/_authed/distributors/$id/edit" });
  const distributorId = id;
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
      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Assigned Users</h2>
        <AssignedUsersSection distributorId={distributorId} />
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_authed/distributors/$id/edit")({
  component: EditDistributorPage,
});
