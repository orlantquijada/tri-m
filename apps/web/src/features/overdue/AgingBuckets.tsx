import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPeso } from "@/lib/format";

type AgingData = {
  bucket0_30Cents: number;
  bucket31_60Cents: number;
  bucket61_90Cents: number;
  bucket90PlusCents: number;
};

const BUCKETS = [
  { key: "bucket0_30Cents", label: "0–30 days" },
  { key: "bucket31_60Cents", label: "31–60 days" },
  { key: "bucket61_90Cents", label: "61–90 days" },
  { key: "bucket90PlusCents", label: "90+ days" },
] as const;

export function AgingBuckets({ aging }: { aging: AgingData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {BUCKETS.map(({ key, label }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xl font-bold text-destructive">
              {formatPeso(aging[key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
