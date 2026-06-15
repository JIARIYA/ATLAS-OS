import { History } from "lucide-react";
import { ReviewForm } from "@/components/ReviewForm";
import { EmptyState, PageHeader, SectionTitle, StatPill } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { getReviews, getReviewStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [reviews, stats] = await Promise.all([getReviews(), getReviewStats()]);
  const { completedThisWeek, openTotal, avgEnergy } = stats;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title="Review"
        subtitle="The loop that turns activity into learning. Reflect daily, recalibrate weekly."
      />

      <div className="grid grid-cols-3 gap-3">
        <StatPill label="Completed (7d)" value={completedThisWeek} tone="ok" />
        <StatPill label="Open commitments" value={openTotal} />
        <StatPill
          label="Avg energy (7d)"
          value={avgEnergy ? avgEnergy.toFixed(1) : "—"}
          tone={avgEnergy && avgEnergy < 2.5 ? "medium" : "low"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <SectionTitle>New review</SectionTitle>
          <ReviewForm />
        </div>

        <div>
          <SectionTitle>History</SectionTitle>
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet." hint="Your first reflection starts the learning loop." />
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
                    <span className="font-medium capitalize" style={{ color: "var(--ink)" }}>
                      {r.type} review
                    </span>
                    <span>
                      {fmtDate(r.createdAt)}
                      {r.energy ? ` · energy ${r.energy}/5` : ""}
                    </span>
                  </div>
                  {r.wins && (
                    <p className="mt-2 text-sm">
                      <span style={{ color: "var(--ok)" }}>Wins: </span>
                      {r.wins}
                    </p>
                  )}
                  {r.blockers && (
                    <p className="mt-1 text-sm">
                      <span style={{ color: "var(--warn)" }}>Blockers: </span>
                      {r.blockers}
                    </p>
                  )}
                  {r.notes && (
                    <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                      {r.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
