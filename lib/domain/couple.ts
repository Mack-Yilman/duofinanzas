import { User } from "../types";

/**
 * Returns the two users sorted by ID to guarantee a stable A and B.
 */
export function getCoupleMembersOrdered(users: User[]): [User | undefined, User | undefined] {
  const sorted = [...users].sort((a, b) => a.id.localeCompare(b.id));
  return [sorted[0], sorted[1]];
}

/**
 * Validates if a user belongs to a couple.
 */
export function assertSameCouple(entityCoupleId: string, userCoupleId: string) {
  if (entityCoupleId !== userCoupleId) {
    throw new Error("Unauthorized: User does not belong to this couple.");
  }
}
