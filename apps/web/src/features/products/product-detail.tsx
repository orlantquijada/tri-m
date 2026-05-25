import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { StockMovementType } from "schema";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { formatPesoOrDash } from "@/lib/format";

import {
  productQueries,
  useArchiveProduct,
  useMovements,
  useProductStockLevels,
  useVoidMovement,
} from "./queries";
import type { StockMovementItem } from "./queries";
import { StockBadge } from "./stock-badge";
import { StockMovementForm } from "./stock-movement-form";

const TYPE_LABEL: Record<StockMovementType, string> = {
  adjustment: "Adjustment",
  receive: "Receive",
  sale: "Sale",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString();
}

function QtyCell({ qty }: { qty: number }) {
  if (qty > 0) {
    return (
      <span className="font-mono font-medium tabular-nums text-emerald-600">
        +{qty}
      </span>
    );
  }
  if (qty < 0) {
    return (
      <span className="font-mono font-medium tabular-nums text-destructive">
        {qty}
      </span>
    );
  }
  return <span className="font-mono tabular-nums">0</span>;
}

function TypeBadge({ type }: { type: StockMovementType }) {
  return <Badge variant="outline">{TYPE_LABEL[type]}</Badge>;
}

type VoidState = { id: string; reason: string } | null;

function ProductDetailContent({ productId }: { productId: string }) {
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";

  const product = productQueries.useDetail(productId);
  const stockLevels = useProductStockLevels(productId);
  const movements = useMovements(productId);
  const archive = useArchiveProduct();
  const voidMutation = useVoidMovement();
  const isMobile = useIsMobile();

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] =
    useState<StockMovementType>("receive");
  const [voidState, setVoidState] = useState<VoidState>(null);

  function openMovement(type: StockMovementType) {
    setMovementType(type);
    setMovementOpen(true);
  }

  if (product.isLoading) {
    return <p className="p-6 text-muted-foreground">Loading...</p>;
  }
  if (product.error || !product.data) {
    return <p className="p-6 text-destructive">Failed to load product.</p>;
  }

  const { data } = product;
  const isArchived = data.status === "archived";
  const currentQty = stockLevels.data?.[0]?.currentQty ?? 0;

  return (
    <main className="container mx-auto w-full max-w-3xl px-4 py-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">{data.sku}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isArchived}
            onClick={() => openMovement("receive")}
            type="button"
          >
            Receive stock
          </Button>
          <Button
            disabled={isArchived}
            onClick={() => openMovement("adjustment")}
            type="button"
            variant="outline"
          >
            Adjust stock
          </Button>
          <Link
            className={buttonVariants({ variant: "outline" })}
            params={{ id: data.id }}
            to="/products/$id_/edit"
          >
            Edit
          </Link>
          <Button
            disabled={isArchived || archive.isPending}
            onClick={() => setArchiveOpen(true)}
            type="button"
            variant="outline"
          >
            Archive
          </Button>
        </div>
      </div>

      <dl className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <Badge variant={isArchived ? "outline" : "secondary"}>
              {data.status}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Unit price</dt>
          <dd className="mt-1 tabular-nums">
            {formatPesoOrDash(data.unitPriceCents)}
          </dd>
        </div>
        {data.description && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">{data.description}</dd>
          </div>
        )}
      </dl>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Stock</h2>
        {isAdmin ? (
          <Card>
            <CardContent className="p-4">
              <dl className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">
                  Distributor stock
                </dt>
                <dd>
                  <StockBadge qty={currentQty} />
                </dd>
              </dl>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6">
              <span className="font-mono text-4xl font-bold tabular-nums">
                {currentQty}
              </span>
              <StockBadge qty={currentQty} />
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Movement history</h2>
        {movements.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : movements.error ? (
          <p className="text-sm text-destructive">Failed to load movements.</p>
        ) : !movements.data || movements.data.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No movements yet.
            </CardContent>
          </Card>
        ) : isMobile ? (
          <MovementCardList
            onVoid={(id) => setVoidState({ id, reason: "" })}
            rows={movements.data}
          />
        ) : (
          <MovementTable
            onVoid={(id) => setVoidState({ id, reason: "" })}
            rows={movements.data}
          />
        )}
      </section>

      <StockMovementForm
        defaultType={movementType}
        onOpenChange={setMovementOpen}
        open={movementOpen}
        productId={data.id}
      />

      <AlertDialog onOpenChange={setArchiveOpen} open={archiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive product?</AlertDialogTitle>
            <AlertDialogDescription>
              {data.name} ({data.sku}) will be hidden from the active list. You
              can still view its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archive.isPending}
              onClick={() => {
                archive.mutate(data.id, {
                  onSuccess: () => {
                    toast.success("Product archived");
                    setArchiveOpen(false);
                  },
                });
              }}
            >
              {archive.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setVoidState(null);
            voidMutation.reset();
          }
        }}
        open={voidState !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void movement?</AlertDialogTitle>
            <AlertDialogDescription>
              Voided movements stop counting toward stock. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              onChange={(e) =>
                setVoidState((prev) =>
                  prev ? { ...prev, reason: e.target.value } : prev
                )
              }
              placeholder="Why is this movement being voided?"
              rows={2}
              value={voidState?.reason ?? ""}
            />
          </div>
          {voidMutation.error && (
            <p className="text-sm text-destructive">
              {voidMutation.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !voidState ||
                voidState.reason.trim().length === 0 ||
                voidMutation.isPending
              }
              onClick={() => {
                if (!voidState || voidState.reason.trim().length === 0) {
                  return;
                }
                voidMutation.mutate(
                  { id: voidState.id, reason: voidState.reason.trim() },
                  {
                    onSuccess: () => {
                      toast.success("Movement voided");
                      setVoidState(null);
                    },
                  }
                );
              }}
            >
              {voidMutation.isPending ? "Voiding..." : "Void movement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function MovementTable({
  rows,
  onVoid,
}: {
  rows: StockMovementItem[];
  onVoid: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow
              className={m.voidedAt ? "text-muted-foreground" : ""}
              key={m.id}
            >
              <TableCell className="tabular-nums">
                {formatDateTime(m.createdAt)}
              </TableCell>
              <TableCell>
                <TypeBadge type={m.type} />
              </TableCell>
              <TableCell className="text-right">
                <QtyCell qty={m.qty} />
              </TableCell>
              <TableCell>{m.recordedByName ?? "—"}</TableCell>
              <TableCell className="max-w-[260px]">
                {m.voidedAt ? (
                  <span className="text-xs">
                    <Badge className="mr-1" variant="destructive">
                      VOID
                    </Badge>
                    {m.voidReason}
                  </span>
                ) : (
                  (m.reasonNote ?? "—")
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  disabled={Boolean(m.voidedAt)}
                  onClick={() => onVoid(m.id)}
                  size="sm"
                  variant="outline"
                >
                  Void
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MovementCardList({
  rows,
  onVoid,
}: {
  rows: StockMovementItem[];
  onVoid: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((m) => (
        <Card key={m.id}>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <TypeBadge type={m.type} />
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
              <QtyCell qty={m.qty} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">By</dt>
                <dd>{m.recordedByName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reason</dt>
                <dd>{m.reasonNote ?? "—"}</dd>
              </div>
            </dl>
            {m.voidedAt && (
              <p className="text-xs">
                <Badge className="mr-1" variant="destructive">
                  VOID
                </Badge>
                {m.voidReason}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                disabled={Boolean(m.voidedAt)}
                onClick={() => onVoid(m.id)}
                size="sm"
                variant="outline"
              >
                Void
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProductDetail({ productId }: { productId: string }) {
  return <ProductDetailContent productId={productId} />;
}
