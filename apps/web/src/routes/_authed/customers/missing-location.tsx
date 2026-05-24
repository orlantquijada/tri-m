import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";

import { buttonVariants } from "@/components/ui/button";
import { useMissingLocationCustomersQuery } from "@/features/customers/queries";
import type { CustomerListItem } from "@/features/customers/queries";
import { distributorQueries } from "@/features/distributors/queries";
import { authClient } from "@/lib/auth-client";

function MissingLocationPage() {
  const customersQuery = useMissingLocationCustomersQuery();
  const distributorsQuery = distributorQueries.useList();

  const groups = useMemo(() => {
    const list = customersQuery.data ?? [];
    const byDistributor = new Map<string, CustomerListItem[]>();
    for (const c of list) {
      const arr = byDistributor.get(c.distributorId) ?? [];
      arr.push(c);
      byDistributor.set(c.distributorId, arr);
    }
    return [...byDistributor.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));
  }, [customersQuery.data]);

  const distributorName = (id: string) =>
    distributorsQuery.data?.find((d) => d.id === id)?.name ??
    `Distributor #${id}`;

  if (customersQuery.isLoading) {
    return <p className="p-6 text-muted-foreground">Loading...</p>;
  }
  if (customersQuery.error) {
    return (
      <p className="p-6 text-destructive">{customersQuery.error.message}</p>
    );
  }

  const total = customersQuery.data?.length ?? 0;

  return (
    <main className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Customers missing location</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "All customers have coordinates."
            : `${total} customer${total === 1 ? "" : "s"} without a map pin, grouped by distributor.`}
        </p>
      </div>

      {total === 0 ? (
        <p className="rounded-md border bg-muted/30 p-6 text-center text-muted-foreground">
          Nothing to fix — every customer has a pin.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map(([distributorId, customers]) => (
            <section key={distributorId} className="space-y-2">
              <h2 className="font-semibold text-lg">
                {distributorName(distributorId)}
                <span className="ml-2 text-sm text-muted-foreground">
                  ({customers.length})
                </span>
              </h2>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Phone</th>
                      <th className="px-3 py-2 font-medium">Address</th>
                      <th
                        aria-label="Actions"
                        className="px-3 py-2 font-medium"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-2 font-medium">
                          <Link
                            className="underline-offset-4 hover:underline"
                            params={{ id: c.id }}
                            to="/customers/$id"
                          >
                            {c.fullName}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{c.phone}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {c.address}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            className={buttonVariants({
                              size: "sm",
                              variant: "outline",
                            })}
                            params={{ id: c.id }}
                            to="/customers/$id/edit"
                          >
                            Edit on map
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

export const Route = createFileRoute("/_authed/customers/missing-location")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }
    const { data } = await authClient.getSession();
    const user = data?.user as { role?: string } | undefined;
    if (user?.role !== "admin") {
      throw redirect({ to: "/customers" });
    }
  },
  component: MissingLocationPage,
});
