import { createFileRoute, useParams } from "@tanstack/react-router";

import { CustomerForm } from "@/features/customers/customer-form";
import { useCustomerQuery } from "@/features/customers/queries";

const EditCustomerPage = () => {
  const { id } = useParams({ from: "/_authed/customers/$id/edit" });
  const customerId = Number.parseInt(id, 10);
  const { data, error, isLoading } = useCustomerQuery(customerId);

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading...</p>;
  }
  if (error || !data) {
    return <p className="p-6 text-destructive">Failed to load customer.</p>;
  }

  const defaultValues = {
    address: data.address,
    fullName: data.fullName,
    latitude: data.latitude === null ? "" : String(data.latitude),
    longitude: data.longitude === null ? "" : String(data.longitude),
    notes: data.notes ?? "",
    phone: data.phone,
    riskStatus: data.riskStatus,
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">Edit Customer</h1>
      <CustomerForm customerId={customerId} defaultValues={defaultValues} />
    </div>
  );
};

export const Route = createFileRoute("/_authed/customers/$id/edit")({
  component: EditCustomerPage,
});
