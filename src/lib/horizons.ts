// Multi-horizon planning ladder. Order matters: lower index = longer range.
export const HORIZONS = [
  { key: "vision", name: "Lifetime Vision" },
  { key: "10yr", name: "10-Year Vision" },
  { key: "5yr", name: "5-Year Vision" },
  { key: "3yr", name: "3-Year Objective" },
  { key: "annual", name: "Annual Goal" },
  { key: "quarterly", name: "Quarterly Objective" },
  { key: "monthly", name: "Monthly Priority" },
  { key: "weekly", name: "Weekly Commitment" },
] as const;

export type HorizonKey = (typeof HORIZONS)[number]["key"];

export const HORIZON_BY_KEY = Object.fromEntries(
  HORIZONS.map((h) => [h.key, h]),
) as Record<string, (typeof HORIZONS)[number]>;

export function horizonName(key: string): string {
  return HORIZON_BY_KEY[key]?.name ?? key;
}
