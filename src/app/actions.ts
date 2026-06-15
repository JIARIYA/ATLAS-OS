"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { searchEverything } from "@/lib/queries";
import type { AttachmentDTO } from "@/lib/attachments";

// ---------- form helpers ----------
function str(v: FormDataEntryValue | null): string | undefined {
  const s = (v ?? "").toString().trim();
  return s.length ? s : undefined;
}
function num(v: FormDataEntryValue | null): number | undefined {
  const s = str(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function date(v: FormDataEntryValue | null): Date | undefined {
  const s = str(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function revalidateAll() {
  for (const p of ["/", "/tasks", "/goals", "/projects", "/domains", "/review", "/calendar"]) {
    revalidatePath(p);
  }
}

const clampInt = (v: number | undefined, lo: number, hi: number, dflt: number) =>
  v === undefined ? dflt : Math.max(lo, Math.min(hi, Math.round(v)));
const clampNum = (v: number | undefined, lo: number, hi: number, dflt: number) =>
  v === undefined ? dflt : Math.max(lo, Math.min(hi, v));

const energyEnum = z.enum(["low", "medium", "high"]);
const energyTypeEnum = z.enum(["physical", "mental", "emotional", "creative"]);

// ---------- Tasks ----------
export async function createTask(formData: FormData) {
  const userId = await getCurrentUserId();
  const title = str(formData.get("title"));
  if (!title) return;
  await prisma.task.create({
    data: {
      userId,
      title: title.slice(0, 200),
      description: str(formData.get("description"))?.slice(0, 2000),
      impact: clampInt(num(formData.get("impact")), 1, 5, 3),
      urgency: clampInt(num(formData.get("urgency")), 1, 5, 3),
      effortHours: clampNum(num(formData.get("effortHours")), 0, 1000, 1),
      energy: energyEnum.catch("medium").parse(str(formData.get("energy"))),
      energyType: energyTypeEnum.catch("mental").parse(str(formData.get("energyType"))),
      type: z.enum(["operational", "important", "design", "feedback", "meeting"]).catch("operational").parse(str(formData.get("type"))),
      dueDate: date(formData.get("dueDate")),
      startDate: date(formData.get("startDate")),
      domainId: str(formData.get("domainId")),
      projectId: str(formData.get("projectId")),
      goalId: str(formData.get("goalId")),
      responsibleId: str(formData.get("responsibleId")),
    },
  });
  revalidateAll();
}

export async function quickAddTask(formData: FormData) {
  const userId = await getCurrentUserId();
  const title = str(formData.get("title"));
  if (!title) return;
  await prisma.task.create({
    data: {
      userId,
      title: title.slice(0, 200),
      domainId: str(formData.get("domainId")),
      dueDate: date(formData.get("dueDate")),
    },
  });
  revalidateAll();
}

export async function plannerQuickCreate(
  title: string,
  plannedDateISO: string,
  scheduledStartISO?: string,
  scheduledEndISO?: string,
  color?: string,
) {
  const userId = await getCurrentUserId();
  if (!title.trim()) return;
  await prisma.task.create({
    data: {
      userId,
      title: title.trim().slice(0, 200),
      plannedDate: new Date(plannedDateISO),
      scheduledStart: scheduledStartISO ? new Date(scheduledStartISO) : undefined,
      scheduledEnd: scheduledEndISO ? new Date(scheduledEndISO) : undefined,
      status: scheduledStartISO ? "scheduled" : "new",
      color: color ?? undefined,
    },
  });
  revalidateAll();
}

export async function setTaskStatus(id: string, status: string) {
  const userId = await getCurrentUserId();
  const s = z.enum(["new", "scheduled", "in_progress", "completed"]).catch("new").parse(status);
  await prisma.task.updateMany({
    where: { id, userId },
    data: {
      status: s,
      progress: s === "completed" ? 100 : undefined,
      completedAt: s === "completed" ? new Date() : null,
    },
  });
  revalidateAll();
}

export async function setTaskProgress(id: string, progress: number) {
  const userId = await getCurrentUserId();
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  await prisma.task.updateMany({
    where: { id, userId },
    data: {
      progress: clamped,
      status: clamped === 100 ? "completed" : "in_progress",
      completedAt: clamped === 100 ? new Date() : null,
    },
  });
  revalidateAll();
}

export async function deleteTask(id: string) {
  const userId = await getCurrentUserId();
  await prisma.task.deleteMany({ where: { id, userId } });
  revalidateAll();
}

// ---------- Goals ----------
export async function createGoal(formData: FormData) {
  const userId = await getCurrentUserId();
  const title = str(formData.get("title"));
  if (!title) return;
  await prisma.goal.create({
    data: {
      userId,
      title: title.slice(0, 200),
      description: str(formData.get("description"))?.slice(0, 2000),
      horizon: str(formData.get("horizon")) ?? "annual",
      importance: clampInt(num(formData.get("importance")), 1, 5, 3),
      metric: str(formData.get("metric")),
      unit: str(formData.get("unit")),
      startValue: num(formData.get("startValue")) ?? 0,
      currentValue: num(formData.get("currentValue")) ?? 0,
      targetValue: num(formData.get("targetValue")),
      targetDate: date(formData.get("targetDate")),
      domainId: str(formData.get("domainId")),
      parentId: str(formData.get("parentId")),
    },
  });
  revalidateAll();
}

export async function updateGoalProgress(id: string, currentValue: number) {
  const userId = await getCurrentUserId();
  await prisma.goal.updateMany({ where: { id, userId }, data: { currentValue } });
  revalidateAll();
}

export async function setGoalStatus(id: string, status: string) {
  const userId = await getCurrentUserId();
  const s = z.enum(["active", "achieved", "dropped"]).catch("active").parse(status);
  await prisma.goal.updateMany({ where: { id, userId }, data: { status: s } });
  revalidateAll();
}

// ---------- Projects ----------
export async function createProject(formData: FormData) {
  const userId = await getCurrentUserId();
  const title = str(formData.get("title"));
  if (!title) return;
  await prisma.project.create({
    data: {
      userId,
      title: title.slice(0, 200),
      objective: str(formData.get("objective"))?.slice(0, 2000),
      successCriteria: str(formData.get("successCriteria"))?.slice(0, 2000),
      status: z.enum(["active", "on_hold", "done", "archived"]).catch("active").parse(str(formData.get("status"))),
      targetDate: date(formData.get("targetDate")),
      domainId: str(formData.get("domainId")),
      goalId: str(formData.get("goalId")),
    },
  });
  revalidateAll();
}

export async function setProjectStatus(id: string, status: string) {
  const userId = await getCurrentUserId();
  const s = z.enum(["active", "on_hold", "done", "archived"]).catch("active").parse(status);
  await prisma.project.updateMany({ where: { id, userId }, data: { status: s } });
  revalidateAll();
}

export async function updateProjectDetails(id: string, data: { title?: string; objective?: string; status?: string; targetDate?: string | null }) {
  const userId = await getCurrentUserId();
  await prisma.project.updateMany({
    where: { id, userId },
    data: {
      ...(data.title !== undefined ? { title: data.title.slice(0, 200) } : {}),
      ...(data.objective !== undefined ? { objective: data.objective.slice(0, 2000) } : {}),
      ...(data.status !== undefined ? { status: z.enum(["active", "on_hold", "done", "archived"]).catch("active").parse(data.status) } : {}),
      ...(data.targetDate !== undefined ? { targetDate: data.targetDate ? new Date(`${data.targetDate}T00:00:00`) : null } : {}),
    },
  });
  revalidateAll();
}

export async function addTaskToProject(projectId: string, title: string, responsibleId?: string | null) {
  const userId = await getCurrentUserId();
  const t = title.trim();
  if (!t) return;
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!project) return;
  await prisma.task.create({ data: { userId, title: t.slice(0, 200), projectId, responsibleId: responsibleId || null } });
  revalidateAll();
}

// ---------- Time planner ----------
function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Place a task on a given day (and optionally assign a responsible person).
export async function planTask(id: string, dateISO: string, responsibleId?: string | null) {
  const userId = await getCurrentUserId();
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return;
  let respId: string | null | undefined = undefined;
  if (responsibleId !== undefined) {
    respId = responsibleId
      ? (await prisma.member.findFirst({ where: { id: responsibleId, userId } }))?.id ?? null
      : null;
  }
  const current = await prisma.task.findFirst({ where: { id, userId }, select: { status: true } });
  await prisma.task.updateMany({
    where: { id, userId },
    data: {
      plannedDate: dayStart(d),
      // Moving onto the planner promotes a brand-new task to "scheduled".
      status: current?.status === "new" ? "scheduled" : undefined,
      ...(respId !== undefined ? { responsibleId: respId } : {}),
    },
  });
  revalidateAll();
}

// Send a task back to the waiting list.
export async function unplanTask(id: string) {
  const userId = await getCurrentUserId();
  await prisma.task.updateMany({
    where: { id, userId },
    data: { plannedDate: null, scheduledStart: null, scheduledEnd: null },
  });
  revalidateAll();
}

export async function setTaskResponsible(id: string, memberId: string | null) {
  const userId = await getCurrentUserId();
  const respId = memberId
    ? (await prisma.member.findFirst({ where: { id: memberId, userId } }))?.id ?? null
    : null;
  await prisma.task.updateMany({ where: { id, userId }, data: { responsibleId: respId } });
  revalidateAll();
}

// Optional specific time block within the planned day.
export async function setTaskTimeBlock(id: string, startISO: string | null, endISO: string | null) {
  const userId = await getCurrentUserId();
  if (!startISO || !endISO) {
    await prisma.task.updateMany({ where: { id, userId }, data: { scheduledStart: null, scheduledEnd: null } });
  } else {
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return;
    await prisma.task.updateMany({
      where: { id, userId },
      data: { scheduledStart: start, scheduledEnd: end, plannedDate: dayStart(start) },
    });
  }
  revalidateAll();
}

export async function updateTaskDetails(id: string, data: { title?: string; description?: string; dueDate?: string | null; type?: string; effortHours?: number }) {
  const userId = await getCurrentUserId();
  await prisma.task.updateMany({
    where: { id, userId },
    data: {
      ...(data.title !== undefined ? { title: data.title.slice(0, 200) } : {}),
      ...(data.description !== undefined ? { description: data.description.slice(0, 5000) } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.type !== undefined ? { type: z.enum(["operational", "important", "design", "feedback", "meeting"]).catch("operational").parse(data.type) } : {}),
      ...(data.effortHours !== undefined ? { effortHours: Math.max(0, Math.min(1000, data.effortHours)) } : {}),
    },
  });
  revalidateAll();
}

// ---------- Attachments ----------
const MAX_FILE = 15 * 1024 * 1024; // 15MB

export async function getTaskAttachments(taskId: string): Promise<AttachmentDTO[]> {
  const userId = await getCurrentUserId();
  const rows = await prisma.attachment.findMany({
    where: { taskId, userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, filename: true, mimeType: true, size: true },
  });
  return rows.map((r) => ({ ...r, isImage: r.mimeType.startsWith("image/") }));
}

export async function uploadAttachments(formData: FormData): Promise<AttachmentDTO[]> {
  const userId = await getCurrentUserId();
  const taskId = str(formData.get("taskId"));
  if (!taskId) return [];
  const task = await prisma.task.findFirst({ where: { id: taskId, userId }, select: { id: true } });
  if (!task) return [];

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const base = process.env.UPLOADS_DIR || path.join(process.cwd(), ".uploads");
  const dir = path.join(base, userId);
  await fs.mkdir(dir, { recursive: true });

  for (const file of files) {
    if (file.size > MAX_FILE) continue;
    const att = await prisma.attachment.create({
      data: {
        userId,
        taskId,
        filename: file.name.slice(0, 200),
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        path: "",
      },
    });
    const dest = path.join(dir, att.id);
    await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));
    await prisma.attachment.update({ where: { id: att.id }, data: { path: dest } });
  }
  revalidateAll();
  return getTaskAttachments(taskId);
}

export async function deleteAttachment(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const att = await prisma.attachment.findFirst({ where: { id, userId } });
  if (!att) return;
  await prisma.attachment.delete({ where: { id: att.id } });
  if (att.path) await fs.unlink(att.path).catch(() => {});
  revalidateAll();
}

// ---------- Capture ----------
interface CaptureInput {
  title: string;
  dueDate: string | null;
  plannedDate: string | null;
  startISO: string | null;
  endISO: string | null;
  effortHours: number;
  domainKey: string | null;
  type: string;
  impact: number;
  urgency: number;
}

export async function createTasksFromCapture(tasks: CaptureInput[]): Promise<number> {
  const userId = await getCurrentUserId();
  const [domains, selfMember] = await Promise.all([
    prisma.domain.findMany({ where: { userId }, select: { id: true, key: true } }),
    prisma.member.findFirst({ where: { userId, isSelf: true } }),
  ]);
  const domByKey: Record<string, string> = Object.fromEntries(domains.map((d) => [d.key, d.id]));
  const typeEnum = z.enum(["operational", "important", "design", "feedback", "meeting"]);

  let created = 0;
  for (const t of tasks) {
    const title = (t.title ?? "").trim();
    if (!title) continue;
    const plannedDate = t.plannedDate ? new Date(`${t.plannedDate}T00:00:00`) : null;
    await prisma.task.create({
      data: {
        userId,
        title: title.slice(0, 200),
        type: typeEnum.catch("operational").parse(t.type),
        impact: clampInt(t.impact, 1, 5, 3),
        urgency: clampInt(t.urgency, 1, 5, 3),
        effortHours: clampNum(t.effortHours, 0, 1000, 0.5),
        dueDate: t.dueDate ? new Date(`${t.dueDate}T00:00:00`) : null,
        plannedDate,
        scheduledStart: t.startISO ? new Date(t.startISO) : null,
        scheduledEnd: t.endISO ? new Date(t.endISO) : null,
        status: plannedDate ? "scheduled" : "new",
        domainId: t.domainKey ? domByKey[t.domainKey] ?? null : null,
        responsibleId: selfMember?.id ?? null,
      },
    });
    created++;
  }
  revalidateAll();
  return created;
}

// ---------- Domains (life balance) ----------
export async function createDomain(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = str(formData.get("name"));
  if (!name) return;
  const baseKey = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "domain";
  let key = baseKey;
  let n = 1;
  while (await prisma.domain.findFirst({ where: { userId, key } })) key = `${baseKey}-${++n}`;
  const count = await prisma.domain.count({ where: { userId } });
  await prisma.domain.create({
    data: { userId, key, name: name.slice(0, 40), color: str(formData.get("color")) ?? MEMBER_PALETTE[count % MEMBER_PALETTE.length], order: count },
  });
  revalidateAll();
}

export async function deleteDomain(id: string) {
  const userId = await getCurrentUserId();
  const owns = await prisma.domain.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owns) return;
  await prisma.task.updateMany({ where: { userId, domainId: id }, data: { domainId: null } });
  await prisma.project.updateMany({ where: { userId, domainId: id }, data: { domainId: null } });
  await prisma.goal.updateMany({ where: { userId, domainId: id }, data: { domainId: null } });
  await prisma.event.updateMany({ where: { userId, domainId: id }, data: { domainId: null } });
  await prisma.domain.delete({ where: { id } });
  revalidateAll();
}

export async function addTaskToDomain(domainId: string, title: string) {
  const userId = await getCurrentUserId();
  const t = title.trim();
  if (!t) return;
  const d = await prisma.domain.findFirst({ where: { id: domainId, userId }, select: { id: true } });
  if (!d) return;
  await prisma.task.create({ data: { userId, title: t.slice(0, 200), domainId } });
  revalidateAll();
}

// ---------- Search ----------
export async function searchAction(q: string) {
  return searchEverything(q);
}

// ---------- Teams & members ----------
const MEMBER_PALETTE = ["#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#ef4444", "#14b8a6", "#f97316"];

export async function createTeam(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = str(formData.get("name"));
  if (!name) return;
  const count = await prisma.team.count({ where: { userId } });
  await prisma.team.create({
    data: { userId, name: name.slice(0, 60), color: str(formData.get("color")) ?? MEMBER_PALETTE[count % MEMBER_PALETTE.length], order: count },
  });
  revalidateAll();
}

export async function deleteTeam(id: string) {
  const userId = await getCurrentUserId();
  await prisma.member.updateMany({ where: { userId, teamId: id }, data: { teamId: null } });
  await prisma.team.deleteMany({ where: { id, userId } });
  revalidateAll();
}

export async function createMember(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = str(formData.get("name"));
  if (!name) return;
  const count = await prisma.member.count({ where: { userId } });
  await prisma.member.create({
    data: {
      userId,
      name: name.slice(0, 80),
      color: str(formData.get("color")) ?? MEMBER_PALETTE[count % MEMBER_PALETTE.length],
      teamId: str(formData.get("teamId")) ?? null,
      order: count,
    },
  });
  revalidateAll();
}

export async function updateMember(id: string, data: { name?: string; color?: string; teamId?: string | null }) {
  const userId = await getCurrentUserId();
  let teamId: string | null | undefined = undefined;
  if (data.teamId !== undefined) {
    teamId = data.teamId ? (await prisma.team.findFirst({ where: { id: data.teamId, userId } }))?.id ?? null : null;
  }
  await prisma.member.updateMany({
    where: { id, userId },
    data: {
      ...(data.name !== undefined ? { name: data.name.slice(0, 80) } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(teamId !== undefined ? { teamId } : {}),
    },
  });
  revalidateAll();
}

export async function deleteMember(id: string) {
  const userId = await getCurrentUserId();
  await prisma.task.updateMany({ where: { userId, responsibleId: id }, data: { responsibleId: null } });
  await prisma.member.deleteMany({ where: { id, userId } });
  revalidateAll();
}

export async function getMemberTasks(memberId: string) {
  const userId = await getCurrentUserId();
  return prisma.task.findMany({
    where: { userId, responsibleId: memberId, status: { not: "completed" } },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function addTaskForMember(memberId: string, title: string) {
  const userId = await getCurrentUserId();
  const t = title.trim();
  if (!t) return;
  const member = await prisma.member.findFirst({ where: { id: memberId, userId } });
  if (!member) return;
  await prisma.task.create({ data: { userId, title: t.slice(0, 200), responsibleId: memberId } });
  revalidateAll();
}

// ---------- Review ----------
export async function createReview(formData: FormData) {
  const userId = await getCurrentUserId();
  await prisma.review.create({
    data: {
      userId,
      type: z.enum(["daily", "weekly"]).catch("daily").parse(str(formData.get("type"))),
      energy: num(formData.get("energy")) !== undefined ? clampInt(num(formData.get("energy")), 1, 5, 3) : null,
      wins: str(formData.get("wins"))?.slice(0, 2000),
      blockers: str(formData.get("blockers"))?.slice(0, 2000),
      notes: str(formData.get("notes"))?.slice(0, 2000),
    },
  });
  revalidateAll();
}

// ---------- Profile / capacity ----------
export async function updateProfile(formData: FormData) {
  const userId = await getCurrentUserId();
  const data = {
    name: (str(formData.get("name")) ?? "You").slice(0, 80),
    deepWorkHoursPerDay: clampNum(num(formData.get("deepWorkHoursPerDay")), 0, 16, 4),
    totalHoursPerDay: clampNum(num(formData.get("totalHoursPerDay")), 0, 24, 8),
    workdays: str(formData.get("workdays")) ?? "1,2,3,4,5",
  };
  await prisma.profile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  revalidateAll();
}
