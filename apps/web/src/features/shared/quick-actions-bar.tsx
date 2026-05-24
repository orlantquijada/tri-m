import { Link } from "@tanstack/react-router";
import {
  BanknoteIcon,
  ClipboardCheckIcon,
  MapPinIcon,
  MessageSquareIcon,
  PhoneIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { PaymentForm } from "@/features/payments/payment-form";
import { RecordVisitDialog } from "@/features/visits/record-visit-dialog";
import { cn } from "@/lib/utils";

type QuickActionsBarProps = {
  customerId: number;
  phone: string | null;
  latitude?: number | null;
  longitude?: number | null;
  receivableId?: number;
  currentBalanceCents?: number;
  layout?: "row" | "wrap";
};

function stopRowNavigation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function QuickActionsBar({
  customerId,
  phone,
  latitude,
  longitude,
  receivableId,
  currentBalanceCents,
  layout = "wrap",
}: QuickActionsBarProps) {
  const balance = currentBalanceCents ?? 0;
  const hasCoords = latitude != null && longitude != null;

  const containerCls =
    layout === "row"
      ? "flex flex-row flex-nowrap items-center gap-2 overflow-x-auto"
      : "flex flex-wrap items-center justify-end gap-2";

  const iconBtnCls = cn(
    buttonVariants({ size: "icon", variant: "outline" }),
    "min-h-11 min-w-11 shrink-0"
  );

  return (
    <div className={containerCls} onClick={stopRowNavigation}>
      {phone ? (
        <a
          aria-label="Call customer"
          className={iconBtnCls}
          href={`tel:${phone}`}
        >
          <PhoneIcon className="size-4" />
        </a>
      ) : null}
      {phone ? (
        <a
          aria-label="SMS customer"
          className={iconBtnCls}
          href={`sms:${phone}`}
        >
          <MessageSquareIcon className="size-4" />
        </a>
      ) : null}
      {hasCoords ? (
        <Link
          aria-label="View on map"
          className={iconBtnCls}
          search={{ focus: customerId }}
          to="/map"
        >
          <MapPinIcon className="size-4" />
        </Link>
      ) : null}
      <RecordVisitDialog
        customerId={customerId}
        trigger={
          <Button
            aria-label="Record visit"
            className="min-h-11 min-w-11 shrink-0"
            size="icon"
            variant="outline"
          >
            <ClipboardCheckIcon className="size-4" />
          </Button>
        }
      />
      {receivableId !== undefined ? (
        <PaymentForm
          currentBalanceCents={balance}
          customerId={customerId}
          receivableId={receivableId}
          trigger={
            <Button
              aria-label="Record payment"
              className="min-h-11 min-w-11 shrink-0"
              disabled={balance === 0}
              size="icon"
              variant="outline"
            >
              <BanknoteIcon className="size-4" />
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
