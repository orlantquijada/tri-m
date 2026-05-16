import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function DashboardPage() {
  const navigate = useNavigate();

  async function signOut() {
    await authClient.signOut();
    void navigate({ to: "/login" });
  }

  return (
    <main className="container mx-auto p-6">
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
      <Button variant="outline" onClick={signOut}>
        Sign Out
      </Button>
    </main>
  );
}

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
});
