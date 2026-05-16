import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { CustomerSelect } from "schema";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { parsePeso } from "@/lib/format";

import { useCreateReceivableMutation } from "./queries";

type ReceivableFormProps = {
  customer: Pick<CustomerSelect, "fullName" | "id" | "riskStatus">;
};

function fieldError(errors: (string | undefined)[]) {
  const msg = errors.find(Boolean);
  if (!msg) {
    return null;
  }
  return <p className="text-sm text-destructive">{msg}</p>;
}

export function ReceivableForm({ customer }: ReceivableFormProps) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";

  const [adminOverride, setAdminOverride] = useState(false);
  const createMutation = useCreateReceivableMutation();

  const isBlocked =
    customer.riskStatus === "blacklisted" && !isAdmin && !adminOverride;

  const form = useForm({
    defaultValues: {
      downPayment: "0",
      firstDueDate: "",
      monthlyDueAmount: "",
      paymentTermMonths: "",
      productDescription: "",
      saleDate: "",
      totalAmount: "",
    },
    onSubmit: async ({ value }) => {
      const totalAmountCents = parsePeso(value.totalAmount);
      const downPaymentCents = parsePeso(value.downPayment);
      const monthlyDueAmountCents = value.monthlyDueAmount
        ? parsePeso(value.monthlyDueAmount)
        : undefined;
      const paymentTermMonths = value.paymentTermMonths
        ? Number.parseInt(value.paymentTermMonths, 10)
        : undefined;

      const result = await createMutation.mutateAsync({
        adminOverride: isAdmin ? adminOverride : undefined,
        customerId: customer.id,
        downPaymentCents,
        firstDueDate: value.firstDueDate,
        monthlyDueAmountCents,
        paymentTermMonths,
        productDescription: value.productDescription,
        saleDate: value.saleDate,
        totalAmountCents,
      });

      void navigate({
        params: { id: String(result.customerId) },
        to: "/customers/$id",
      });
    },
  });

  return (
    <div className="max-w-lg space-y-6">
      {customer.riskStatus === "watchlist" && (
        <Alert>
          <AlertTitle>Watchlist Customer</AlertTitle>
          <AlertDescription>
            {customer.fullName} is on the watchlist. Proceed with caution.
          </AlertDescription>
        </Alert>
      )}

      {customer.riskStatus === "blacklisted" && (
        <Alert variant="destructive">
          <AlertTitle>Blacklisted Customer</AlertTitle>
          <AlertDescription>
            {customer.fullName} is blacklisted.
            {isAdmin ? (
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  aria-label="Override — create anyway (admin)"
                  checked={adminOverride}
                  className="size-4"
                  type="checkbox"
                  onChange={(e) => setAdminOverride(e.target.checked)}
                />
                <span className="font-medium">
                  Override — create anyway (admin)
                </span>
              </label>
            ) : (
              <span className="mt-1 block font-semibold">
                You cannot create a receivable for this customer.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isBlocked ? null : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="productDescription"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0
                  ? "Product description is required"
                  : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="productDescription">Product Description</Label>
                <Input
                  id="productDescription"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {fieldError(field.state.meta.errors)}
              </div>
            )}
          </form.Field>

          <form.Field
            name="totalAmount"
            validators={{
              onChange: ({ value }) => {
                const n = Number.parseFloat(value);
                if (Number.isNaN(n) || n < 0) {
                  return "Enter a valid positive amount";
                }
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="totalAmount">Total Amount (₱)</Label>
                <Input
                  id="totalAmount"
                  min="0"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {fieldError(field.state.meta.errors)}
              </div>
            )}
          </form.Field>

          <form.Field
            name="downPayment"
            validators={{
              onChange: ({ value, fieldApi }) => {
                const n = Number.parseFloat(value);
                if (Number.isNaN(n) || n < 0) {
                  return "Enter a valid non-negative amount";
                }
                const total = Number.parseFloat(
                  fieldApi.form.getFieldValue("totalAmount")
                );
                if (!Number.isNaN(total) && n > total) {
                  return "Down payment cannot exceed total";
                }
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="downPayment">Down Payment (₱)</Label>
                <Input
                  id="downPayment"
                  min="0"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {fieldError(field.state.meta.errors)}
              </div>
            )}
          </form.Field>

          <form.Field
            name="saleDate"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : "Sale date is required",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="saleDate">Sale Date</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {fieldError(field.state.meta.errors)}
              </div>
            )}
          </form.Field>

          <form.Field
            name="firstDueDate"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : "First due date is required",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="firstDueDate">First Due Date</Label>
                <Input
                  id="firstDueDate"
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {fieldError(field.state.meta.errors)}
              </div>
            )}
          </form.Field>

          <form.Field name="paymentTermMonths">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="paymentTermMonths">
                  Payment Term (months, optional)
                </Label>
                <Input
                  id="paymentTermMonths"
                  min="1"
                  placeholder="e.g. 12"
                  type="number"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="monthlyDueAmount">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="monthlyDueAmount">
                  Monthly Due Amount (₱, optional)
                </Label>
                <Input
                  id="monthlyDueAmount"
                  min="0"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? "Saving..." : "Create Receivable"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void navigate({
                  params: { id: String(customer.id) },
                  to: "/customers/$id",
                })
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
