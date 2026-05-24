import { Link } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  PaginationState,
  SortingState,
  Table as TanstackTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ColumnsIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import type { ProductStatus } from "schema";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPesoOrDash } from "@/lib/format";

import { productQueries, useArchiveProduct } from "./queries";
import type { ProductListItem } from "./queries";

const TAB_LABELS: Record<ProductStatus, string> = {
  active: "Active",
  archived: "Archived",
};

const EMPTY_ROWS: ProductListItem[] = [];

function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge variant={status === "archived" ? "outline" : "secondary"}>
      {status}
    </Badge>
  );
}

function RowActions({ product }: { product: ProductListItem }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const archive = useArchiveProduct();
  const isArchived = product.status === "archived";

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button aria-label="Product actions" size="icon" variant="outline">
              <MoreVerticalIcon className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            render={
              <Link params={{ id: product.id }} to="/products/$id_/edit" />
            }
          >
            <PencilIcon className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isArchived}
            onClick={() => setConfirmOpen(true)}
          >
            <ArchiveIcon className="size-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive product?</AlertDialogTitle>
            <AlertDialogDescription>
              {product.name} ({product.sku}) will be hidden from the active
              list. You can still view its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archive.isPending}
              onClick={() => {
                archive.mutate(product.id, {
                  onSuccess: () => setConfirmOpen(false),
                });
              }}
            >
              {archive.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const columns: ColumnDef<ProductListItem>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <Link
        className="font-medium underline-offset-4 hover:underline"
        params={{ id: row.original.id }}
        to="/products/$id"
      >
        {row.original.name}
      </Link>
    ),
    header: "Name",
  },
  {
    accessorKey: "sku",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.sku}</span>
    ),
    header: "SKU",
  },
  {
    accessorKey: "unitPriceCents",
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatPesoOrDash(row.original.unitPriceCents)}
      </span>
    ),
    header: () => <div className="text-right">Unit price</div>,
  },
  {
    cell: () => <span className="text-muted-foreground">—</span>,
    header: "Stock",
    id: "stock",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    header: "Status",
  },
  {
    cell: ({ row }) => (
      <div className="flex justify-end">
        <RowActions product={row.original} />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    header: "",
    id: "actions",
  },
];

export function ProductsDataTable() {
  const { data, error, isLoading } = productQueries.useList();
  const isMobile = useIsMobile();

  const [tab, setTab] = React.useState<ProductStatus>("active");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [search, setSearch] = React.useState("");

  const allRows = data ?? EMPTY_ROWS;
  const deferredSearch = React.useDeferredValue(search);

  const { tabCounts, filtered } = React.useMemo(() => {
    const counts: Record<ProductStatus, number> = { active: 0, archived: 0 };
    const q = deferredSearch.trim().toLowerCase();
    const rows: ProductListItem[] = [];
    for (const r of allRows) {
      counts[r.status] += 1;
      if (
        r.status === tab &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q))
      ) {
        rows.push(r);
      }
    }
    return { filtered: rows, tabCounts: counts };
  }, [allRows, deferredSearch, tab]);

  const table = useReactTable({
    columns,
    data: filtered,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: { columnVisibility, pagination, sorting },
  });

  React.useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [deferredSearch, tab]);

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="p-4 text-destructive">Failed to load products.</p>;
  }

  return (
    <Tabs
      className="w-full min-w-0 flex-col gap-4"
      onValueChange={(v) => setTab(v as ProductStatus)}
      value={tab}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="w-fit max-w-full overflow-x-auto">
          {(Object.keys(TAB_LABELS) as ProductStatus[]).map((key) => (
            <TabsTrigger className="flex-none gap-2" key={key} value={key}>
              {TAB_LABELS[key]}
              <Badge className="px-1.5" variant="secondary">
                {tabCounts[key]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search products"
              className="pl-8"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or SKU"
              value={search}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="outline">
                  <ColumnsIcon />
                  <span className="hidden lg:inline">Columns</span>
                  <MoreHorizontalIcon className="lg:hidden" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    checked={c.getIsVisible()}
                    className="capitalize"
                    key={c.id}
                    onCheckedChange={(v) => c.toggleVisibility(Boolean(v))}
                  >
                    {c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TabsContent className="mt-0" value={tab}>
        {(() => {
          const { rows } = table.getRowModel();
          if (isMobile) {
            return <MobileCardList rows={rows.map((r) => r.original)} />;
          }
          return (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id}>
                          {h.isPlaceholder
                            ? null
                            : flexRender(
                                h.column.columnDef.header,
                                h.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="h-24 text-center text-muted-foreground"
                        colSpan={columns.length}
                      >
                        No products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          );
        })()}

        <TablePagination table={table} />
      </TabsContent>
    </Tabs>
  );
}

function MobileCardList({ rows }: { rows: ProductListItem[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No products found.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((p) => (
        <Card key={p.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                className="font-medium underline-offset-4 hover:underline"
                params={{ id: p.id }}
                to="/products/$id"
              >
                {p.name}
              </Link>
              <StatusBadge status={p.status} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">SKU</dt>
                <dd className="font-mono text-xs">{p.sku}</dd>
              </div>
              <div className="text-right">
                <dt className="text-muted-foreground">Unit price</dt>
                <dd className="tabular-nums">
                  {formatPesoOrDash(p.unitPriceCents)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stock</dt>
                <dd>—</dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <RowActions product={p} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TablePagination<T>({ table }: { table: TanstackTable<T> }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const totalCount = table.getFilteredRowModel().rows.length;
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className="mt-3 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
      <div className="text-muted-foreground">
        {totalCount} {totalCount === 1 ? "product" : "products"}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden lg:inline">Rows per page</span>
          <Select
            onValueChange={(v) => table.setPageSize(Number(v))}
            value={String(pageSize)}
          >
            <SelectTrigger className="w-[80px]" size="sm">
              <SelectValue>
                {(v) => (typeof v === "string" ? v : String(pageSize))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground">
          Page {pageIndex + 1} of {Math.max(1, pageCount)}
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="First page"
            disabled={!canPrev}
            onClick={() => table.setPageIndex(0)}
            size="icon"
            variant="outline"
          >
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => table.previousPage()}
            size="icon"
            variant="outline"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => table.nextPage()}
            size="icon"
            variant="outline"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            aria-label="Last page"
            disabled={!canNext}
            onClick={() => table.setPageIndex(pageCount - 1)}
            size="icon"
            variant="outline"
          >
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
