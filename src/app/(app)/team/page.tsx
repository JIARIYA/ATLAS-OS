import { Users } from "lucide-react";
import { TeamManager } from "@/components/TeamManager";
import { PageHeader } from "@/components/ui";
import { getTeamsAndMembers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { teams, members } = await getTeamsAndMembers();
  return (
    <div className="animate-fade-in">
      <PageHeader icon={Users} title="Team" subtitle="Add people, group them into teams, and assign work in the planner." />
      <TeamManager teams={teams} members={members} />
    </div>
  );
}
