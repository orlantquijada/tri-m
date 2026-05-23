import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

import {
  buildCustomerPayload,
  ContactFields,
  LocationFields,
  RiskFields,
  useCustomerForm,
} from "./customer-form";
import type { CustomerFormApi, CustomerFormValues } from "./customer-form";
import { customerQueries } from "./queries";

type StepKey = "contact" | "location" | "risk";

const STEPS: { description: string; key: StepKey; title: string }[] = [
  {
    description: "Who is the customer?",
    key: "contact",
    title: "Contact",
  },
  {
    description: "Where can you find them?",
    key: "location",
    title: "Location",
  },
  {
    description: "Final notes and risk profile.",
    key: "risk",
    title: "Risk & notes",
  },
];

function getStepFieldNames(
  step: StepKey,
  showDistributorId: boolean
): (keyof CustomerFormValues)[] {
  if (step === "contact") {
    return showDistributorId
      ? ["fullName", "phone", "distributorId"]
      : ["fullName", "phone"];
  }
  if (step === "location") {
    return ["address", "latitude", "longitude"];
  }
  return ["riskStatus", "notes"];
}

function getRequiredFieldNames(
  step: StepKey,
  showDistributorId: boolean,
  requirePin: boolean
): (keyof CustomerFormValues)[] {
  if (step === "contact") {
    return showDistributorId
      ? ["fullName", "phone", "distributorId"]
      : ["fullName", "phone"];
  }
  if (step === "location") {
    return requirePin ? ["address", "latitude", "longitude"] : ["address"];
  }
  return [];
}

function isStepValid(
  values: CustomerFormValues,
  fieldMeta: Partial<
    Record<keyof CustomerFormValues, { errors: unknown[] } | undefined>
  >,
  required: (keyof CustomerFormValues)[],
  optional: (keyof CustomerFormValues)[]
): boolean {
  for (const name of required) {
    const value = values[name];
    if (typeof value === "string" && value.trim() === "") {
      return false;
    }
    const errs = fieldMeta[name]?.errors ?? [];
    if (errs.filter(Boolean).length > 0) {
      return false;
    }
  }
  for (const name of optional) {
    const errs = fieldMeta[name]?.errors ?? [];
    if (errs.filter(Boolean).length > 0) {
      return false;
    }
  }
  return true;
}

type StepIndicatorProps = {
  current: number;
};

function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-3">
      {STEPS.map((step, idx) => {
        const isDone = idx < current;
        const isCurrent = idx === current;
        return (
          <li
            className="flex flex-1 items-center gap-2 sm:flex-none"
            key={step.key}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                isCurrent
                  ? "border-primary bg-primary text-primary-foreground"
                  : (isDone
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground")
              }`}
            >
              {idx + 1}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                isCurrent ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {step.title}
            </span>
            {idx < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="hidden h-px flex-1 bg-border sm:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type ReviewSummaryProps = {
  form: CustomerFormApi;
};

function ReviewSummary({ form }: ReviewSummaryProps) {
  return (
    <form.Subscribe selector={(s) => s.values}>
      {(values) => (
        <dl className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{values.fullName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{values.phone || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-right font-medium">{values.address || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Coordinates</dt>
            <dd className="font-medium">
              {values.latitude && values.longitude
                ? `${values.latitude}, ${values.longitude}`
                : "—"}
            </dd>
          </div>
        </dl>
      )}
    </form.Subscribe>
  );
}

export function CustomerIntakeWizard() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";

  const createMutation = customerQueries.useCreate();
  const [stepIdx, setStepIdx] = useState(0);

  const form = useCustomerForm({
    onSubmit: async (value) => {
      const payload = buildCustomerPayload(value, {
        includeDistributorId: isAdmin,
      });
      await createMutation.mutateAsync(payload);
      void navigate({ to: "/customers" });
    },
  });

  const step = STEPS[stepIdx];
  const showDistributorId = isAdmin;
  const requirePin = !isAdmin;
  const required = getRequiredFieldNames(
    step.key,
    showDistributorId,
    requirePin
  );
  const optional = getStepFieldNames(step.key, showDistributorId).filter(
    (n) => !required.includes(n)
  );

  const handleNext = async () => {
    const fields = getStepFieldNames(step.key, showDistributorId);
    await Promise.all(fields.map((name) => form.validateField(name, "change")));
    const stillValid = isStepValid(
      form.state.values,
      form.state.fieldMeta,
      required,
      optional
    );
    if (stillValid) {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  const isLast = stepIdx === STEPS.length - 1;
  const { isPending } = createMutation;
  const mutationError = createMutation.error;

  return (
    <form
      className="max-w-lg space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (isLast) {
          void form.handleSubmit();
        }
      }}
    >
      <StepIndicator current={stepIdx} />

      <header className="space-y-1">
        <h2 className="font-semibold text-lg">{step.title}</h2>
        <p className="text-muted-foreground text-sm">{step.description}</p>
      </header>

      {step.key === "contact" && (
        <ContactFields form={form} showDistributorId={showDistributorId} />
      )}
      {step.key === "location" && (
        <LocationFields
          form={form}
          autoLocateOnMount={requirePin}
          pinRequired={requirePin}
        />
      )}
      {step.key === "risk" && (
        <div className="space-y-4">
          <RiskFields form={form} />
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Review</h3>
            <ReviewSummary form={form} />
          </div>
        </div>
      )}

      {mutationError && (
        <p className="text-sm text-destructive">{mutationError.message}</p>
      )}

      <form.Subscribe
        selector={(s) => ({
          fieldMeta: s.fieldMeta,
          values: s.values,
        })}
      >
        {(state) => {
          const canAdvance = isStepValid(
            state.values,
            state.fieldMeta,
            required,
            optional
          );
          return (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                disabled={stepIdx === 0 || isPending}
                onClick={handleBack}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <div className="flex gap-2 sm:justify-end">
                <Button
                  onClick={() => void navigate({ to: "/customers" })}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                {isLast ? (
                  <Button disabled={!canAdvance || isPending} type="submit">
                    {isPending ? "Saving..." : "Create Customer"}
                  </Button>
                ) : (
                  <Button
                    disabled={!canAdvance}
                    onClick={() => void handleNext()}
                    type="button"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
