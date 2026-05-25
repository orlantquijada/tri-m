import { app } from "api";
import { handle } from "hono/vercel";

export default handle(app);
