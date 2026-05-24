import { createFileRoute, useParams } from "@tanstack/react-router";

import { CustomerProfile } from "@/features/customers/customer-profile";
import { customerQueries } from "@/features/customers/queries";

function CustomerProfilePage() {
  const { id } = useParams({ from: "/_authed/customers/$id" });
  const customerId = id;
  const { data, error, isLoading } = customerQueries.useDetail(customerId);

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading...</p>;
  }
  if (error || !data) {
    return <p className="p-6 text-destructive">Failed to load customer.</p>;
  }

  return <CustomerProfile customer={data} />;
}

export const Route = createFileRoute("/_authed/customers/$id")({
  component: CustomerProfilePage,
});
