import { createFileRoute } from "@tanstack/react-router";

function DashboardPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
    </div>
  );
}

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
});
