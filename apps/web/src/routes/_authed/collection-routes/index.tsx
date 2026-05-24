import { createFileRoute, redirect } from "@tanstack/react-router";

import { CollectionRouteView } from "@/features/collection-routes/collection-route-view";
import { features } from "@/lib/features";

function CollectionRoutesPage() {
  return (
    <main className="container mx-auto flex h-[calc(100svh-3.5rem)] flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">Collection Route</h1>
        <p className="text-sm text-muted-foreground">
          Build an ad-hoc stop list from overdue customers. Route is not saved —
          it clears when you leave the page.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <CollectionRouteView />
      </div>
    </main>
  );
}

export const Route = createFileRoute("/_authed/collection-routes/")({
  beforeLoad: () => {
    if (!features.collectionRoutes) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: CollectionRoutesPage,
});
