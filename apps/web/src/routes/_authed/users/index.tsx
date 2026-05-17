import { createFileRoute } from "@tanstack/react-router";

import { UserList } from "@/features/users/user-list";

function UsersPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          All users across the system. Reset distributor passwords or jump to a
          user&apos;s distributor.
        </p>
      </div>
      <UserList />
    </div>
  );
}

export const Route = createFileRoute("/_authed/users/")({
  component: UsersPage,
});
