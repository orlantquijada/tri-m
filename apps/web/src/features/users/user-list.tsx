import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useUsersQuery } from "./queries";
import { ResetPasswordDialog } from "./reset-password-dialog";

export function UserList() {
  const { data, error, isLoading } = useUsersQuery();

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="p-4 text-destructive">Failed to load users.</p>;
  }
  if (!data?.length) {
    return <p className="p-4 text-muted-foreground">No users found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Distributor</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">{u.name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>
              <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                {u.role}
              </Badge>
            </TableCell>
            <TableCell>
              {u.distributorId ? (
                <Link
                  to="/distributors/$id/edit"
                  params={{ id: String(u.distributorId) }}
                  className="underline underline-offset-2 hover:text-primary"
                >
                  {u.distributorName ?? `Distributor #${u.distributorId}`}
                </Link>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              {u.role === "distributor" && (
                <ResetPasswordDialog
                  targetUserId={u.id}
                  targetUserName={u.name}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
