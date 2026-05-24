import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient, defaultRouteForRole } from "@/lib/auth-client";

const emailSchema = z.string().email("Enter a valid email");
const passwordSchema = z.string().min(1, "Password is required");

function firstError(errors: unknown[]): string | null {
  const msg = errors.find(
    (e): e is string => typeof e === "string" && e.length > 0
  );
  return msg ?? null;
}

function LoginPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const { data } = await authClient.getSession();
        if (cancelled || !data?.session) {
          return;
        }
        const role = (data.user as { role?: string } | undefined)?.role;
        void navigate({ replace: true, to: defaultRouteForRole(role) });
      } catch {
        /* show login form */
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const result = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
      if (result.error) {
        setSubmitError(result.error.message ?? "Sign in failed");
        return;
      }
      const role = (result.data?.user as { role?: string } | undefined)?.role;
      void navigate({ replace: true, to: defaultRouteForRole(role) });
    },
  });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground"
              >
                <Truck className="size-6" />
              </span>
              <span className="sr-only">Tri-M</span>
              <h1 className="text-xl font-bold">Welcome to Tri-M</h1>
              <FieldDescription>Sign in to continue</FieldDescription>
            </div>

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) =>
                  emailSchema.safeParse(value).error?.issues[0]?.message,
              }}
            >
              {(field) => {
                const err = firstError(field.state.meta.errors);
                return (
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={err ? true : undefined}
                    />
                    {err && <FieldError>{err}</FieldError>}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  passwordSchema.safeParse(value).error?.issues[0]?.message,
              }}
            >
              {(field) => {
                const err = firstError(field.state.meta.errors);
                return (
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={err ? true : undefined}
                    />
                    {err && <FieldError>{err}</FieldError>}
                  </Field>
                );
              }}
            </form.Field>

            {submitError && <FieldError>{submitError}</FieldError>}

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Field>
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Signing in…" : "Sign in"}
                  </Button>
                </Field>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
