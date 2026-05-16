import type { ReceivableStatus } from "schema";

import { Badge } from "@/components/ui/badge";
import type { BadgeVariants } from "@/components/ui/badge";

export const receivableStatusVariant = {
  current: "outline",
  fully_paid: "secondary",
  overdue: "destructive",
} satisfies Record<ReceivableStatus, BadgeVariants["variant"]>;

export function ReceivableStatusBadge({
  status,
}: {
  status: ReceivableStatus;
}) {
  return (
    <Badge variant={receivableStatusVariant[status]}>
      {status.replace("_", " ")}
    </Badge>
  );
}
