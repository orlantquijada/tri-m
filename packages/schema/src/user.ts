import { z } from "zod";

export const userRoleEnum = z.enum(["admin", "distributor"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const userListItemSchema = z.object({
  createdAt: z.date(),
  distributorId: z.number().nullable(),
  distributorName: z.string().nullable(),
  email: z.string(),
  id: z.string(),
  name: z.string(),
  role: userRoleEnum,
});

export type UserListItem = z.infer<typeof userListItemSchema>;
