import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { RiskStatus } from "schema";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function fieldError(errors: string[]) {
  if (!errors.length) {
    return null;
  }
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

function validateDistributorId(value: string) {
  if (!value) {
    return "Distributor is required";
  }
  if (Number.isNaN(Number.parseInt(value, 10))) {
    return "Must be a number";
  }
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
          <div className="space-y-1">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {fieldError(field.state.meta.errors.filter(Boolean) as string[])}
          </div>
        )}
      </form.Field>

      <form.Field
        name="phone"
        validators={{
          onChange: ({ value }) =>
            z.string().min(1, "Phone is required").safeParse(value).error
              ?.issues[0]?.message,
        }}
      >
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={() => {
                field.handleBlur();
                setLookupPhone(field.state.value);
              }}
            />
            {fieldError(field.state.meta.errors.filter(Boolean) as string[])}
          </div>
        )}
      </form.Field>

      {showDistributorId && (
        <form.Field
          name="distributorId"
          validators={{ onChange: ({ value }) => validateDistributorId(value) }}
        >
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="distributorId">Distributor ID</Label>
              <Input
                id="distributorId"
                type="number"
                min={1}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {fieldError(field.state.meta.errors.filter(Boolean) as string[])}
            </div>
          )}
        </form.Field>
      )}

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
          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={2}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {fieldError(field.state.meta.errors.filter(Boolean) as string[])}
          </div>
        )}
      </form.Field>

      <div className="space-y-1">
        <Label>
          Pin location
          {pinRequired ? (
            <span className="ml-1 text-destructive">*</span>
          ) : null}
        </Label>
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
      </div>
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
          <div className="space-y-1">
            <Label htmlFor="riskStatus">Risk Status</Label>
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
          </div>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
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
    phone: value.phone,
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
