import { useEffect, useState } from "react";
import type { StockMovementType } from "schema";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import { useRecordMovement } from "./queries";

const TYPE_OPTIONS: { label: string; value: StockMovementType }[] = [
  { label: "Receive", value: "receive" },
  { label: "Sale", value: "sale" },
  { label: "Adjustment", value: "adjustment" },
  { label: "Transfer in", value: "transfer_in" },
  { label: "Transfer out", value: "transfer_out" },
];

const TYPE_TITLES: Record<StockMovementType, string> = {
  adjustment: "Adjust stock",
  receive: "Receive stock",
  sale: "Record sale",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

type Props = {
  productId: string;
  defaultType?: StockMovementType;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function StockMovementForm({
  productId,
  defaultType = "receive",
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [type, setType] = useState<StockMovementType>(defaultType);
  const [qtyText, setQtyText] = useState("");
  const [adjustSign, setAdjustSign] = useState<"+" | "-">("+");
  const [reasonNote, setReasonNote] = useState("");

  const mutation = useRecordMovement();

  useEffect(() => {
    if (open) {
      setType(defaultType);
    }
  }, [open, defaultType]);

  function reset() {
    setType(defaultType);
    setQtyText("");
    setAdjustSign("+");
    setReasonNote("");
    mutation.reset();
  }

  const parsed = Number.parseInt(qtyText, 10);
  const qtyValid = Number.isInteger(parsed) && parsed > 0;
  const isAdjustment = type === "adjustment";
  const reasonRequired = isAdjustment;
  const reasonOk = !reasonRequired || reasonNote.trim().length > 0;
  const canSubmit = qtyValid && reasonOk && !mutation.isPending;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    const qty = isAdjustment && adjustSign === "-" ? -parsed : parsed;
    await mutation.mutateAsync({
      productId,
      qty,
      reasonNote: reasonNote.trim() ? reasonNote.trim() : undefined,
      type,
    });
    toast.success("Movement recorded");
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
      open={open}
    >
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TYPE_TITLES[type]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              onValueChange={(v) => setType(v as StockMovementType)}
              value={type}
            >
              {TYPE_OPTIONS.map((opt) => (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                  key={opt.value}
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1">
            <Label htmlFor="movement-qty">Quantity</Label>
            <div className="flex gap-2">
              {isAdjustment && (
                <div className="flex overflow-hidden rounded-md border">
                  <Button
                    aria-pressed={adjustSign === "+"}
                    className="rounded-none"
                    onClick={() => setAdjustSign("+")}
                    size="sm"
                    type="button"
                    variant={adjustSign === "+" ? "secondary" : "ghost"}
                  >
                    +
                  </Button>
                  <Button
                    aria-pressed={adjustSign === "-"}
                    className="rounded-none"
                    onClick={() => setAdjustSign("-")}
                    size="sm"
                    type="button"
                    variant={adjustSign === "-" ? "secondary" : "ghost"}
                  >
                    −
                  </Button>
                </div>
              )}
              <Input
                aria-invalid={qtyText.length > 0 && !qtyValid}
                className="flex-1"
                id="movement-qty"
                inputMode="numeric"
                min={1}
                onChange={(e) => setQtyText(e.target.value)}
                placeholder="0"
                type="number"
                value={qtyText}
              />
            </div>
            {qtyText.length > 0 && !qtyValid && (
              <p className="text-xs text-destructive">
                Enter a positive integer
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="movement-reason">
              {reasonRequired ? "Reason" : "Reason (optional)"}
            </Label>
            <Textarea
              aria-invalid={reasonRequired && !reasonOk}
              id="movement-reason"
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder={
                isAdjustment ? "Why is the count being adjusted?" : "Optional"
              }
              rows={2}
              value={reasonNote}
            />
          </div>

          {mutation.error && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}
        </div>
        <DialogFooter showCloseButton>
          <Button
            className="w-full sm:w-auto"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {mutation.isPending ? "Saving..." : "Record movement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
