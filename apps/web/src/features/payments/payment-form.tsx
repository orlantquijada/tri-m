import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { useState } from "react";
import type { PaymentMethod } from "schema";
import { toast } from "sonner";

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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatPeso, parsePeso } from "@/lib/format";

import { paymentQueries } from "./queries";

const paymentMethodOptions: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  gcash: "GCash",
  other: "Other",
};

type PaymentFormProps = {
  currentBalanceCents: number;
  receivableId: number;
  customerId: number;
};

function fieldError(errors: (string | undefined)[]) {
  const msg = errors.find(Boolean);
  if (!msg) {
    return null;
  }
  return <p className="text-sm text-destructive">{msg}</p>;
}

export function PaymentForm({
  currentBalanceCents,
  receivableId,
  customerId,
}: PaymentFormProps) {
  const [open, setOpen] = useState(false);
  const createMutation = paymentQueries.useCreate();
  const maxPeso = (currentBalanceCents / 100).toFixed(2);
  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm({
    defaultValues: {
      amount: maxPeso,
      notes: "",
      paymentDate: today,
      paymentMethod: "cash" as PaymentMethod,
      referenceNumber: "",
    },
    onSubmit: async ({ value }) => {
      const amountCents = parsePeso(value.amount);
      await createMutation.mutateAsync({
        amountCents,
        customerId,
        notes: value.notes || undefined,
        paymentDate: value.paymentDate,
        paymentMethod: value.paymentMethod,
        receivableId,
        referenceNumber: value.referenceNumber || undefined,
      });
      toast.success("Payment recorded");
      setOpen(false);
      form.reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={currentBalanceCents === 0}>Record Payment</Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Current balance:{" "}
          <span className="font-mono font-medium">
            {formatPeso(currentBalanceCents)}
          </span>
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="amount"
            validators={{
              onChange: ({ value }) => {
                const n = Number.parseFloat(value);
                if (Number.isNaN(n) || n <= 0) {
                  return "Amount must be greater than 0";
                }
                if (parsePeso(value) > currentBalanceCents) {
                  return `Cannot exceed current balance of ${formatPeso(currentBalanceCents)}`;
                }
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="amount">Amount (₱)</Label>
                <Input
                  id="amount"
                  max={maxPeso}
                  min="0.01"
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
            name="paymentMethod"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : "Payment method is required",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <NativeSelect
                  id="paymentMethod"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) =>
                    field.handleChange(e.target.value as PaymentMethod)
                  }
                >
                  {Object.entries(paymentMethodOptions).map(
                    ([value, label]) => (
                      <NativeSelectOption value={value} key={value}>
                        {label}
                      </NativeSelectOption>
                    )
                  )}
                </NativeSelect>
                {fieldError(field.state.meta.errors)}
              </div>
            )}
          </form.Field>

          <form.Field
            name="paymentDate"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : "Payment date is required",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {fieldError(field.state.meta.errors)}
              </div>
            )}
          </form.Field>

          <form.Field name="referenceNumber">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="referenceNumber">
                  Reference Number (optional)
                </Label>
                <Input
                  id="referenceNumber"
                  placeholder="e.g. receipt #"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
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

          <DialogFooter showCloseButton>
            <Button disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
