import { prisma } from "./db";
import { getCurrentUserId } from "./session";
import { isDone, isOpen, OPEN_STATUSES } from "./status";
import { scoreTask } from "./scoring";
import {
  buildDashboard,
  scoreAndRank,
  type DomainInput,
  type GoalInput,
  type ProjectInput,
  type TaskInput,
} from "./recommendation";

export async function getProfile() {
  const userId = await getCurrentUserId();
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) return existing;
  // Self-heal: create a default profile if one is somehow missing.
  return prisma.profile.create({ data: { userId } });
}

const taskInclude = {
  domain: { select: { name: true, color: true, key: true } },
  project: { select: { goalId: true, title: true } },
  responsible: { select: { id: true, name: true, color: true } },
  subtasks: { select: { status: true } },
} as const;

export async function getMembers() {
  const userId = await getCurrentUserId();
  return prisma.member.findMany({ where: { userId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
}

export async function getTeamsAndMembers() {
  const userId = await getCurrentUserId();
  const [teams, members, taskCounts] = await Promise.all([
    prisma.team.findMany({ where: { userId }, orderBy: [{ order: "asc" }] }),
    prisma.member.findMany({ where: { userId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    prisma.task.groupBy({ by: ["responsibleId"], where: { userId, status: { not: "completed" } }, _count: true }),
  ]);
  const openByMember: Record<string, number> = {};
  for (const t of taskCounts) if (t.responsibleId) openByMember[t.responsibleId] = t._count;
  return {
    teams,
    members: members.map((m) => ({ ...m, openTasks: openByMember[m.id] ?? 0 })),
  };
}

export async function getCapacityData() {
  const userId = await getCurrentUserId();
  const now = new Date();
  const { addDays, isSameDay, startOfWeek, ymd } = await import("./dates");
  const [tasks, goals, projects, domains, profile] = await Promise.all([
    prisma.task.findMany({ where: { userId }, include: taskInclude }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId }, include: { tasks: { select: { status: true } } } }),
    prisma.domain.findMany({ where: { userId }, orderBy: { order: "asc" } }),
    getProfile(),
  ]);
  const dash = buildDashboard(
    tasks as unknown as TaskInput[], goals as unknown as GoalInput[], projects as unknown as ProjectInput[], domains as unknown as DomainInput[], profile, now,
  );
  // Committed hours by category (open tasks).
  const byCat = new Map<string, { name: string; color: string; hours: number }>();
  for (const t of tasks) {
    if (isDone(t.status)) continue;
    const name = t.domain?.name ?? "Unsorted";
    const cur = byCat.get(name) ?? { name, color: t.domain?.color ?? "#94a3b8", hours: 0 };
    cur.hours += t.effortHours;
    byCat.set(name, cur);
  }
  const byCategory = [...byCat.values()].sort((a, b) => b.hours - a.hours);
  // Completed per day, last 7 days.
  const completedByDay: Record<string, number> = {};
  for (const t of tasks) if (t.completedAt) completedByDay[ymd(new Date(t.completedAt))] = (completedByDay[ymd(new Date(t.completedAt))] ?? 0) + 1;
  const completedPerDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    return { label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()], count: completedByDay[ymd(d)] ?? 0, isToday: isSameDay(d, now) };
  });
  const weekStart = startOfWeek(now);
  const completedThisWeek = tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const openTotal = tasks.filter((t) => isOpen(t.status)).length;
  return { profile, capacity: dash.capacity, risks: dash.risks, neglectedDomains: dash.neglectedDomains, byCategory, completedPerDay, completedThisWeek, openTotal };
}

export async function getDashboard() {
  const userId = await getCurrentUserId();
  const [tasks, goals, projects, domains, profile] = await Promise.all([
    prisma.task.findMany({ where: { userId }, include: taskInclude }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId }, include: { tasks: { select: { status: true } } } }),
    prisma.domain.findMany({ where: { userId }, orderBy: { order: "asc" } }),
    getProfile(),
  ]);

  return buildDashboard(
    tasks as unknown as TaskInput[],
    goals as unknown as GoalInput[],
    projects as unknown as ProjectInput[],
    domains as unknown as DomainInput[],
    profile,
  );
}

export async function getRankedTasks() {
  const userId = await getCurrentUserId();
  const tasks = await prisma.task.findMany({ where: { userId }, include: taskInclude });
  const ranked = scoreAndRank(tasks as unknown as TaskInput[]);
  const actionableIds = new Set(ranked.map((r) => r.task.id));
  const rest = (tasks as unknown as TaskInput[]).filter((t) => !actionableIds.has(t.id));
  return { ranked, rest };
}

export async function getDomainBalance() {
  const userId = await getCurrentUserId();
  const [domains, tasks, goals] = await Promise.all([
    prisma.domain.findMany({ where: { userId }, orderBy: { order: "asc" } }),
    prisma.task.findMany({ where: { userId }, select: { domainId: true, status: true } }),
    prisma.goal.findMany({ where: { userId }, select: { domainId: true, status: true } }),
  ]);

  return domains.map((d) => {
    const domainTasks = tasks.filter((t) => t.domainId === d.id);
    const openTasks = domainTasks.filter((t) => isOpen(t.status)).length;
    const doneTasks = domainTasks.filter((t) => isDone(t.status)).length;
    const activeGoals = goals.filter((g) => g.domainId === d.id && g.status === "active").length;
    return {
      domain: d,
      openTasks,
      doneTasks,
      activeGoals,
      neglected: openTasks === 0 && activeGoals === 0,
    };
  });
}

export async function getGoalsWithLadder() {
  const userId = await getCurrentUserId();
  return prisma.goal.findMany({
    where: { userId },
    include: {
      domain: { select: { name: true, color: true } },
      parent: { select: { title: true } },
      _count: { select: { children: true, projects: true, tasks: true } },
    },
    orderBy: [{ importance: "desc" }, { createdAt: "asc" }],
  });
}

export async function getProjectsWithProgress() {
  const userId = await getCurrentUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      domain: { select: { name: true, color: true } },
      goal: { select: { title: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => isDone(t.status)).length;
    return { ...p, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  });
}

export async function getReviews() {
  const userId = await getCurrentUserId();
  return prisma.review.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
}

export async function getReviewStats() {
  const userId = await getCurrentUserId();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [completedThisWeek, openTotal, energyAvg] = await Promise.all([
    prisma.task.count({ where: { userId, status: "completed", completedAt: { gte: weekAgo } } }),
    prisma.task.count({ where: { userId, status: { in: OPEN_STATUSES } } }),
    prisma.review.aggregate({ _avg: { energy: true }, where: { userId, createdAt: { gte: weekAgo } } }),
  ]);
  return { completedThisWeek, openTotal, avgEnergy: energyAvg._avg.energy };
}

export async function getFormOptions() {
  const userId = await getCurrentUserId();
  const [domains, projects, goals, members] = await Promise.all([
    prisma.domain.findMany({ where: { userId }, orderBy: { order: "asc" } }),
    prisma.project.findMany({
      where: { userId, status: "active" },
      select: { id: true, title: true, goalId: true },
      orderBy: { title: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.member.findMany({ where: { userId }, orderBy: [{ order: "asc" }] }),
  ]);
  return { domains, projects, goals, members };
}

export interface PlannerTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  effortHours: number;
  progress: number;
  plannedDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  dueDate: string | null;
  domainName: string | null;
  domainColor: string | null;
  color: string | null;
  projectTitle: string | null;
  projectId: string | null;
  responsibleId: string | null;
  score: number;
  trackedSeconds: number;
  timerStartedAt: string | null;
  recurrence: string | null;
  parentTaskId: string | null;
  subtaskCount: number;
  subtaskDone: number;
}

function toPlannerTask(t: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  effortHours: number;
  progress: number;
  impact: number;
  urgency: number;
  plannedDate: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  dueDate: Date | null;
  goalId: string | null;
  projectId: string | null;
  responsibleId: string | null;
  color?: string | null;
  recurrence?: string | null;
  parentTaskId?: string | null;
  trackedSeconds?: number;
  timerStartedAt?: Date | null;
  domain?: { name: string; color: string } | null;
  project?: { title: string; goalId?: string | null } | null;
  subtasks?: { status: string }[];
}): PlannerTask {
  const score = scoreTask({
    status: t.status,
    impact: t.impact,
    urgency: t.urgency,
    effortHours: t.effortHours,
    dueDate: t.dueDate,
    goalId: t.goalId,
    projectId: t.projectId,
    project: t.project ? { goalId: t.project.goalId ?? null } : null,
  }).score;
  const subtasks = t.subtasks ?? [];
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    type: t.type,
    effortHours: t.effortHours,
    progress: t.progress,
    plannedDate: t.plannedDate ? t.plannedDate.toISOString() : null,
    scheduledStart: t.scheduledStart ? t.scheduledStart.toISOString() : null,
    scheduledEnd: t.scheduledEnd ? t.scheduledEnd.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    domainName: t.domain?.name ?? null,
    domainColor: t.domain?.color ?? null,
    color: t.color ?? null,
    projectTitle: t.project?.title ?? null,
    projectId: t.projectId,
    responsibleId: t.responsibleId,
    score,
    trackedSeconds: t.trackedSeconds ?? 0,
    timerStartedAt: t.timerStartedAt ? t.timerStartedAt.toISOString() : null,
    recurrence: t.recurrence ?? null,
    parentTaskId: t.parentTaskId ?? null,
    subtaskCount: subtasks.length,
    subtaskDone: subtasks.filter((s) => s.status === "completed").length,
  };
}

export async function getPlanner(rangeStart: Date, rangeEnd: Date) {
  const userId = await getCurrentUserId();
  const include = {
    domain: { select: { name: true, color: true } },
    project: { select: { title: true, goalId: true } },
  } as const;

  const [planned, waitingRaw, members, profile] = await Promise.all([
    prisma.task.findMany({
      where: { userId, plannedDate: { gte: rangeStart, lt: rangeEnd }, parentTaskId: null },
      include,
    }),
    prisma.task.findMany({
      where: { userId, plannedDate: null, status: { not: "completed" }, parentTaskId: null },
      include,
    }),
    prisma.member.findMany({ where: { userId }, orderBy: [{ order: "asc" }] }),
    getProfile(),
  ]);

  const plannedTasks = planned.map(toPlannerTask);
  const waiting = waitingRaw
    .map(toPlannerTask)
    .sort((a, b) => b.score - a.score);

  return { planned: plannedTasks, waiting, members, profile };
}

export async function getHomeData() {
  const userId = await getCurrentUserId();
  const now = new Date();
  const { addDays, isSameDay, startOfWeek, ymd } = await import("./dates");

  const [tasks, goals, projectsRaw, domains, profile, reviews, userRow] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      include: { domain: { select: { name: true, color: true } }, project: { select: { title: true, goalId: true } } },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId }, include: { domain: { select: { name: true, color: true } }, tasks: { select: { status: true } } } }),
    prisma.domain.findMany({ where: { userId }, orderBy: { order: "asc" } }),
    getProfile(),
    prisma.review.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 14 }),
    prisma.user.findUnique({ where: { id: userId }, select: { todayIntention: true, intentionDate: true } }),
  ]);

  const dash = buildDashboard(
    tasks as unknown as TaskInput[],
    goals as unknown as GoalInput[],
    projectsRaw as unknown as ProjectInput[],
    domains as unknown as DomainInput[],
    profile,
    now,
  );

  // Activity today — planned hours grouped by domain.
  const byDomain = new Map<string, { name: string; color: string; hours: number }>();
  for (const t of tasks) {
    if (!t.plannedDate || !isSameDay(new Date(t.plannedDate), now) || t.status === "completed") continue;
    const name = t.domain?.name ?? "Unsorted";
    const cur = byDomain.get(name) ?? { name, color: t.domain?.color ?? "#94a3b8", hours: 0 };
    cur.hours += t.effortHours;
    byDomain.set(name, cur);
  }
  const activityToday = [...byDomain.values()].sort((a, b) => b.hours - a.hours);
  const totalTodayHours = activityToday.reduce((s, a) => s + a.hours, 0);

  // Milestones — active projects by progress.
  const milestones = projectsRaw
    .filter((p) => p.status === "active")
    .map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === "completed").length;
      return { id: p.id, title: p.title, color: p.domain?.color ?? "#22c55e", pct: total ? Math.round((done / total) * 100) : 0, done, total };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  // Streak — consecutive days with a completion.
  const completedDays = new Set(tasks.filter((t) => t.completedAt).map((t) => ymd(new Date(t.completedAt!))));
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!completedDays.has(ymd(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (completedDays.has(ymd(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const weekStart = startOfWeek(now);
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { label: ["M", "T", "W", "T", "F", "S", "S"][i], done: completedDays.has(ymd(d)), isToday: isSameDay(d, now) };
  });

  // Energy trend from reviews.
  const energyTrend = reviews.map((r) => r.energy).filter((e): e is number => e != null);
  const latestEnergy = energyTrend.length ? energyTrend[energyTrend.length - 1] : null;

  // Peak hours heatmap: 7 weekdays (Mon-Sun) × hours 8..21.
  const hours = Array.from({ length: 14 }, (_, i) => 8 + i);
  const heat = Array.from({ length: 7 }, () => hours.map(() => 0));
  for (const t of tasks) {
    if (!t.scheduledStart) continue;
    const d = new Date(t.scheduledStart);
    const wd = (d.getDay() + 6) % 7;
    const col = hours.indexOf(d.getHours());
    if (col >= 0) heat[wd][col]++;
  }
  const heatMax = Math.max(1, ...heat.flat());

  const completedThisWeek = tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= weekStart).length;

  // Today's intention
  const todayStr = ymd(now);
  const intentionIsToday = userRow?.intentionDate ? ymd(new Date(userRow.intentionDate)) === todayStr : false;
  const todayIntention = intentionIsToday ? (userRow?.todayIntention ?? null) : null;

  return { name: profile.name, dash, activityToday, totalTodayHours, milestones, streak, weekStrip, energyTrend, latestEnergy, heat, heatMax, hours, completedThisWeek, todayIntention };
}

export async function getTasksBoard() {
  const userId = await getCurrentUserId();
  const tasks = await prisma.task.findMany({
    where: { userId, parentTaskId: null },
    include: {
      domain: { select: { name: true, color: true } },
      project: { select: { title: true, goalId: true } },
      subtasks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return tasks.map(toPlannerTask);
}

export async function getDomainsBoard() {
  const userId = await getCurrentUserId();
  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    include: { tasks: { include: { domain: { select: { name: true, color: true } }, project: { select: { title: true, goalId: true } } } } },
  });
  return domains.map((d) => {
    const tasks = d.tasks.map(toPlannerTask);
    return { id: d.id, name: d.name, color: d.color, tasks, open: tasks.filter((t) => t.status !== "completed").length, done: tasks.filter((t) => t.status === "completed").length };
  });
}

export async function getProjectsBoard() {
  const userId = await getCurrentUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    include: { domain: { select: { name: true, color: true } }, tasks: { include: { domain: { select: { name: true, color: true } }, project: { select: { title: true, goalId: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  return projects.map((p) => {
    const tasks = p.tasks.map(toPlannerTask);
    const done = tasks.filter((t) => t.status === "completed").length;
    return {
      id: p.id, title: p.title, objective: p.objective, status: p.status,
      color: p.domain?.color ?? "#6366f1",
      targetDate: p.targetDate ? p.targetDate.toISOString().slice(0, 10) : null,
      tasks, total: tasks.length, done,
    };
  });
}

export async function searchEverything(q: string) {
  const userId = await getCurrentUserId();
  const term = q.trim();
  if (term.length < 1) return { tasks: [], members: [] };
  const [tasks, members] = await Promise.all([
    prisma.task.findMany({
      where: { userId, title: { contains: term } },
      include: { domain: { select: { name: true, color: true } }, project: { select: { title: true, goalId: true } } },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.member.findMany({ where: { userId, name: { contains: term } }, take: 10 }),
  ]);
  // Tasks assigned to members whose name matches (so searching a person surfaces their work).
  const matchMemberIds = members.map((m) => m.id);
  const memberTasks = matchMemberIds.length
    ? await prisma.task.findMany({
        where: { userId, responsibleId: { in: matchMemberIds }, NOT: { title: { contains: term } } },
        include: { domain: { select: { name: true, color: true } }, project: { select: { title: true, goalId: true } } },
        take: 20,
      })
    : [];
  const seen = new Set(tasks.map((t) => t.id));
  const all = [...tasks, ...memberTasks.filter((t) => !seen.has(t.id))];
  return { tasks: all.map(toPlannerTask), members };
}

export async function getTaskDetail(id: string) {
  const userId = await getCurrentUserId();
  const task = await prisma.task.findFirst({
    where: { id, userId },
    include: {
      domain: { select: { name: true, color: true } },
      project: { select: { id: true, title: true } },
      goal: { select: { id: true, title: true } },
      responsible: { select: { id: true, name: true, color: true } },
    },
  });
  return task;
}
