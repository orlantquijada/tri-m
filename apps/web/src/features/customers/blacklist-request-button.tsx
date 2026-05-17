import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { api, parseApiError } from "@/lib/api";

import { customerQueries } from "./queries";

type Props = {
  customerId: number;
  riskStatus: string;
};

export function BlacklistRequestButton({ customerId, riskStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.api["blacklist-requests"].$post({
        json: { customerId, reason },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to submit request"
        );
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customerQueries.keys.detail(customerId),
      });
      toast.success("Blacklist request submitted");
      setOpen(false);
      setReason("");
    },
  });

  if (riskStatus === "blacklisted") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Request Blacklist
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Customer Blacklist</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Submit a request to blacklist this customer. An admin will review and
          approve or reject.
        </p>
        <div className="space-y-1">
          <Label htmlFor="blacklist-reason">Reason (required)</Label>
          <Textarea
            id="blacklist-reason"
            placeholder="Explain why this customer should be blacklisted"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {mutation.error && (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        )}
        <DialogFooter showCloseButton>
          <Button
            disabled={!reason.trim() || mutation.isPending}
            onClick={() => void mutation.mutateAsync()}
          >
            {mutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
