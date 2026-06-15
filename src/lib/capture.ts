// Atlas Capture parser — turns freeform text into structured, scheduled,
// categorized tasks. Deterministic/heuristic so it runs with no API key; the
// `parseCapture` seam can be swapped for an LLM call later without touching the UI.

export interface ParsedTask {
  title: string;
  dueDate: string | null; // YYYY-MM-DD
  plannedDate: string | null; // YYYY-MM-DD (lands on the planner)
  startISO: string | null; // specific time block
  endISO: string | null;
  effortHours: number;
  domainKey: string | null;
  type: string; // operational | important | design | feedback | meeting
  urgency: number;
  impact: number;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
};
const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
  jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  health: ["dentist", "doctor", "gym", "run", "workout", "exercise", "yoga", "therapy", "medical", "health", "sleep", "meditate"],
  finance: ["tax", "taxes", "invoice", "budget", "pay ", "bill", "rent", "salary", "expense", "bank", "finance", "refund", "payroll"],
  family: ["mom", "dad", "family", "kids", "wife", "husband", "son", "daughter", "parents", "anniversary"],
  relationships: ["call ", "catch up", "coffee with", "lunch with", "dinner with", "birthday", "friend"],
  career: ["report", "deploy", "code", "bug", "deck", "slides", "presentation", "proposal", "client", "ship ", "release", "review", "interview", "standup", "1:1", "sync", "ticket", "pr ", "merge"],
  learning: ["read", "book", "course", "study", "learn", "research", "article", "tutorial"],
  home: ["clean", "laundry", "groceries", "fix", "repair", "buy ", "order ", "house", "apartment"],
  travel: ["flight", "hotel", "trip", "travel", "book a", "reservation", "visa", "passport"],
};

const TYPE_KEYWORDS: Record<string, string[]> = {
  meeting: ["meeting", "sync", "1:1", "call", "standup", "interview", "huddle", "catch up", "chat with"],
  design: ["design", "mockup", "wireframe", "prototype", "ui ", "ux "],
  feedback: ["review", "feedback", "comment on", "proofread"],
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nextWeekday(from: Date, target: number, allowToday = true): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  let diff = (target - d.getDay() + 7) % 7;
  if (diff === 0 && !allowToday) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

// Returns the matched date + the substring(s) to strip from the title.
function extractDate(text: string, now: Date): { date: Date | null; strip: string[] } {
  const strip: string[] = [];
  const lower = text.toLowerCase();
  const make = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  let m: RegExpMatchArray | null;

  if ((m = lower.match(/\btomorrow\b/))) { strip.push(m[0]); return { date: make(new Date(now.getTime() + 86400000)), strip }; }
  if ((m = lower.match(/\b(today|tonight|tonite|eod|end of day)\b/))) { strip.push(m[0]); return { date: make(now), strip }; }
  if ((m = lower.match(/\bin (\d{1,2}) days?\b/))) { strip.push(m[0]); return { date: make(new Date(now.getTime() + Number(m[1]) * 86400000)), strip }; }
  if ((m = lower.match(/\bnext week\b/))) { strip.push(m[0]); return { date: nextWeekday(now, 1, false), strip }; }
  if ((m = lower.match(/\bthis weekend\b/))) { strip.push(m[0]); return { date: nextWeekday(now, 6), strip }; }
  if ((m = lower.match(/\bnext (sun|mon|tue|tues|wed|thu|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
    strip.push(m[0]);
    return { date: new Date(nextWeekday(now, WEEKDAYS[m[1]], false).getTime() + 7 * 86400000), strip };
  }
  if ((m = lower.match(/\b(?:on |by |due |this )?(sun|mon|tue|tues|wed|thu|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
    strip.push(m[0]);
    return { date: nextWeekday(now, WEEKDAYS[m[1]], false), strip };
  }
  // Month name + day, or day + month
  if ((m = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+(\d{1,2})\b/))) {
    strip.push(m[0]);
    const d = new Date(now.getFullYear(), MONTHS[m[1]], Number(m[2]));
    if (d < make(now)) d.setFullYear(d.getFullYear() + 1);
    return { date: make(d), strip };
  }
  if ((m = lower.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/))) {
    strip.push(m[0]);
    const d = new Date(now.getFullYear(), MONTHS[m[2]], Number(m[1]));
    if (d < make(now)) d.setFullYear(d.getFullYear() + 1);
    return { date: make(d), strip };
  }
  // ISO or slash date
  if ((m = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) { strip.push(m[0]); return { date: make(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))), strip }; }
  if ((m = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    strip.push(m[0]);
    const yr = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : now.getFullYear();
    return { date: make(new Date(yr, Number(m[1]) - 1, Number(m[2]))), strip };
  }
  return { date: null, strip };
}

function extractTime(text: string): { hour: number; minute: number; strip: string } | null {
  const lower = text.toLowerCase();
  if (/\bnoon\b/.test(lower)) return { hour: 12, minute: 0, strip: "noon" };
  if (/\bmidnight\b/.test(lower)) return { hour: 0, minute: 0, strip: "midnight" };
  const m = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const ap = m[3];
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, strip: m[0] };
}

function extractDuration(text: string): { hours: number; strip: string } | null {
  const lower = text.toLowerCase();
  let m: RegExpMatchArray | null;
  if ((m = lower.match(/\(\s*(\d+(?:\.\d+)?)\s*h\s*\)/))) return { hours: Number(m[1]), strip: m[0] };
  if ((m = lower.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/))) return { hours: Number(m[1]), strip: m[0] };
  if ((m = lower.match(/\bfor\s+(\d+)\s*(?:m|min|mins|minute|minutes)\b/))) return { hours: Number(m[1]) / 60, strip: m[0] };
  if ((m = lower.match(/\b(\d+(?:\.\d+)?)\s*(?:hr|hrs|hours)\b/))) return { hours: Number(m[1]), strip: m[0] };
  if ((m = lower.match(/\b(\d+)\s*(?:mins|minutes)\b/))) return { hours: Number(m[1]) / 60, strip: m[0] };
  return null;
}

function guess<T extends string>(text: string, map: Record<string, string[]>): string | null {
  const lower = " " + text.toLowerCase() + " ";
  for (const [key, words] of Object.entries(map)) {
    if (words.some((w) => lower.includes(w))) return key;
  }
  return null;
}

function cleanTitle(raw: string, strips: string[]): string {
  let t = raw;
  for (const s of strips) {
    if (!s) continue;
    t = t.replace(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
  }
  t = t
    .replace(/^[\s\-*•\d.)\]]+/, "")
    .replace(/\b(remember to|don'?t forget to|i (need|have) to|make sure to|todo:?|task:?|please|gotta|need to)\b/gi, "")
    .replace(/\b(asap|urgent|important|high[- ]priority|critical)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;:–-]+$/g, "")
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Split a brain dump into individual actions. Breaks on line breaks, list
// markers, semicolons, and natural connectors (", and", " and ", " then ").
function splitSegments(text: string): string[] {
  return text
    .split(/\n+|•|;|\s*,\s*(?:and\s+)?|\s+and\s+then\s+|\s+then\s+|\s+and\s+/gi)
    .map((s) => s.replace(/^[\s\-*•\d.)\]]+/, "").trim())
    .filter((s) => s.length > 2 && !/^(also|plus|finally|next)$/i.test(s));
}

export function parseCapture(text: string, now: Date = new Date()): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  for (const seg of splitSegments(text)) {
    const { date, strip: dateStrip } = extractDate(seg, now);
    const time = extractTime(seg);
    const dur = extractDuration(seg);
    const isImportant = /\b(asap|urgent|important|high[- ]priority|critical)\b/i.test(seg);
    const domainKey = guess(seg, DOMAIN_KEYWORDS);
    const typeKey = guess(seg, TYPE_KEYWORDS) ?? (isImportant ? "important" : "operational");

    const strips = [...dateStrip];
    if (time) strips.push(time.strip);
    if (dur) strips.push(dur.strip);
    const title = cleanTitle(seg, strips);
    // Skip fragments that clean to nothing (e.g. a trailing "urgent").
    if (title.replace(/[^a-z0-9]/gi, "").length < 2) continue;

    const effortHours = dur ? Math.round(dur.hours * 100) / 100 : typeKey === "meeting" ? 1 : 0.5;

    let startISO: string | null = null;
    let endISO: string | null = null;
    if (date && time) {
      const start = new Date(date);
      start.setHours(time.hour, time.minute, 0, 0);
      const end = new Date(start.getTime() + effortHours * 3600000);
      startISO = start.toISOString();
      endISO = end.toISOString();
    }

    tasks.push({
      title: title.slice(0, 200),
      dueDate: date ? ymd(date) : null,
      plannedDate: date ? ymd(date) : null,
      startISO,
      endISO,
      effortHours,
      domainKey,
      type: typeKey,
      urgency: isImportant ? 5 : 3,
      impact: isImportant ? 5 : 3,
    });
  }
  return tasks;
}
