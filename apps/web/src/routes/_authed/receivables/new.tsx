import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { customerQueries } from "@/features/customers/queries";
import { ReceivableForm } from "@/features/receivables/receivable-form";

const searchSchema = z.object({
  customerId: z.string().optional(),
});

function NewReceivableContent({ customerId }: { customerId: string }) {
  const { data, error, isLoading } = customerQueries.useDetail(customerId);

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading customer…</p>;
  }
  if (error || !data) {
    return <p className="p-6 text-destructive">Failed to load customer.</p>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">New Receivable</h1>
      <p className="mb-6 text-muted-foreground">
        Customer:{" "}
        <span className="font-medium text-foreground">{data.fullName}</span>
      </p>
      <ReceivableForm
        customer={{
          fullName: data.fullName,
          id: data.id,
          riskStatus: data.riskStatus,
        }}
      />
    </div>
  );
}

function NewReceivablePage() {
  const { customerId } = useSearch({ from: "/_authed/receivables/new" });

  if (!customerId) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Missing customerId search param.</p>
      </div>
    );
  }

  return <NewReceivableContent customerId={customerId} />;
}

export const Route = createFileRoute("/_authed/receivables/new")({
  component: NewReceivablePage,
  validateSearch: searchSchema,
});
