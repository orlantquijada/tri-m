import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { distributorQueries } from "@/features/distributors/queries";
import { authClient } from "@/lib/auth-client";
import { parsePesoOrNull } from "@/lib/format";

import { productQueries } from "./queries";

export type ProductFormValues = {
  description: string;
  distributorId: string;
  name: string;
  sku: string;
  unitPricePesos: string;
};

type ProductFormProps = {
  defaultValues?: Partial<ProductFormValues>;
  productId?: string;
};

function toFieldErrors(errors: unknown[]) {
  return errors.filter(Boolean).map((msg) => ({ message: String(msg) }));
}

function validateDistributorId(value: string) {
  if (!value) {
    return "Distributor is required";
  }
  if (!z.cuid2().safeParse(value).success) {
    return "Must be a valid distributor id";
  }
}

type DistributorOption = { label: string; value: string };

function DistributorComboField({
  form,
}: {
  form: ReturnType<typeof useProductForm>;
}) {
  const { data: distributors = [] } = distributorQueries.useList();
  const items: DistributorOption[] = distributors.map((d) => ({
    label: d.name,
    value: d.id,
  }));

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
              onValueChange={(item) =>
                field.handleChange(
                  (item as DistributorOption | null)?.value ?? ""
                )
              }
              value={selected}
            >
              <ComboboxInput
                id="distributorId"
                onBlur={field.handleBlur}
                placeholder="Search distributor"
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

function useProductForm(opts: {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (value: ProductFormValues) => Promise<void> | void;
}) {
  return useForm({
    defaultValues: {
      description: opts.defaultValues?.description ?? "",
      distributorId: opts.defaultValues?.distributorId ?? "",
      name: opts.defaultValues?.name ?? "",
      sku: opts.defaultValues?.sku ?? "",
      unitPricePesos: opts.defaultValues?.unitPricePesos ?? "",
    } satisfies ProductFormValues,
    onSubmit: async ({ value }) => {
      await opts.onSubmit(value);
    },
  });
}

export function ProductForm({ defaultValues, productId }: ProductFormProps) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { role?: string } | undefined;
  const isAdmin = sessionUser?.role === "admin";
  const isEditing = productId !== undefined;

  const createMutation = productQueries.useCreate();
  const updateMutation = productQueries.useUpdate();

  const form = useProductForm({
    defaultValues,
    onSubmit: async (value) => {
      const unitPriceCents = parsePesoOrNull(value.unitPricePesos);

      if (isEditing) {
        await updateMutation.mutateAsync({
          data: {
            description: value.description || null,
            name: value.name,
            unitPriceCents,
          },
          id: productId,
        });
        void navigate({ params: { id: productId }, to: "/products/$id" });
      } else {
        await createMutation.mutateAsync({
          description: value.description || null,
          name: value.name,
          sku: value.sku,
          unitPriceCents,
          ...(isAdmin && value.distributorId
            ? { distributorId: value.distributorId }
            : {}),
        });
        void navigate({ to: "/products" });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;
  const idleLabel = isEditing ? "Save Changes" : "Create Product";

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            z.string().min(1, "Name is required").safeParse(value).error
              ?.issues[0]?.message,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              value={field.state.value}
            />
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.Field>

      <form.Field
        name="sku"
        validators={{
          onChange: ({ value }) =>
            isEditing
              ? undefined
              : z.string().min(1, "SKU is required").safeParse(value).error
                  ?.issues[0]?.message,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="sku">SKU</FieldLabel>
            <Input
              disabled={isEditing}
              id="sku"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              value={field.state.value}
            />
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              rows={3}
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>

      <form.Field
        name="unitPricePesos"
        validators={{
          onChange: ({ value }) => {
            const trimmed = value.trim();
            if (!trimmed) {
              return;
            }
            const n = Number.parseFloat(trimmed);
            if (Number.isNaN(n)) {
              return "Enter a valid amount";
            }
            if (n < 0) {
              return "Price cannot be negative";
            }
          },
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="unitPricePesos">Unit price (PHP)</FieldLabel>
            <Input
              id="unitPricePesos"
              inputMode="decimal"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g. 1499.00"
              value={field.state.value}
            />
            <FieldError errors={toFieldErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.Field>

      {isAdmin && !isEditing && <DistributorComboField form={form} />}

      {mutationError && (
        <p className="text-sm text-destructive">{mutationError.message}</p>
      )}

      <div className="flex gap-2">
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving..." : idleLabel}
        </Button>
        <Button
          onClick={() => void navigate({ to: "/products" })}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
