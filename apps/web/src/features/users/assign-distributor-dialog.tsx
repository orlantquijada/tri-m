import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { distributorQueries } from "@/features/distributors/queries";

import { userQueries } from "./queries";
import type { DistributorUser } from "./queries";

type Props = {
  distributorId: number;
};

function fieldError(errors: (string | undefined)[]) {
  const msg = errors.find(Boolean);
  if (!msg) {
    return null;
  }
  return <p className="text-sm text-destructive">{msg}</p>;
}

function ReassignRow({
  u,
  distributors,
}: {
  u: DistributorUser;
  distributors: { id: number; name: string }[];
}) {
  const updateMutation = userQueries.useUpdate();
  const [selected, setSelected] = useState(String(u.distributorId ?? ""));

  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{u.name}</p>
        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
      </div>
      <select
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">— unassigned —</option>
        {distributors.map((d) => (
          <option key={d.id} value={String(d.id)}>
            {d.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={
          updateMutation.isPending ||
          selected === "" ||
          selected === String(u.distributorId ?? "")
        }
        onClick={() => {
          updateMutation.mutate(
            { data: { distributorId: Number(selected) }, id: u.id },
            { onSuccess: () => toast.success("User reassigned") }
          );
        }}
      >
        Save
      </Button>
    </li>
  );
}

function CreateUserForm({ distributorId }: { distributorId: number }) {
  const createMutation = userQueries.useCreate();

  const form = useForm({
    defaultValues: { email: "", name: "", password: "" },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({
        distributorId,
        email: value.email,
        name: value.name,
        password: value.password,
      });
      toast.success("Distributor user created");
      form.reset();
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <p className="text-sm font-medium">Create new user</p>

      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            z.string().min(1, "Name is required").safeParse(value).error
              ?.issues[0]?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {fieldError(field.state.meta.errors)}
          </div>
        )}
      </form.Field>

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            z.string().email("Valid email required").safeParse(value).error
              ?.issues[0]?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {fieldError(field.state.meta.errors)}
          </div>
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onChange: ({ value }) =>
            z
              .string()
              .min(8, "Password must be at least 8 characters")
              .safeParse(value).error?.issues[0]?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {fieldError(field.state.meta.errors)}
          </div>
        )}
      </form.Field>

      {createMutation.error && (
        <p className="text-sm text-destructive">
          {createMutation.error.message}
        </p>
      )}

      <Button type="submit" size="sm" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}

function UserList({
  users,
  distributors,
}: {
  users: DistributorUser[];
  distributors: { id: number; name: string }[];
}) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No distributor users yet.</p>
    );
  }
  return (
    <div>
      <p className="mb-1 text-sm font-medium">Existing users</p>
      <ul className="divide-y">
        {users.map((u) => (
          <ReassignRow key={u.id} u={u} distributors={distributors} />
        ))}
      </ul>
    </div>
  );
}

export function AssignDistributorDialog({ distributorId }: Props) {
  const [open, setOpen] = useState(false);
  const { data: existingUsers = [], isLoading: loadingUsers } =
    userQueries.useList();
  const { data: distributors = [] } = distributorQueries.useList();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Manage Users</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Distributor Users</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <UserList users={existingUsers} distributors={distributors} />
          )}

          <hr />

          <CreateUserForm distributorId={distributorId} />
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
