import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, parseApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type BlacklistRequest = {
  id: string;
  customerId: string;
  customerFullName: string;
  distributorId: string;
  distributorName: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedByUserId: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
};

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") {
    return "default";
  }
  if (status === "rejected") {
    return "destructive";
  }
  return "secondary";
}

const QUERY_KEY = ["blacklist-requests", "list"] as const;

function BlacklistRequestsPage() {
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as Record<string, unknown> | undefined)?.role === "admin";
  const queryClient = useQueryClient();

  const [reviewing, setReviewing] = useState<{
    request: BlacklistRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data, error, isLoading } = useQuery({
    queryFn: async () => {
      const res = await api.api["blacklist-requests"].$get();
      if (!res.ok) {
        throw new Error("Failed to fetch requests");
      }
      return res.json();
    },
    queryKey: QUERY_KEY,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: "approve" | "reject";
      note: string;
    }) => {
      const res = await api.api["blacklist-requests"][":id"].$patch({
        json: { action, reviewNote: note || undefined },
        param: { id: String(id) },
      });
      if (!res.ok) {
        throw await parseApiError(
          res as unknown as Response,
          "Failed to review request"
        );
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.action === "approve" ? "Request approved" : "Request rejected"
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setReviewing(null);
      setReviewNote("");
    },
  });

  const requests = (data?.requests ?? []) as BlacklistRequest[];

  return (
    <>
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Blacklist Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review pending customer blacklist requests.
          </p>
        </div>
        {isLoading && <p className="text-muted-foreground">Loading...</p>}
        {error && <p className="text-destructive">Failed to load requests.</p>}
        {!isLoading && !error && requests.length === 0 && (
          <p className="text-muted-foreground">No blacklist requests.</p>
        )}
        {requests.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Distributor</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.customerFullName}
                  </TableCell>
                  <TableCell>{r.distributorName}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {r.reason}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {r.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              setReviewing({ action: "approve", request: r })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setReviewing({ action: "reject", request: r })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {r.reviewNote ?? "—"}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>

      <Dialog
        open={reviewing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewing(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent>
          {reviewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reviewing.action === "approve" ? "Approve" : "Reject"}{" "}
                  Blacklist Request
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm">
                Customer:{" "}
                <span className="font-medium">
                  {reviewing.request.customerFullName}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Reason: {reviewing.request.reason}
              </p>
              {reviewing.action === "reject" && (
                <div className="space-y-1">
                  <Label htmlFor="review-note">Review note (optional)</Label>
                  <Textarea
                    id="review-note"
                    placeholder="Explain the rejection"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </div>
              )}
              {reviewMutation.error && (
                <p className="text-sm text-destructive">
                  {reviewMutation.error.message}
                </p>
              )}
              <DialogFooter showCloseButton>
                <Button
                  disabled={reviewMutation.isPending}
                  variant={
                    reviewing.action === "approve" ? "default" : "destructive"
                  }
                  onClick={() =>
                    void reviewMutation.mutateAsync({
                      action: reviewing.action,
                      id: reviewing.request.id,
                      note: reviewNote,
                    })
                  }
                >
                  {(() => {
                    if (reviewMutation.isPending) {
                      return "Processing...";
                    }
                    return reviewing.action === "approve"
                      ? "Confirm Approve"
                      : "Confirm Reject";
                  })()}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Route = createFileRoute("/_authed/blacklist-requests/")({
  component: BlacklistRequestsPage,
});
