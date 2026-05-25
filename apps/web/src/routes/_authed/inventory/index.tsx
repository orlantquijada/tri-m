import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/inventory/")({
  beforeLoad: () => {
    throw redirect({ to: "/products" });
  },
});
