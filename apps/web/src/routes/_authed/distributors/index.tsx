import { createFileRoute } from "@tanstack/react-router";

import { DistributorList } from "@/features/distributors/distributor-list";

function DistributorsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Distributors</h1>
      <DistributorList />
    </div>
  );
}

export const Route = createFileRoute("/_authed/distributors/")({
  component: DistributorsPage,
});
