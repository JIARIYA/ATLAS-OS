import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DOMAINS } from "../src/lib/domains";
import { MEMBER_COLORS } from "../src/lib/status";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);
function planDay(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}
function at(offset: number, h: number, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d;
}

const DEMO_EMAIL = "demo@atlas.app";
const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash,
      profile: { create: { name: "Demo User", deepWorkHoursPerDay: 4, totalHoursPerDay: 8 } },
    },
  });
  const userId = user.id;

  for (const d of DOMAINS) {
    await prisma.domain.upsert({
      where: { userId_key: { userId, key: d.key } },
      update: { name: d.name, color: d.color, order: d.order },
      create: { userId, key: d.key, name: d.name, color: d.color, order: d.order },
    });
  }
  const domains = await prisma.domain.findMany({ where: { userId } });
  const dom = (key: string) => domains.find((d) => d.key === key)!.id;

  const existing = await prisma.task.count({ where: { userId } });
  if (existing > 0) {
    console.log(`Seed: domains + demo user ensured. Data already present — skipped.`);
    return;
  }

  // Team members.
  const memberNames = ["Demo User", "Marry Williams", "Anastasia Novak", "David Thomas", "Michael Martinez", "Sofia Brown"];
  const members: Record<string, string> = {};
  for (let i = 0; i < memberNames.length; i++) {
    const m = await prisma.member.create({
      data: { userId, name: memberNames[i], color: MEMBER_COLORS[i % MEMBER_COLORS.length], isSelf: i === 0, order: i },
    });
    members[memberNames[i]] = m.id;
  }
  const mem = (n: string) => members[n];

  // Goals.
  const gSenior = await prisma.goal.create({ data: { userId, title: "Reach senior engineer", description: "Grow scope and impact to earn a senior title.", horizon: "annual", importance: 5, metric: "Scope score", unit: "pts", startValue: 0, currentValue: 40, targetValue: 100, targetDate: daysFromNow(200), domainId: dom("career") } });
  const gAtlas = await prisma.goal.create({ data: { userId, title: "Ship Atlas OS v1", horizon: "quarterly", importance: 5, metric: "Spine features shipped", unit: "features", startValue: 0, currentValue: 3, targetValue: 6, targetDate: daysFromNow(20), domainId: dom("career"), parentId: gSenior.id } });
  const gMarathon = await prisma.goal.create({ data: { userId, title: "Run a half marathon", horizon: "annual", importance: 4, metric: "Longest run", unit: "km", startValue: 4, currentValue: 8, targetValue: 21, targetDate: daysFromNow(120), domainId: dom("health") } });
  const gRead = await prisma.goal.create({ data: { userId, title: "Read 24 books this year", horizon: "annual", importance: 3, metric: "Books read", unit: "books", startValue: 0, currentValue: 6, targetValue: 24, targetDate: new Date(new Date().getFullYear(), 11, 31), domainId: dom("learning") } });
  await prisma.goal.create({ data: { userId, title: "Build a 6-month emergency fund", horizon: "annual", importance: 4, metric: "Months of runway saved", unit: "months", startValue: 0, currentValue: 2, targetValue: 6, targetDate: daysFromNow(300), domainId: dom("finance") } });

  // Projects.
  const pAtlas = await prisma.project.create({ data: { userId, title: "Atlas OS v1", objective: "Ship the working spine.", successCriteria: "Dashboard answers 'what next?'.", status: "active", targetDate: daysFromNow(14), domainId: dom("career"), goalId: gAtlas.id } });
  const pMarathon = await prisma.project.create({ data: { userId, title: "Base training block", objective: "Build aerobic base to 12km.", successCriteria: "4 weeks without injury.", status: "active", targetDate: daysFromNow(30), domainId: dom("health"), goalId: gMarathon.id } });
  const pTax = await prisma.project.create({ data: { userId, title: "File annual taxes", objective: "Submit before the deadline.", successCriteria: "Return accepted.", status: "active", targetDate: daysFromNow(5), domainId: dom("finance") } });

  await prisma.task.createMany({
    data: [
      // Planned onto the planner (plannedDate set), assigned to members.
      { userId, title: "Finish the priority scoring engine", status: "in_progress", type: "important", impact: 5, urgency: 4, effortHours: 3, energy: "high", dueDate: daysFromNow(-1), progress: 60, plannedDate: planDay(0), domainId: dom("career"), projectId: pAtlas.id, goalId: gAtlas.id, responsibleId: mem("Demo User") },
      { userId, title: "Executive meeting", status: "scheduled", type: "meeting", impact: 4, urgency: 4, effortHours: 1.5, plannedDate: planDay(0), scheduledStart: at(0, 9, 30), scheduledEnd: at(0, 11, 0), domainId: dom("career"), responsibleId: mem("Demo User") },
      { userId, title: "Build the capacity engine", status: "scheduled", type: "operational", impact: 4, urgency: 3, effortHours: 2, energy: "high", dueDate: daysFromNow(1), progress: 20, plannedDate: planDay(0), domainId: dom("career"), projectId: pAtlas.id, goalId: gAtlas.id, responsibleId: mem("David Thomas") },
      { userId, title: "1-to-1 with Sofia", status: "scheduled", type: "meeting", impact: 3, urgency: 3, effortHours: 1, plannedDate: planDay(1), scheduledStart: at(1, 9, 0), scheduledEnd: at(1, 10, 0), domainId: dom("career"), responsibleId: mem("Marry Williams") },
      { userId, title: "12km long run", status: "scheduled", type: "operational", impact: 4, urgency: 3, effortHours: 2, energy: "high", energyType: "physical", dueDate: daysFromNow(2), plannedDate: planDay(1), domainId: dom("health"), projectId: pMarathon.id, goalId: gMarathon.id, responsibleId: mem("Marry Williams") },
      { userId, title: "Gather tax documents and file", status: "scheduled", type: "important", impact: 5, urgency: 5, effortHours: 4, dueDate: daysFromNow(4), plannedDate: planDay(1), domainId: dom("finance"), projectId: pTax.id, responsibleId: mem("Anastasia Novak") },
      { userId, title: "Prep quarterly review notes", status: "scheduled", type: "feedback", impact: 3, urgency: 3, effortHours: 1.5, dueDate: daysFromNow(6), plannedDate: planDay(2), domainId: dom("growth"), responsibleId: mem("Sofia Brown") },
      { userId, title: "Design drafts in 3 different styles", status: "scheduled", type: "design", impact: 4, urgency: 3, effortHours: 3, plannedDate: planDay(2), domainId: dom("career"), responsibleId: mem("Michael Martinez") },

      // Waiting list (no plannedDate, status new).
      { userId, title: "Read 30 pages of current book", status: "new", type: "operational", impact: 2, urgency: 2, effortHours: 1, energy: "low", domainId: dom("learning"), goalId: gRead.id, responsibleId: mem("Demo User") },
      { userId, title: "Call mom", status: "new", type: "operational", impact: 3, urgency: 3, effortHours: 0.5, energy: "low", energyType: "emotional", dueDate: daysFromNow(1), domainId: dom("relationships"), responsibleId: mem("Marry Williams") },
      { userId, title: "Refactor the legacy auth module", status: "new", type: "operational", impact: 3, urgency: 2, effortHours: 5, energy: "high", domainId: dom("career"), responsibleId: mem("David Thomas") },
      { userId, title: "Write meta title & meta description for each page", status: "new", type: "operational", impact: 3, urgency: 3, effortHours: 1.5, domainId: dom("career"), responsibleId: mem("Anastasia Novak") },

      // Completed.
      { userId, title: "Outline the data model", status: "completed", type: "operational", impact: 4, urgency: 3, effortHours: 2, progress: 100, actualHours: 2.5, completedAt: daysFromNow(-2), plannedDate: planDay(-2), domainId: dom("career"), projectId: pAtlas.id, goalId: gAtlas.id, responsibleId: mem("Demo User") },
    ],
  });

  console.log(`Seed complete: ${domains.length} domains, demo user (${DEMO_EMAIL} / ${DEMO_PASSWORD}), 6 members, 5 goals, 3 projects, 13 tasks.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
