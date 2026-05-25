import type { StockMovementType } from "schema";

import { Badge } from "@/components/ui/badge";

export const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  adjustment: "Adjustment",
  receive: "Receive",
  sale: "Sale",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

export function QtyCell({ qty }: { qty: number }) {
  if (qty > 0) {
    return (
      <span className="font-mono font-medium text-emerald-600 tabular-nums">
        +{qty}
      </span>
    );
  }
  if (qty < 0) {
    return (
      <span className="font-mono font-medium text-destructive tabular-nums">
        {qty}
      </span>
    );
  }
  return <span className="font-mono tabular-nums">0</span>;
}

export function MovementTypeBadge({ type }: { type: StockMovementType }) {
  return <Badge variant="outline">{MOVEMENT_TYPE_LABEL[type]}</Badge>;
}
