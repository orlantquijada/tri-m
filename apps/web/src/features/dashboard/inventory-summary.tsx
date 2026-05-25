import { Link } from "@tanstack/react-router";
import { AlertOctagonIcon, BoxIcon, PackageMinusIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MOVEMENT_TYPE_LABEL,
  QtyCell,
} from "@/features/products/movement-display";
import {
  productQueries,
  useRecentMovements,
  useStockLevels,
} from "@/features/products/queries";
import { LOW_STOCK_THRESHOLD } from "@/features/products/stock-badge";
import { formatDateTime } from "@/lib/format";

export function InventorySummary() {
  const { data: products } = productQueries.useList();
  const { data: levels } = useStockLevels();
  const { data: recent } = useRecentMovements(5);

  const activeProducts = (products ?? []).filter((p) => p.status === "active");
  const activeIds = new Set(activeProducts.map((p) => p.id));

  let lowCount = 0;
  let outCount = 0;
  for (const lv of levels ?? []) {
    if (!activeIds.has(lv.productId)) {
      continue;
    }
    if (lv.currentQty <= 0) {
      outCount += 1;
    } else if (lv.currentQty <= LOW_STOCK_THRESHOLD) {
      lowCount += 1;
    }
  }

  const kpis = [
    {
      icon: <BoxIcon className="size-4" />,
      label: "Active products",
      subCaption: "In your catalog",
      value: activeProducts.length,
    },
    {
      icon: <PackageMinusIcon className="size-4" />,
      label: "Low stock",
      subCaption: `≤ ${LOW_STOCK_THRESHOLD} units on hand`,
      value: lowCount,
    },
    {
      icon: <AlertOctagonIcon className="size-4" />,
      label: "Out of stock",
      subCaption: "0 or negative balance",
      value: outCount,
    },
  ];

  const noProducts = products !== undefined && products.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Inventory
        </h2>
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          to="/products"
        >
          Open inventory →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-3">
        {kpis.map(({ icon, label, subCaption, value }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {icon}
                {label}
              </div>
              <div className="text-muted-foreground">{subCaption}</div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {noProducts ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              No products yet. Add your first product to start tracking stock.
            </p>
            <Link className={buttonVariants()} to="/products/new">
              Add product
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent movements</CardTitle>
            <CardDescription>Latest 5 stock changes</CardDescription>
          </CardHeader>
          <CardContent>
            {recent === undefined ? (
              <p className="py-4 text-sm text-muted-foreground">Loading...</p>
            ) : (recent.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No movements recorded yet.
              </p>
            ) : (
              <ul className="max-h-72 divide-y overflow-y-auto text-sm">
                {recent.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        params={{ id: m.productId }}
                        to="/products/$id"
                      >
                        {m.productName ?? "—"}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {[
                          MOVEMENT_TYPE_LABEL[m.type],
                          m.recordedByName,
                          formatDateTime(m.createdAt),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <QtyCell qty={m.qty} />
                  </li>
                ))}
              </ul>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
