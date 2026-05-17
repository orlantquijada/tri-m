import type { User } from "../middleware/auth";

export function isDistributorOwner(user: User, distributorId: number): boolean {
  return user.role !== "distributor" || user.distributorId === distributorId;
}
