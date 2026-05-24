import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import type { DistributorStatus } from "schema";
import { z } from "zod";

import { PhPhoneInput } from "@/components/ph-phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidPhMobile, normalizePhMobile } from "@/lib/phone";

import { distributorQueries } from "./queries";

type FormValues = {
  assignedArea: string;
  name: string;
  phone: string;
  status: DistributorStatus;
};

type DistributorFormProps = {
  defaultValues?: Partial<FormValues>;
  distributorId?: string;
};

function fieldError(errors: string[]) {
  if (!errors.length) {
    return null;
  }
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function DistributorForm({
  defaultValues,
  distributorId,
}: DistributorFormProps) {
  const navigate = useNavigate();
  const isEditing = distributorId !== undefined;

  const createMutation = distributorQueries.useCreate();
  const updateMutation = distributorQueries.useUpdate();

  const form = useForm({
    defaultValues: {
      assignedArea: defaultValues?.assignedArea ?? "",
      name: defaultValues?.name ?? "",
      phone: defaultValues?.phone ?? "",
      status: defaultValues?.status ?? "active",
    } satisfies FormValues,
    onSubmit: async ({ value }) => {
      const payload = {
        assignedArea: value.assignedArea || null,
        name: value.name,
        phone: normalizePhMobile(value.phone) ?? value.phone,
        status: value.status,
      };
      await (isEditing
        ? updateMutation.mutateAsync({ data: payload, id: distributorId })
        : createMutation.mutateAsync(payload));
      void navigate({ to: "/distributors" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;
  const idleLabel = isEditing ? "Save Changes" : "Create Distributor";

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {fieldError(field.state.meta.errors.filter(Boolean) as string[])}
          </div>
        )}
      </form.Field>

      <form.Field
        name="phone"
        validators={{
          onChange: ({ value }) => {
            if (!value) {
              return "Phone is required";
            }
            if (!isValidPhMobile(value)) {
              return "Enter a valid PH mobile number (e.g. 0917 123 4567)";
            }
          },
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <PhPhoneInput
              id="phone"
              value={field.state.value}
              onChange={(v) => field.handleChange(v)}
              onBlur={field.handleBlur}
            />
            {fieldError(field.state.meta.errors.filter(Boolean) as string[])}
          </div>
        )}
      </form.Field>

      <form.Field name="assignedArea">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="assignedArea">Assigned Area</Label>
            <Input
              id="assignedArea"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="status">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select
              value={field.state.value}
              onValueChange={(value) =>
                field.handleChange(value as DistributorStatus)
              }
            >
              <SelectTrigger
                id="status"
                className="w-full"
                onBlur={field.handleBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      {mutationError && (
        <p className="text-sm text-destructive">{mutationError.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : idleLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate({ to: "/distributors" })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
