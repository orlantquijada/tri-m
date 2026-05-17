import { Hono } from "hono";

import type { AuthVariables } from "../middleware/auth";

export const createRouter = () => new Hono<{ Variables: AuthVariables }>();
