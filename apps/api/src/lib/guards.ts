import type { AuthVariables } from "../middleware/auth";

type User = AuthVariables["user"];

export function isDistributorOwner(user: User, distributorId: number): boolean {
  return user.role !== "distributor" || user.distributorId === distributorId;
}
