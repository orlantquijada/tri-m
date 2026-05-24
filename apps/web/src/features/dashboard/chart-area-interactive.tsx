import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollectionTrendQuery } from "@/features/dashboard/queries";
import type { TrendRange } from "@/features/dashboard/queries";
import { formatPeso } from "@/lib/format";

const chartConfig = {
  collectedCents: {
    color: "var(--chart-1)",
    label: "Collected",
  },
} satisfies ChartConfig;

const RANGE_LABELS: Record<TrendRange, string> = {
  "30d": "Last 30 days",
  "7d": "Last 7 days",
  "90d": "Last 90 days",
};

export function ChartAreaInteractive() {
  const [range, setRange] = React.useState<TrendRange>("30d");
  const { data, isLoading } = useCollectionTrendQuery(range);

  const chartData = (data ?? []).map((d) => ({
    collected: d.collectedCents / 100,
    date: d.date,
  }));

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>Collections trend</CardDescription>
        <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
          Daily payments collected
        </CardTitle>
        <CardAction>
          <Select
            value={range}
            onValueChange={(v) => setRange(v as TrendRange)}
          >
            <SelectTrigger className="w-[160px]" size="sm">
              <SelectValue placeholder={RANGE_LABELS[range]} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillCollected" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-collectedCents)"
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-collectedCents)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                minTickGap={32}
                tickFormatter={(value) => {
                  const d = new Date(value);
                  return d.toLocaleDateString("en-PH", {
                    day: "numeric",
                    month: "short",
                  });
                }}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `₱${Math.round(v / 1000)}k` : `₱${v}`
                }
                tickLine={false}
                width={48}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatPeso(Math.round(Number(value) * 100))
                    }
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-PH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="collected"
                fill="url(#fillCollected)"
                stroke="var(--color-collectedCents)"
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
