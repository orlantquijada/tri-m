import { Link } from "@tanstack/react-router";
import {
  BanknoteIcon,
  ClipboardCheckIcon,
  MapPinIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  PhoneIcon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentForm } from "@/features/payments/payment-form";
import { RecordVisitDialog } from "@/features/visits/record-visit-dialog";
import { features } from "@/lib/features";

type QuickActionsBarProps = {
  customerId: string;
  phone: string | null;
  latitude?: number | null;
  longitude?: number | null;
  receivableId?: string;
  currentBalanceCents?: number;
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
}: QuickActionsBarProps) {
  const balance = currentBalanceCents ?? 0;
  const hasCoords = latitude != null && longitude != null;
  const [visitOpen, setVisitOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);

  if (!features.quickActions) {
    return null;
  }

  return (
    <div onClick={stopRowNavigation}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button aria-label="Customer actions" size="icon" variant="outline">
              <MoreVerticalIcon className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          {phone ? (
            <DropdownMenuItem render={<a href={`tel:${phone}`} />}>
              <PhoneIcon className="size-4" />
              Call customer
            </DropdownMenuItem>
          ) : null}
          {phone ? (
            <DropdownMenuItem render={<a href={`sms:${phone}`} />}>
              <MessageSquareIcon className="size-4" />
              SMS customer
            </DropdownMenuItem>
          ) : null}
          {hasCoords ? (
            <DropdownMenuItem
              render={<Link search={{ focus: customerId }} to="/map" />}
            >
              <MapPinIcon className="size-4" />
              View on map
            </DropdownMenuItem>
          ) : null}
          {features.visits && (
            <DropdownMenuItem onClick={() => setVisitOpen(true)}>
              <ClipboardCheckIcon className="size-4" />
              Record visit
            </DropdownMenuItem>
          )}
          {!!receivableId && (
            <DropdownMenuItem
              disabled={balance === 0}
              onClick={() => setPaymentOpen(true)}
            >
              <BanknoteIcon className="size-4" />
              Record payment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {features.visits && (
        <RecordVisitDialog
          customerId={customerId}
          onOpenChange={setVisitOpen}
          open={visitOpen}
          trigger={null}
        />
      )}
      {!!receivableId && (
        <PaymentForm
          currentBalanceCents={balance}
          customerId={customerId}
          onOpenChange={setPaymentOpen}
          open={paymentOpen}
          receivableId={receivableId}
          trigger={null}
        />
      )}
    </div>
  );
}
