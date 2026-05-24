import { Link } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  HandshakeIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuickActionsBar } from "@/features/shared/quick-actions-bar";
import { OpenPromisesCard } from "@/features/visits/open-promises-card";
import { formatPeso } from "@/lib/format";

import { useTodayQuery } from "./queries";
import type { TodayPayload } from "./queries";

function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return date.toLocaleDateString();
}

type Accent = "destructive" | "warning" | "default";

const ACCENT_CLASSES: Record<Accent, string> = {
  default: "text-muted-foreground",
  destructive: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
};

type MetricCardProps = {
  label: string;
  count: number;
  amountCents?: number;
  subtitle?: string;
  icon: ReactNode;
  accent?: Accent;
};

function MetricCard({
  label,
  count,
  amountCents,
  subtitle,
  icon,
  accent = "default",
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <span className={ACCENT_CLASSES[accent]}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        {amountCents !== undefined && (
          <p className="font-mono text-xs text-muted-foreground">
            {formatPeso(amountCents)}
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

type TodayListRowProps = {
  customerId: string;
  customerName: string;
  subtitle: ReactNode;
  action: ReactNode;
  actionClassName?: string;
};

function TodayListRow({
  customerId,
  customerName,
  subtitle,
  action,
  actionClassName = "shrink-0",
}: TodayListRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <Link
          className="font-medium underline-offset-4 hover:underline"
          params={{ id: customerId }}
          to="/customers/$id"
        >
          {customerName}
        </Link>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className={actionClassName}>{action}</div>
    </li>
  );
}

function OverdueSection({
  rows,
  total,
}: {
  rows: TodayPayload["topOverdue"];
  total: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground">No overdue accounts. Nice work.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <TodayListRow
          action={
            <QuickActionsBar
              currentBalanceCents={row.currentBalanceCents}
              customerId={row.customerId}
              latitude={row.latitude}
              longitude={row.longitude}
              phone={row.phone}
              receivableId={row.id}
            />
          }
          customerId={row.customerId}
          customerName={row.customerName}
          key={row.id}
          subtitle={
            <>
              <span className="font-mono">
                {formatPeso(row.currentBalanceCents)}
              </span>
              {" · "}
              {row.daysOverdue} {row.daysOverdue === 1 ? "day" : "days"} overdue
            </>
          }
        />
      ))}
      {total > rows.length && (
        <li>
          <Link
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            to="/overdue"
          >
            View all {total} overdue →
          </Link>
        </li>
      )}
    </ul>
  );
}

function DueTodaySection({ rows }: { rows: TodayPayload["dueToday"] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">Nothing falls due today.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const outstanding = row.dueAmountCents - row.paidAmountCents;
        return (
          <TodayListRow
            action={
              <QuickActionsBar
                currentBalanceCents={outstanding}
                customerId={row.customerId}
                latitude={row.latitude}
                longitude={row.longitude}
                phone={row.phone}
                receivableId={row.receivableId}
              />
            }
            customerId={row.customerId}
            customerName={row.customerName}
            key={row.id}
            subtitle={
              <>
                Installment #{row.installmentNo}
                {" · "}
                <span className="font-mono">{formatPeso(outstanding)}</span>
                {" due"}
              </>
            }
          />
        );
      })}
    </ul>
  );
}

function RecentVisitsSection({ rows }: { rows: TodayPayload["recentVisits"] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">No visits in the last 24h.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((visit) => (
        <TodayListRow
          action={
            <Badge className="shrink-0" variant="outline">
              {formatRelativeTime(visit.createdAt)}
            </Badge>
          }
          customerId={visit.customerId}
          customerName={visit.customerName}
          key={visit.id}
          subtitle={
            <span className="capitalize">
              {visit.type.replace("_", " ")} · {visit.outcome.replace("_", " ")}
            </span>
          }
        />
      ))}
    </ul>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function TodayView() {
  const { data, isLoading, error } = useTodayQuery();

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">
          Your collection focus for the day.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error.message}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              accent="destructive"
              amountCents={data.overdueAmountCents}
              count={data.overdueCount}
              icon={<AlertCircleIcon className="size-4" />}
              label="Overdue"
            />
            <MetricCard
              accent="warning"
              amountCents={data.dueTodayAmountCents}
              count={data.dueTodayCount}
              icon={<CalendarClockIcon className="size-4" />}
              label="Due today"
            />
            <MetricCard
              count={data.openPromisesCount}
              icon={<HandshakeIcon className="size-4" />}
              label="Open promises"
            />
            <MetricCard
              count={data.recentVisits.length}
              icon={<ClipboardListIcon className="size-4" />}
              label="Recent visits"
              subtitle="last 24h"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              description="Top overdue accounts to chase first."
              title="Overdue accounts"
            >
              <OverdueSection
                rows={data.topOverdue}
                total={data.overdueCount}
              />
            </SectionCard>

            <OpenPromisesCard />

            <SectionCard
              description="Installments scheduled for today."
              title="Due today"
            >
              <DueTodaySection rows={data.dueToday} />
            </SectionCard>

            <SectionCard
              description="Visits recorded in the last 24 hours."
              title="Recent visits"
            >
              <RecentVisitsSection rows={data.recentVisits} />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
