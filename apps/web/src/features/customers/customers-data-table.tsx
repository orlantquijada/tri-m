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
  SortingState,
  Table as TanstackTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ColumnsIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { customerQueries } from "@/features/customers/queries";
import type { CustomerListItem } from "@/features/customers/queries";
import { riskVariant } from "@/features/customers/risk-badge";
import { QuickActionsBar } from "@/features/shared/quick-actions-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPeso } from "@/lib/format";

type TabKey = "all" | "at-risk" | "outstanding" | "missing-location";

const TAB_LABELS: Record<TabKey, string> = {
  all: "All",
  "at-risk": "At Risk",
  "missing-location": "Missing Location",
  outstanding: "Has Outstanding",
};

function filterByTab(rows: CustomerListItem[], tab: TabKey) {
  switch (tab) {
    case "at-risk": {
      return rows.filter(
        (r) => r.riskStatus === "watchlist" || r.riskStatus === "blacklisted"
      );
    }
    case "missing-location": {
      return rows.filter((r) => r.latitude == null || r.longitude == null);
    }
    case "outstanding": {
      return rows.filter((r) => r.outstandingBalanceCents > 0);
    }
    default: {
      return rows;
    }
  }
}

const columns: ColumnDef<CustomerListItem>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
      />
    ),
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
      />
    ),
    id: "select",
  },
  {
    accessorKey: "fullName",
    cell: ({ row }) => (
      <Link
        className="font-medium underline-offset-4 hover:underline"
        params={{ id: row.original.id }}
        to="/customers/$id"
      >
        {row.original.fullName}
      </Link>
    ),
    header: "Name",
  },
  {
    accessorKey: "phone",
    cell: ({ row }) => row.original.phone ?? "—",
    header: "Phone",
  },
  {
    accessorKey: "address",
    cell: ({ row }) => (
      <span className="block max-w-[14rem] truncate">
        {row.original.address}
      </span>
    ),
    header: "Address",
  },
  {
    accessorKey: "riskStatus",
    cell: ({ row }) => (
      <Badge variant={riskVariant[row.original.riskStatus]}>
        {row.original.riskStatus}
      </Badge>
    ),
    header: "Risk",
  },
  {
    accessorKey: "outstandingBalanceCents",
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatPeso(row.original.outstandingBalanceCents)}
      </span>
    ),
    header: () => <div className="text-right">Outstanding</div>,
  },
  {
    cell: ({ row }) => (
      <div className="flex justify-end">
        <QuickActionsBar
          customerId={row.original.id}
          latitude={row.original.latitude}
          layout="wrap"
          longitude={row.original.longitude}
          phone={row.original.phone}
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    header: "",
    id: "actions",
  },
];

export function CustomersDataTable() {
  const { data, error, isLoading } = customerQueries.useList();
  const isMobile = useIsMobile();

  const [tab, setTab] = React.useState<TabKey>("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [search, setSearch] = React.useState("");

  const allRows = data ?? [];

  const tabCounts: Record<TabKey, number> = {
    all: allRows.length,
    "at-risk": 0,
    "missing-location": 0,
    outstanding: 0,
  };
  for (const r of allRows) {
    if (r.riskStatus === "watchlist" || r.riskStatus === "blacklisted") {
      tabCounts["at-risk"]++;
    }
    if (r.latitude == null || r.longitude == null) {
      tabCounts["missing-location"]++;
    }
    if (r.outstandingBalanceCents > 0) {
      tabCounts.outstanding++;
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = filterByTab(allRows, tab).filter(
    (r) =>
      !q ||
      r.fullName.toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q)
  );

  const table = useReactTable({
    columns,
    data: filtered,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: { columnVisibility, rowSelection, sorting },
  });

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="p-4 text-destructive">Failed to load customers.</p>;
  }

  return (
    <Tabs
      className="w-full flex-col gap-4"
      onValueChange={(v) => setTab(v as TabKey)}
      value={tab}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="@4xl/main:w-auto w-full overflow-x-auto">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
            <TabsTrigger className="gap-2" key={key} value={key}>
              {TAB_LABELS[key]}
              <Badge className="px-1.5" variant="secondary">
                {tabCounts[key]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search customers"
              className="pl-8"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone"
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
        {isMobile ? (
          <MobileCardList
            rows={table.getRowModel().rows.map((r) => r.original)}
          />
        ) : (
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
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center text-muted-foreground"
                      colSpan={columns.length}
                    >
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      key={row.id}
                    >
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
        )}

        <TablePagination table={table} />
      </TabsContent>
    </Tabs>
  );
}

function MobileCardList({ rows }: { rows: CustomerListItem[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No customers found.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                className="font-medium underline-offset-4 hover:underline"
                params={{ id: c.id }}
                to="/customers/$id"
              >
                {c.fullName}
              </Link>
              <Badge variant={riskVariant[c.riskStatus]}>{c.riskStatus}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{c.phone ?? "—"}</dd>
              </div>
              <div className="text-right">
                <dt className="text-muted-foreground">Outstanding</dt>
                <dd className="tabular-nums">
                  {formatPeso(c.outstandingBalanceCents)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Address</dt>
                <dd className="truncate">{c.address}</dd>
              </div>
            </dl>
            <QuickActionsBar
              customerId={c.id}
              latitude={c.latitude}
              layout="row"
              longitude={c.longitude}
              phone={c.phone}
            />
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
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className="mt-3 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
      <div className="text-muted-foreground">
        {selectedCount > 0
          ? `${selectedCount} of ${totalCount} selected`
          : `${totalCount} ${totalCount === 1 ? "customer" : "customers"}`}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden lg:inline">Rows per page</span>
          <Select
            onValueChange={(v) => table.setPageSize(Number(v))}
            value={String(pageSize)}
          >
            <SelectTrigger className="w-[80px]" size="sm">
              <SelectValue placeholder={String(pageSize)} />
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
