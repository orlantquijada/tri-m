import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ResponsiveColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  mobileLabel?: string;
  mobileHidden?: boolean;
  mobilePrimary?: boolean;
};

type Props<T> = {
  columns: ResponsiveColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
  mobileFooter?: (row: T) => ReactNode;
};

function mobileLabelFromHeader(header: ReactNode) {
  return typeof header === "string" ? header : "";
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No results.",
  rowClassName,
  mobileFooter,
}: Props<T>) {
  if (data.length === 0) {
    return <p className="p-4 text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={keyExtractor(row)} className={rowClassName?.(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {data.map((row) => {
          const primaryCols = columns.filter(
            (c) => c.mobilePrimary && !c.mobileHidden
          );
          const detailCols = columns.filter(
            (c) => !c.mobilePrimary && !c.mobileHidden
          );
          return (
            <Card
              key={keyExtractor(row)}
              size="sm"
              className={cn(rowClassName?.(row))}
            >
              <CardContent className="flex flex-col gap-2">
                {primaryCols.length > 0 && (
                  <div className="text-base font-semibold">
                    {primaryCols.map((col) => (
                      <div key={col.key}>{col.cell(row)}</div>
                    ))}
                  </div>
                )}
                <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1 text-sm">
                  {detailCols.map((col) => (
                    <div key={col.key} className="contents">
                      <dt className="text-muted-foreground">
                        {col.mobileLabel ?? mobileLabelFromHeader(col.header)}
                      </dt>
                      <dd className="min-w-0 text-right wrap-break-word">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {mobileFooter ? <div>{mobileFooter(row)}</div> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
