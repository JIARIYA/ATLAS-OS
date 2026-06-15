import { FolderKanban } from "lucide-react";
import { ProjectsWorkspace } from "@/components/ProjectsWorkspace";
import { PageHeader } from "@/components/ui";
import { getFormOptions, getMembers, getProjectsBoard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, options, members] = await Promise.all([getProjectsBoard(), getFormOptions(), getMembers()]);
  return (
    <div>
      <PageHeader icon={FolderKanban} title="Projects" subtitle="Expand a project to edit it, assign people, and see who's doing what." />
      <ProjectsWorkspace
        projects={projects}
        members={members}
        options={{ members, projects: options.projects }}
        addOptions={{ domains: options.domains, goals: options.goals }}
      />
    </div>
  );
}
