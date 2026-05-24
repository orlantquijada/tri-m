import { useState } from "react";
import type { VisitOutcome, VisitType } from "schema";
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
import { parsePeso } from "@/lib/format";

import { useRecordVisitMutation } from "./queries";

type RecordVisitDialogProps = {
  customerId: string;
  trigger?: React.ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const TYPE_OPTIONS: { label: string; value: VisitType }[] = [
  { label: "In person", value: "in_person" },
  { label: "Phone", value: "phone" },
  { label: "SMS", value: "sms" },
  { label: "Other", value: "other" },
];

const OUTCOME_OPTIONS: { label: string; value: VisitOutcome }[] = [
  { label: "Paid", value: "paid" },
  { label: "Promised", value: "promised" },
  { label: "No answer", value: "no_answer" },
  { label: "Refused", value: "refused" },
  { label: "Wrong contact", value: "wrong_contact" },
  { label: "Other", value: "other" },
];

export function RecordVisitDialog({
  customerId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: RecordVisitDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [type, setType] = useState<VisitType>("in_person");
  const [outcome, setOutcome] = useState<VisitOutcome>("no_answer");
  const [notes, setNotes] = useState("");
  const [promisedAmount, setPromisedAmount] = useState("");
  const [promisedDate, setPromisedDate] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const mutation = useRecordVisitMutation();

  function reset() {
    setType("in_person");
    setOutcome("no_answer");
    setNotes("");
    setPromisedAmount("");
    setPromisedDate("");
    setGps(null);
    setGpsError(null);
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const isPromised = outcome === "promised";
  const promisedAmountCents = isPromised ? parsePeso(promisedAmount) : 0;
  const canSubmit =
    !mutation.isPending &&
    (!isPromised || (promisedAmountCents > 0 && promisedDate.length > 0));

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    await mutation.mutateAsync({
      customerId,
      gpsLat: gps?.lat ?? null,
      gpsLng: gps?.lng ?? null,
      notes: notes.trim() ? notes.trim() : null,
      outcome,
      promisedAmountCents: isPromised ? promisedAmountCents : null,
      promisedDate: isPromised ? promisedDate : null,
      type,
    });
    toast.success("Visit recorded");
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      {trigger !== null && (
        <DialogTrigger render={trigger ?? <Button>Record visit</Button>} />
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record visit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              value={type}
              onValueChange={(v) => setType(v as VisitType)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Outcome</Label>
            <RadioGroup
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              value={outcome}
              onValueChange={(v) => setOutcome(v as VisitOutcome)}
            >
              {OUTCOME_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {isPromised && (
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="promised-amount">Promised amount (PHP)</Label>
                <Input
                  id="promised-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={promisedAmount}
                  onChange={(e) => setPromisedAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="promised-date">Promised date</Label>
                <Input
                  id="promised-date"
                  type="date"
                  value={promisedDate}
                  onChange={(e) => setPromisedDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="visit-notes">Notes</Label>
            <Textarea
              id="visit-notes"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Location</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={gpsLoading}
                onClick={captureLocation}
              >
                {gpsLoading ? "Locating..." : "Use my location"}
              </Button>
              {gps && (
                <span className="text-xs text-muted-foreground">
                  {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                </span>
              )}
              {gps && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setGps(null)}
                >
                  Clear
                </Button>
              )}
            </div>
            {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
          </div>

          {mutation.error && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}
        </div>
        <DialogFooter showCloseButton>
          <Button disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {mutation.isPending ? "Saving..." : "Save visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
