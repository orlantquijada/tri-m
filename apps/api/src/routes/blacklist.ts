import { zValidator } from "@hono/zod-validator";
import { blacklistRequestInsertSchema, blacklistReviewSchema } from "schema";

import { createRouter } from "../lib/factory";
import { idParam } from "../lib/params";
import { requireSession } from "../middleware/auth";
import {
  createBlacklistRequest,
  listBlacklistRequests,
  reviewBlacklistRequest,
} from "../services/blacklist";

export const blacklistRequests = createRouter()
  .post(
    "/",
    requireSession,
    zValidator("json", blacklistRequestInsertSchema),
    async (c) =>
      c.json(
        await createBlacklistRequest(c.get("user"), c.req.valid("json")),
        201
      )
  )
  .get("/", requireSession, async (c) => {
    const requests = await listBlacklistRequests(c.get("user"));
    return c.json({ requests });
  })
  .patch(
    "/:id",
    requireSession,
    zValidator("json", blacklistReviewSchema),
    async (c) =>
      c.json(
        await reviewBlacklistRequest(
          c.get("user"),
          idParam(c),
          c.req.valid("json")
        )
      )
  );
