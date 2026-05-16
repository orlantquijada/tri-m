import type { RiskStatus } from "schema";

import { Badge } from "@/components/ui/badge";
import type { BadgeVariants } from "@/components/ui/badge";

export const riskVariant: Record<
  RiskStatus,
  NonNullable<BadgeVariants["variant"]>
> = {
  blacklisted: "destructive",
  good: "outline",
  watchlist: "secondary",
};

const riskWarning: Partial<Record<RiskStatus, string>> = {
  blacklisted: "This customer is blacklisted. New receivables are blocked.",
  watchlist: "This customer is on the watchlist. Proceed with caution.",
};

export function RiskBadge({ riskStatus }: { riskStatus: RiskStatus }) {
  const warning = riskWarning[riskStatus];
  return (
    <div className="flex flex-col gap-1">
      <Badge variant={riskVariant[riskStatus]}>{riskStatus}</Badge>
      {warning && (
        <p
          className={`text-xs font-medium ${riskStatus === "blacklisted" ? "text-destructive" : "text-yellow-600"}`}
        >
          {warning}
        </p>
      )}
    </div>
  );
}
