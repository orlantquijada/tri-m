import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, parseApiError } from "@/lib/api";

type ResetPasswordDialogProps = {
  targetUserId: string;
  targetUserName: string;
};

function useResetPassword() {
  return useMutation({
    mutationFn: async (vars: { targetUserId: string; newPassword: string }) => {
      const res = await api.api.users[":id"]["reset-password"].$post({
        json: { newPassword: vars.newPassword },
        param: { id: vars.targetUserId },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to reset password"
        );
      }
      return null;
    },
  });
}

export function ResetPasswordDialog({
  targetUserId,
  targetUserName,
}: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const resetMutation = useResetPassword();

  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !resetMutation.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setNewPassword("");
      setConfirmPassword("");
      resetMutation.reset();
    }
  }

  async function handleConfirm() {
    if (!canSubmit) {
      return;
    }
    await resetMutation.mutateAsync({ newPassword, targetUserId });
    toast.success(`Password reset for ${targetUserName}`);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Reset Password
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password — {targetUserName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Set a new temporary password for this user. Communicate it
          out-of-band; no email will be sent.
        </p>
        <div className="space-y-1">
          <Label htmlFor="reset-new-password">New password</Label>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {tooShort && (
            <p className="text-sm text-destructive">
              Password must be at least 8 characters.
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="reset-confirm-password">Confirm password</Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {mismatch && (
            <p className="text-sm text-destructive">Passwords do not match.</p>
          )}
        </div>
        {resetMutation.error && (
          <p className="text-sm text-destructive">
            {resetMutation.error.message}
          </p>
        )}
        <DialogFooter showCloseButton>
          <Button disabled={!canSubmit} onClick={() => void handleConfirm()}>
            {resetMutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
