export interface FriendShare {
  name: string;
  amount: number;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function friendTotal(friends: FriendShare[]): number {
  return roundMoney(friends.reduce((sum, friend) => sum + friend.amount, 0));
}

/** What you actually spent. Friends' shares are not yours. */
export function myShare(total: number, friends: FriendShare[] = []): number {
  return roundMoney(Math.max(0, total - friendTotal(friends)));
}

export class SplitInputError extends Error {}

/** Merge duplicate names and reject a share list that cannot be saved. */
export function normalizeFriends(
  input: Array<{ name: string; amount: number }>,
): FriendShare[] {
  const seen = new Map<string, FriendShare>();
  for (const friend of input) {
    const name = friend.name.trim().replace(/\s+/g, " ");
    if (!name) throw new SplitInputError("Each friend needs a name");
    if (name.length > 80) throw new SplitInputError("A friend name is too long");
    if (!Number.isFinite(friend.amount) || friend.amount <= 0) {
      throw new SplitInputError("Each share has to be more than zero");
    }
    const key = name.toLowerCase();
    const previous = seen.get(key);
    seen.set(key, {
      name: previous?.name ?? name,
      amount: roundMoney((previous?.amount ?? 0) + friend.amount),
    });
  }
  if (seen.size > 12) throw new SplitInputError("Split a bill with at most 12 friends");
  return [...seen.values()];
}

export function assertSharesFit(total: number, friends: FriendShare[]): void {
  if (friendTotal(friends) - total > 0.001) {
    throw new SplitInputError("Friends' shares are more than the bill");
  }
}
