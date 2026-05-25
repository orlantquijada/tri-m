import { Badge } from "@/components/ui/badge";

export const LOW_STOCK_THRESHOLD = 5;

export function StockBadge({ qty }: { qty: number }) {
  const variant =
    qty <= 0
      ? "destructive"
      : (qty <= LOW_STOCK_THRESHOLD
        ? "outline"
        : "secondary");
  return <Badge variant={variant}>Qty: {qty}</Badge>;
}

export function StockCell({ qty }: { qty: number | undefined }) {
  if (qty === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <StockBadge qty={qty} />;
}
