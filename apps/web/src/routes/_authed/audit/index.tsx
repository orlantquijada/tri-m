import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuditLog } from "@/features/audit/audit-log";
import { features } from "@/lib/features";

function AuditPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only record of system events. Filter by entity or date range.
        </p>
      </div>
      <AuditLog />
    </div>
  );
}

export const Route = createFileRoute("/_authed/audit/")({
  beforeLoad: () => {
    if (!features.audit) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AuditPage,
});
