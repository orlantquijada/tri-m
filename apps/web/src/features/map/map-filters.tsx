import type { RiskStatus } from "schema";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const RISK_OPTIONS: { label: string; value: RiskStatus }[] = [
  { label: "Good", value: "good" },
  { label: "Watchlist", value: "watchlist" },
  { label: "Blacklisted", value: "blacklisted" },
];

export type MapFiltersState = {
  hasOverdue: boolean;
  riskStatus: RiskStatus[];
};

type Props = {
  onChange: (next: MapFiltersState) => void;
  value: MapFiltersState;
};

export function MapFilters({ onChange, value }: Props) {
  const toggleRisk = (status: RiskStatus, checked: boolean) => {
    const set = new Set(value.riskStatus);
    if (checked) {
      set.add(status);
    } else {
      set.delete(status);
    }
    onChange({ ...value, riskStatus: [...set] });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-background/80 px-4 py-2 text-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">Risk:</span>
        {RISK_OPTIONS.map((opt) => {
          const id = `map-filter-risk-${opt.value}`;
          const checked = value.riskStatus.includes(opt.value);
          return (
            <Label key={opt.value} className="cursor-pointer" htmlFor={id}>
              <Checkbox
                checked={checked}
                id={id}
                onCheckedChange={(next) => toggleRisk(opt.value, next)}
              />
              {opt.label}
            </Label>
          );
        })}
      </div>
      <Label className="cursor-pointer" htmlFor="map-filter-overdue">
        <Switch
          checked={value.hasOverdue}
          id="map-filter-overdue"
          onCheckedChange={(next) => onChange({ ...value, hasOverdue: next })}
        />
        Overdue only
      </Label>
    </div>
  );
}
