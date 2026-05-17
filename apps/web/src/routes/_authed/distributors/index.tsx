import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { DistributorList } from "@/features/distributors/distributor-list";

function DistributorsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Distributors</h1>
        <Link to="/distributors/new" className={buttonVariants()}>
          New Distributor
        </Link>
      </div>
      <DistributorList />
    </div>
  );
}

export const Route = createFileRoute("/_authed/distributors/")({
  component: DistributorsPage,
});
