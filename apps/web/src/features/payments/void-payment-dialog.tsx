import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useVoidPayment } from "./queries";

type VoidPaymentDialogProps = {
  paymentId: string;
  receivableId: string;
  customerId: string;
};

export function VoidPaymentDialog({
  paymentId,
  receivableId,
  customerId,
}: VoidPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const voidMutation = useVoidPayment();

  async function handleConfirm() {
    if (!reason.trim()) {
      return;
    }
    await voidMutation.mutateAsync({
      customerId,
      paymentId,
      reason,
      receivableId,
    });
    toast.success("Payment voided");
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Void
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Voiding this payment will reverse the balance change and recalculate
          the payment schedule.
        </p>
        <div className="space-y-1">
          <Label htmlFor="void-reason">Reason (required)</Label>
          <Textarea
            id="void-reason"
            placeholder="Enter reason for voiding this payment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {voidMutation.error && (
          <p className="text-sm text-destructive">
            {voidMutation.error.message}
          </p>
        )}
        <DialogFooter showCloseButton>
          <Button
            disabled={!reason.trim() || voidMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            {voidMutation.isPending ? "Voiding..." : "Void Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
