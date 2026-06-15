import { ListTodo } from "lucide-react";
import { TasksWorkspace } from "@/components/TasksWorkspace";
import { PageHeader } from "@/components/ui";
import { getFormOptions, getMembers, getTasksBoard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, options, members] = await Promise.all([getTasksBoard(), getFormOptions(), getMembers()]);
  return (
    <div>
      <PageHeader icon={ListTodo} title="Tasks" subtitle="List, Kanban, or by person. Click any task to edit it." />
      <TasksWorkspace tasks={tasks} members={members} options={{ members, projects: options.projects }} addOptions={{ domains: options.domains, projects: options.projects, goals: options.goals }} />
    </div>
  );
}
