import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { RiskStatus } from "schema";
import { z } from "zod";

import { PhPhoneInput } from "@/components/ph-phone-input";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { parseFloatOrNull } from "@/lib/format";
import { isValidPhMobile, normalizePhMobile } from "@/lib/phone";

import { distributorQueries } from "../distributors/queries";
import { DuplicatePhoneWarning } from "./duplicate-phone-warning";
import { LocationMapPicker } from "./location-map-picker";
import { customerQueries, usePhoneLookup } from "./queries";

export type CustomerFormValues = {
  address: string;
  distributorId: string;
  fullName: string;
  latitude: string;
  longitude: string;
  notes: string;
  phone: string;
  riskStatus: RiskStatus;
};

type UseCustomerFormOpts = {
  defaultValues?: Partial<CustomerFormValues>;
  onSubmit: (value: CustomerFormValues) => Promise<void> | void;
};

export function useCustomerForm({
  defaultValues,
  onSubmit,
}: UseCustomerFormOpts) {
  return useForm({
    defaultValues: {
      address: defaultValues?.address ?? "",
      distributorId: defaultValues?.distributorId ?? "",
      fullName: defaultValues?.fullName ?? "",
      latitude: defaultValues?.latitude ?? "",
      longitude: defaultValues?.longitude ?? "",
      notes: defaultValues?.notes ?? "",
      phone: defaultValues?.phone ?? "",
      riskStatus: defaultValues?.riskStatus ?? ("good" as RiskStatus),
    } satisfies CustomerFormValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });
}

export type CustomerFormApi = ReturnType<typeof useCustomerForm>;

export const CONTACT_FIELD_NAMES = [
  "fullName",
  "phone",
  "distributorId",
] as const;
export const LOCATION_FIELD_NAMES = [
  "address",
  "latitude",
  "longitude",
] as const;
export const RISK_FIELD_NAMES = ["riskStatus", "notes"] as const;

type CustomerFormProps = {
  customerId?: number;
  defaultValues?: Partial<CustomerFormValues>;
};

function toFieldErrors(errors: unknown[]) {
  return errors.filter(Boolean).map((msg) => ({ message: String(msg) }));
}

function validateDistributorId(value: string) {
  if (!value) {
    return "Distributor is required";
  }
  if (Number.isNaN(Number.parseInt(value, 10))) {
    return "Must be a number";
  }
}

type DistributorOption = { label: string; value: string };

type DistributorComboFieldProps = {
  form: CustomerFormApi;
};

function DistributorComboField({ form }: DistributorComboFieldProps) {
  const { data: distributors = [] } = distributorQueries.useList();
  const items = useMemo<DistributorOption[]>(
    () => distributors.map((d) => ({ label: d.name, value: String(d.id) })),
    [distributors]
  );

  return (
    <form.Field
      name="distributorId"
      validators={{ onChange: ({ value }) => validateDistributorId(value) }}
    >
      {(field) => {
        const selected =
          items.find((i) => i.value === field.state.value) ?? null;
        return (
          <Field>
            <FieldLabel htmlFor="distributorId">Distributor</FieldLabel>
            <Combobox
              items={items}
              value={selected}
              onValueChange={(item) =>
                field.handleChange(
                  (item as DistributorOption | null)?.value ?? ""
                )
              }
            >
              <ComboboxInput
                id="distributorId"
                placeholder="Search distributor"
                onBlur={field.handleBlur}
              />
              <ComboboxContent>
                <ComboboxEmpty>No distributors found</ComboboxEmpty>
                <ComboboxList>
                  <ComboboxCollection>
                    {(item: DistributorOption) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        );
      }}
    </form.Field>
  );
}

type ContactFieldsProps = {
  customerId?: number;
  form: CustomerFormApi;
  showDistributorId: boolean;
};

export function ContactFields({
  customerId,
  form,
  showDistributorId,
}: ContactFieldsProps) {
  const [lookupPhone, setLookupPhone] = useState(form.state.values.phone ?? "");
  const phoneLookup = usePhoneLookup(lookupPhone);

  return (
    <div className="space-y-4">
      <form.Field
        name="fullName"
        validators={{
          onChange: ({ value }) =>
            z.string().min(1, "Name is required").safeParse(value).error
              ?.issues[0]?.message,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
            <Input
              id="fullName"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.Field>

      <form.Field
        name="phone"
        validators={{
          onChange: ({ value }) => {
            if (!value) {
              return "Phone is required";
            }
            if (!isValidPhMobile(value)) {
              return "Enter a valid PH mobile number (e.g. 0917 123 4567)";
            }
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <PhPhoneInput
              id="phone"
              value={field.state.value}
              onChange={(v) => field.handleChange(v)}
              onBlur={() => {
                field.handleBlur();
                setLookupPhone(field.state.value);
              }}
            />
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.Field>

      {showDistributorId && <DistributorComboField form={form} />}

      {phoneLookup.data && (
        <DuplicatePhoneWarning
          matches={phoneLookup.data.matches}
          currentCustomerId={customerId}
        />
      )}
    </div>
  );
}

type LocationFieldsProps = {
  autoLocateOnMount?: boolean;
  form: CustomerFormApi;
  pinRequired?: boolean;
};

export function LocationFields({
  autoLocateOnMount,
  form,
  pinRequired,
}: LocationFieldsProps) {
  return (
    <div className="space-y-4">
      <form.Field
        name="address"
        validators={{
          onChange: ({ value }) =>
            z.string().min(1, "Address is required").safeParse(value).error
              ?.issues[0]?.message,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Textarea
              id="address"
              rows={2}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.Field>

      <Field>
        <FieldLabel>
          Pin location
          {pinRequired ? (
            <span className="ml-1 text-destructive">*</span>
          ) : null}
        </FieldLabel>
        <form.Subscribe
          selector={(s) => ({
            address: s.values.address,
            latitude: s.values.latitude,
            longitude: s.values.longitude,
          })}
        >
          {(snap) => {
            const lat = parseFloatOrNull(snap.latitude);
            const lng = parseFloatOrNull(snap.longitude);
            return (
              <LocationMapPicker
                addressIsEmpty={snap.address.trim() === ""}
                autoLocateOnMount={autoLocateOnMount}
                latitude={lat}
                longitude={lng}
                onChange={(nextLat, nextLng) => {
                  form.setFieldValue(
                    "latitude",
                    nextLat === null ? "" : String(nextLat)
                  );
                  form.setFieldValue(
                    "longitude",
                    nextLng === null ? "" : String(nextLng)
                  );
                }}
                onReverseGeocode={(displayName) => {
                  form.setFieldValue("address", displayName);
                }}
                pinRequired={pinRequired}
              />
            );
          }}
        </form.Subscribe>
      </Field>
    </div>
  );
}

type RiskFieldsProps = {
  form: CustomerFormApi;
};

export function RiskFields({ form }: RiskFieldsProps) {
  return (
    <div className="space-y-4">
      <form.Field name="riskStatus">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="riskStatus">Risk Status</FieldLabel>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as RiskStatus)}
            >
              <SelectTrigger
                id="riskStatus"
                className="w-full"
                onBlur={field.handleBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="watchlist">Watchlist</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Textarea
              id="notes"
              rows={2}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </Field>
        )}
      </form.Field>
    </div>
  );
}

export function buildCustomerPayload(
  value: CustomerFormValues,
  opts: { includeDistributorId: boolean }
) {
  return {
    address: value.address,
    fullName: value.fullName,
    latitude: parseFloatOrNull(value.latitude),
    longitude: parseFloatOrNull(value.longitude),
    notes: value.notes || null,
    phone: normalizePhMobile(value.phone) ?? value.phone,
    riskStatus: value.riskStatus,
    ...(opts.includeDistributorId && value.distributorId
      ? { distributorId: Number.parseInt(value.distributorId, 10) }
      : {}),
  };
}

export function CustomerForm({ customerId, defaultValues }: CustomerFormProps) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";
  const isEditing = customerId !== undefined;

  const createMutation = customerQueries.useCreate();
  const updateMutation = customerQueries.useUpdate();

  const form = useCustomerForm({
    defaultValues,
    onSubmit: async (value) => {
      const payload = buildCustomerPayload(value, {
        includeDistributorId: isAdmin && !isEditing,
      });
      await (isEditing
        ? updateMutation.mutateAsync({
            data: payload,
            id: customerId as number,
          })
        : createMutation.mutateAsync(payload));
      void navigate({ to: "/customers" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;
  const idleLabel = isEditing ? "Save Changes" : "Create Customer";

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <ContactFields
        customerId={customerId}
        form={form}
        showDistributorId={isAdmin && !isEditing}
      />
      <LocationFields form={form} />
      <RiskFields form={form} />

      {mutationError && (
        <p className="text-sm text-destructive">{mutationError.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : idleLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate({ to: "/customers" })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
