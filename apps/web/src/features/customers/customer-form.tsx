import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "./queries";

type RiskStatus = "good" | "watchlist" | "blacklisted";

type FormValues = {
  address: string;
  distributorId: string;
  fullName: string;
  latitude: string;
  longitude: string;
  notes: string;
  phone: string;
  riskStatus: RiskStatus;
};

type CustomerFormProps = {
  customerId?: number;
  defaultValues?: Partial<FormValues>;
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

function validateLatitude(value: string) {
  if (!value) {
    return;
  }
  const n = Number.parseFloat(value);
  if (Number.isNaN(n) || n < -90 || n > 90) {
    return "Must be between -90 and 90";
  }
}

function validateLongitude(value: string) {
  if (!value) {
    return;
  }
  const n = Number.parseFloat(value);
  if (Number.isNaN(n) || n < -180 || n > 180) {
    return "Must be between -180 and 180";
  }
}

function captureLocation(
  setError: (e: string | null) => void,
  setLoading: (l: boolean) => void,
  onCoords: (lat: string, lon: string) => void
) {
  if (!navigator.geolocation) {
    setError("Geolocation not supported");
    return;
  }
  setLoading(true);
  setError(null);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onCoords(String(pos.coords.latitude), String(pos.coords.longitude));
      setLoading(false);
    },
    () => {
      setError("Could not get location");
      setLoading(false);
    }
  );
}

// eslint-disable-next-line complexity
export function CustomerForm({ customerId, defaultValues }: CustomerFormProps) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";
  const isEditing = customerId !== undefined;

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();

  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      address: defaultValues?.address ?? "",
      distributorId: defaultValues?.distributorId ?? "",
      fullName: defaultValues?.fullName ?? "",
      latitude: defaultValues?.latitude ?? "",
      longitude: defaultValues?.longitude ?? "",
      notes: defaultValues?.notes ?? "",
      phone: defaultValues?.phone ?? "",
      riskStatus: defaultValues?.riskStatus ?? "good",
    },
    onSubmit: async ({ value }) => {
      const payload = {
        address: value.address,
        fullName: value.fullName,
        latitude: value.latitude ? Number.parseFloat(value.latitude) : null,
        longitude: value.longitude ? Number.parseFloat(value.longitude) : null,
        notes: value.notes || null,
        phone: value.phone,
        riskStatus: value.riskStatus,
        ...(isAdmin && value.distributorId
          ? { distributorId: Number.parseInt(value.distributorId, 10) }
          : {}),
      };
      await (isEditing
        ? updateMutation.mutateAsync({
            data: payload,
            id: customerId as number,
          })
        : createMutation.mutateAsync(payload));
      void navigate({ to: "/customers" });
    },
  });

  const handleGetLocation = () =>
    captureLocation(setGeoError, setGeoLoading, (lat, lon) => {
      form.setFieldValue("latitude", lat);
      form.setFieldValue("longitude", lon);
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
              onBlur={field.handleBlur}
            />
            {fieldError(field.state.meta.errors.filter(Boolean) as string[])}
          </div>
        )}
      </form.Field>

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

      <form.Field name="riskStatus">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="riskStatus">Risk Status</Label>
            <select
              id="riskStatus"
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as RiskStatus)}
              onBlur={field.handleBlur}
            >
              <option value="good">Good</option>
              <option value="watchlist">Watchlist</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        )}
      </form.Field>

      {isAdmin && !isEditing && (
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

      <div className="space-y-1">
        <Label>Location</Label>
        <div className="flex gap-2">
          <form.Field
            name="latitude"
            validators={{ onChange: ({ value }) => validateLatitude(value) }}
          >
            {(field) => (
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Latitude (-90 to 90)"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {fieldError(
                  field.state.meta.errors.filter(Boolean) as string[]
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="longitude"
            validators={{ onChange: ({ value }) => validateLongitude(value) }}
          >
            {(field) => (
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Longitude (-180 to 180)"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {fieldError(
                  field.state.meta.errors.filter(Boolean) as string[]
                )}
              </div>
            )}
          </form.Field>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGetLocation}
            disabled={geoLoading}
            title="Use current location"
          >
            <MapPin className="size-4" />
          </Button>
        </div>
        {geoError && <p className="text-sm text-destructive">{geoError}</p>}
      </div>

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
