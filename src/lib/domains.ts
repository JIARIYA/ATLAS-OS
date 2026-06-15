// The life domains Atlas balances across. Seeded into the DB; this list is the
// source of truth for keys, display names, order, and accent colors.
export const DOMAINS = [
  { key: "career", name: "Career", color: "#6366f1", order: 1 },
  { key: "education", name: "Education", color: "#8b5cf6", order: 2 },
  { key: "finance", name: "Finance", color: "#10b981", order: 3 },
  { key: "health", name: "Health", color: "#ef4444", order: 4 },
  { key: "family", name: "Family", color: "#f59e0b", order: 5 },
  { key: "relationships", name: "Relationships", color: "#ec4899", order: 6 },
  { key: "growth", name: "Personal Growth", color: "#14b8a6", order: 7 },
  { key: "learning", name: "Learning", color: "#3b82f6", order: 8 },
  { key: "home", name: "Home", color: "#a16207", order: 9 },
  { key: "community", name: "Community", color: "#0ea5e9", order: 10 },
  { key: "spirituality", name: "Spirituality", color: "#7c3aed", order: 11 },
  { key: "travel", name: "Travel", color: "#06b6d4", order: 12 },
  { key: "recreation", name: "Recreation", color: "#84cc16", order: 13 },
] as const;

export type DomainKey = (typeof DOMAINS)[number]["key"];

export const DOMAIN_BY_KEY = Object.fromEntries(
  DOMAINS.map((d) => [d.key, d]),
) as Record<string, (typeof DOMAINS)[number]>;
