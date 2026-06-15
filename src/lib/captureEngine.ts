// Atlas Capture Engine — deterministic parser, zero external dependencies.
// Pure TypeScript using only built-in string and Date methods.

export type ParsedTask = {
  title: string;
  dueDate: string | null; // "YYYY-MM-DD"
  scheduledAt: string | null; // "YYYY-MM-DDTHH:MM:00"
  duration: number | null; // minutes
  priority: "low" | "medium" | "high" | null;
  domain: string | null;
  recurrence: "daily" | "weekly" | "monthly" | null;
};

// ── 2A helpers ────────────────────────────────────────────────────────────────

const ACTION_VERBS = [
  "send","write","call","book","schedule","review","prepare","update","finish",
  "complete","submit","create","build","fix","check","buy","pay","email","meet",
  "draft","edit","research","plan","read","follow up","reach out","confirm",
  "set up","organise","organize","share","upload","download","order","cancel",
  "renew","register","apply","file","clean","cook","workout","run","gym","study",
  "practice","learn","watch","sign","approve","merge","deploy","test","push",
  "commit","design","sketch","record","track","add","remove","reply","respond",
  "attend","present","pitch","discuss","decide","note","invoice","ship","launch",
  "brief","message","ping","dm","post","publish",
];

function hasActionVerb(s: string): boolean {
  const lower = s.toLowerCase();
  return ACTION_VERBS.some((v) => lower.includes(v));
}

const SPLIT_CONNECTORS = /\band then\b|\balso\b|\bafter that\b|\bthen\b/gi;

function splitChunks(input: string): string[] {
  const results: string[] = [];

  // 1. Split on newlines
  const lines = input.split(/\n+/);

  for (const line of lines) {
    // 2. Split on list markers at start or after whitespace
    const withBullets = line.split(/(?:^|\s)[-•*·–—]\s+/);

    for (const bulletChunk of withBullets) {
      // 3. Split on numbered patterns at start
      const withNumbers = bulletChunk.split(/(?:^|\s)\d+[.)]\s+|(?:^|\s)[a-e][)]\s+/);

      for (const numChunk of withNumbers) {
        // 4. Split on connectors only when both sides have an action verb
        const connectorParts = numChunk.split(SPLIT_CONNECTORS);
        if (connectorParts.length > 1) {
          for (const part of connectorParts) {
            const t = part.trim();
            if (t.split(/\s+/).length >= 3 && hasActionVerb(t)) results.push(t);
          }
        } else {
          const t = numChunk.trim();
          if (t.split(/\s+/).length >= 3) results.push(t);
        }
      }
    }
  }

  return results.map((s) => s.trim()).filter((s) => s.length > 0);
}

// ── 2B title cleanup ──────────────────────────────────────────────────────────

const STRIP_PREFIXES = [
  /^i need to\s+/i, /^i have to\s+/i, /^i should\s+/i, /^make sure to\s+/i,
  /^don'?t forget to\s+/i, /^remember to\s+/i, /^need to\s+/i, /^have to\s+/i,
  /^should\s+/i, /^must\s+/i, /^gotta\s+/i, /^gonna\s+/i,
];

function stripPrefixes(s: string): string {
  let result = s;
  for (const re of STRIP_PREFIXES) {
    result = result.replace(re, "");
  }
  return result.trim();
}

function buildTitle(original: string, stripsToRemove: string[]): string {
  let t = original;
  for (const strip of stripsToRemove) {
    if (!strip) continue;
    t = t.replace(new RegExp(strip.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  t = stripPrefixes(t);
  t = t
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:.–-]+/, "")
    .replace(/[\s,;:.–-]+$/, "")
    .trim();
  if (t.split(/\s+/).length < 2) t = original.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ── 2C date parsing ───────────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5,
  saturday: 6, sat: 6,
};
const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8,
  sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function pad2(n: number): string { return String(n).padStart(2, "0"); }

function zeroTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDaysToDate(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return zeroTime(x);
}

function nextWeekday(from: Date, target: number, strictlyAfter = false): Date {
  const d = zeroTime(from);
  let diff = (target - d.getDay() + 7) % 7;
  if (diff === 0 && strictlyAfter) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function mondayOfNextWeek(from: Date): Date {
  const d = zeroTime(from);
  const daysUntilNextMon = ((1 - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + daysUntilNextMon);
  return d;
}

function lastDayOfMonth(d: Date): Date {
  return zeroTime(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

type DateResult = { date: Date | null; strips: string[]; isDue: boolean };

function extractDate(text: string, ref: Date): DateResult {
  const lower = text.toLowerCase();
  const strips: string[] = [];
  let isDue = false;

  // Deadline phrases
  const dueMatch = lower.match(/\b(?:by|before|due(?:\s+by)?|deadline|no later than|submit by)\b/);
  if (dueMatch) isDue = true;

  function ret(d: Date | null, ...s: string[]): DateResult {
    strips.push(...s.filter(Boolean));
    return { date: d, strips, isDue };
  }

  let m: RegExpMatchArray | null;

  // Relative keywords
  if ((m = lower.match(/\b(today|tonight|this evening|eod)\b/)))   return ret(zeroTime(ref), m[0]);
  if ((m = lower.match(/\btomorrow\b|\btmrw\b|\btmr\b/)))          return ret(addDaysToDate(ref, 1), m[0]);
  if ((m = lower.match(/\bday after tomorrow\b/)))                  return ret(addDaysToDate(ref, 2), m[0]);
  if ((m = lower.match(/\byesterday\b/)))                           return ret(addDaysToDate(ref, -1), m[0]);
  if ((m = lower.match(/\bnext week\b/)))                           return ret(mondayOfNextWeek(ref), m[0]);
  if ((m = lower.match(/\bthis weekend\b/)))                        return ret(nextWeekday(ref, 6), m[0]);
  if ((m = lower.match(/\b(?:end of week|eow)\b/)))                 return ret(nextWeekday(ref, 5), m[0]);
  if ((m = lower.match(/\b(?:end of month|eom)\b/)))                return ret(lastDayOfMonth(ref), m[0]);
  if ((m = lower.match(/\bnext month\b/))) {
    const d = new Date(ref.getFullYear(), ref.getMonth() + 1, ref.getDate());
    return ret(zeroTime(d), m[0]);
  }

  // "next [weekday]"
  if ((m = lower.match(/\bnext\s+(sun|mon|tue|tues|wed|thu|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
    return ret(nextWeekday(ref, WEEKDAY_MAP[m[1]], true), m[0]);
  }

  // "this [weekday]"
  if ((m = lower.match(/\bthis\s+(sun|mon|tue|tues|wed|thu|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
    const target = WEEKDAY_MAP[m[1]];
    const d = nextWeekday(ref, target);
    return ret(d, m[0]);
  }

  // Bare weekday name
  if ((m = lower.match(/\b(on\s+)?(sun|mon|tue|tues|wed|thu|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
    const target = WEEKDAY_MAP[m[2]];
    // If today is that weekday or it hasn't arrived yet this week → this week; else next week
    const d = nextWeekday(ref, target, ref.getDay() === target);
    return ret(d, m[0]);
  }

  // "Month Day" e.g. "June 15", "Jun 15"
  const monthNames = Object.keys(MONTH_MAP).join("|");
  const mndRe = new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(?:20)?(\\d{2,4}))?\\b`, "i");
  if ((m = lower.match(mndRe))) {
    const mo = MONTH_MAP[m[1].toLowerCase()];
    const day = Number(m[2]);
    const yr = m[3] ? (m[3].length <= 2 ? 2000 + Number(m[3]) : Number(m[3])) : ref.getFullYear();
    let d = new Date(yr, mo, day);
    if (zeroTime(d) < zeroTime(ref) && !m[3]) d = new Date(yr + 1, mo, day);
    return ret(zeroTime(d), m[0]);
  }

  // "Day Month" e.g. "15 June", "15th June"
  const dmnRe = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\.?(?:\\s+(?:20)?(\\d{2,4}))?\\b`, "i");
  if ((m = lower.match(dmnRe))) {
    const day = Number(m[1]);
    const mo = MONTH_MAP[m[2].toLowerCase()];
    const yr = m[3] ? (m[3].length <= 2 ? 2000 + Number(m[3]) : Number(m[3])) : ref.getFullYear();
    let d = new Date(yr, mo, day);
    if (zeroTime(d) < zeroTime(ref) && !m[3]) d = new Date(yr + 1, mo, day);
    return ret(zeroTime(d), m[0]);
  }

  // ISO: 2026-06-15
  if ((m = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) {
    return ret(zeroTime(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))), m[0]);
  }

  // Slash: 6/15 or 15/6
  if ((m = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const yr = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : ref.getFullYear();
    const d = new Date(yr, Number(m[1]) - 1, Number(m[2]));
    return ret(zeroTime(d), m[0]);
  }

  return { date: null, strips: [], isDue: false };
}

// ── Time extraction ───────────────────────────────────────────────────────────

type TimeResult = { hour: number; minute: number; strip: string; keyword?: string } | null;

function extractTime(text: string): TimeResult {
  const lower = text.toLowerCase();

  const named: Record<string, [number, number]> = {
    "morning": [9, 0], "am": [9, 0],
    "afternoon": [14, 0],
    "evening": [19, 0], "tonight": [19, 0],
    "night": [21, 0],
    "noon": [12, 0], "midday": [12, 0],
    "midnight": [0, 0],
  };
  for (const [kw, [h, mn]] of Object.entries(named)) {
    const re = new RegExp(`\\b${kw}\\b`, "i");
    const m = lower.match(re);
    if (m) return { hour: h, minute: mn, strip: m[0], keyword: kw };
  }

  // Explicit times: 3pm, 3:30pm, 15:00, at 3, @ 3
  let m: RegExpMatchArray | null;
  m = lower.match(/\b(?:at\s+|@\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m) {
    let h = Number(m[1]);
    const mn = m[2] ? Number(m[2]) : 0;
    const ap = m[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { hour: h, minute: mn, strip: m[0] };
  }

  m = lower.match(/\b(?:at|@)\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (m) {
    let h = Number(m[1]);
    const mn = m[2] ? Number(m[2]) : 0;
    // "at X" without am/pm: ≤8 → AM, else PM
    if (h <= 8) { /* already AM */ } else if (h < 12) h += 12; // 9-11 → PM
    return { hour: h, minute: mn, strip: m[0] };
  }

  m = lower.match(/\b(\d{2}):(\d{2})\b/);
  if (m) {
    const h = Number(m[1]); const mn = Number(m[2]);
    if (h <= 23 && mn <= 59) return { hour: h, minute: mn, strip: m[0] };
  }

  return null;
}

// ── 2D duration parsing ───────────────────────────────────────────────────────

function extractDuration(text: string): { minutes: number; strip: string } | null {
  const lower = text.toLowerCase();
  let m: RegExpMatchArray | null;

  // "X and a half hours"
  if ((m = lower.match(/\b(\d+)\s+and\s+a\s+half\s+hours?\b/))) return { minutes: Number(m[1]) * 60 + 30, strip: m[0] };
  if ((m = lower.match(/\bhalf\s+an?\s+hours?\b|\bhalf\s+hours?\b/)))            return { minutes: 30, strip: m[0] };
  if ((m = lower.match(/\bquarter\s+(?:of\s+an?\s+)?hours?\b/)))                 return { minutes: 15, strip: m[0] };
  if ((m = lower.match(/\ba\s+couple\s+(?:of\s+)?hours?\b/)))                    return { minutes: 120, strip: m[0] };
  if ((m = lower.match(/\ba\s+few\s+hours?\b/)))                                 return { minutes: 180, strip: m[0] };
  if ((m = lower.match(/\ball\s+day\b/)))                                        return { minutes: 480, strip: m[0] };

  // "for X hours/mins" / "about X hours" / "takes X hours"
  if ((m = lower.match(/\b(?:for|about|takes?)\s+(\d+(?:\.\d+)?)\s*(?:h(?:r|rs|ours?)?)\b/)))  return { minutes: Math.round(Number(m[1]) * 60), strip: m[0] };
  if ((m = lower.match(/\b(?:for|about|takes?)\s+(\d+)\s*(?:m(?:in|ins|inutes?)?)\b/)))         return { minutes: Number(m[1]), strip: m[0] };

  // Raw "Xh" or "X hours"
  if ((m = lower.match(/\((\d+(?:\.\d+)?)\s*h(?:r|rs|ours?)?\)/)))              return { minutes: Math.round(Number(m[1]) * 60), strip: m[0] };
  if ((m = lower.match(/\b(\d+(?:\.\d+)?)\s*h(?:r|rs|ours?)?\b/)))             return { minutes: Math.round(Number(m[1]) * 60), strip: m[0] };
  if ((m = lower.match(/\b(\d+)\s*m(?:in|ins|inutes?)?\b/)))                    return { minutes: Number(m[1]), strip: m[0] };

  // Implied durations
  const implied: [RegExp, number][] = [
    [/\bquick\s+(?:call|chat|sync)\b/i, 30],
    [/\bstand[\s-]?up\b|\bdaily\s+standup\b/i, 15],
    [/\blunch(?:\s+meeting)?\b/i, 60],
    [/\bworkshop\b/i, 180],
    [/\breview\s+session\b/i, 60],
    [/\bmeeting\b/i, 60],
    [/\bcall\b/i, 30],
  ];
  for (const [re, mins] of implied) {
    if (re.test(lower)) return { minutes: mins, strip: "" };
  }

  return null;
}

// ── 2E priority parsing ───────────────────────────────────────────────────────

function extractPriority(text: string): "low" | "medium" | "high" | null {
  const lower = text.toLowerCase();
  if (/\b(?:urgent|asap|!!!|!!|immediately|critical|must|crucial|top priority|p0|p1|high[\s-]priority)\b/.test(lower)) return "high";
  if (/\b(?:soon|this week|p2|medium[\s-]priority|should)\b/.test(lower)) return "medium";
  if (/\b(?:eventually|someday|nice to have|low[\s-]priority|p3|when i have time|if possible|maybe|could)\b/.test(lower)) return "low";
  return null;
}

// ── 2F domain inference ───────────────────────────────────────────────────────

const DOMAIN_KEYWORD_MAP: Record<string, string[]> = {
  Career: ["work","job","meeting","client","project","proposal","report","presentation",
           "interview","email","slack","deadline","sprint","deliverable","boss","manager",
           "team","office","invoice","revenue","pitch","brief","ship","launch"],
  Finance: ["pay","payment","invoice","bill","tax","budget","bank","transfer","rent","emi",
            "loan","invest","portfolio","expense","salary","fee","cost","money","₹","$","€"],
  Health: ["gym","workout","run","exercise","doctor","appointment","medicine","health",
           "yoga","walk","sleep","diet","meal prep","physio","dental","therapy","checkup"],
  Learning: ["study","read","book","course","learn","practice","tutorial","class","lecture",
             "notes","research","skill"],
  "Personal Growth": ["journal","meditate","reflect","habit","goal","vision","plan","affirmation"],
  Family: ["family","parents","mom","dad","sibling","kids","home","visit","birthday","anniversary"],
  Relationships: ["friend","catch up","coffee","date","partner","girlfriend","boyfriend","spouse","social","hang out"],
  Home: ["clean","repair","fix","grocery","laundry","cook","organise","organize","declutter","maintenance","furniture"],
  Travel: ["flight","hotel","trip","travel","pack","passport","visa","ticket","itinerary","vacation","holiday"],
  Recreation: ["movie","game","show","series","watch","play","hobby","music","art","draw"],
};

const DOMAIN_TIE_ORDER = ["Career","Finance","Health","Learning"];

function inferDomain(text: string, userDomains: string[]): string | null {
  const lower = text.toLowerCase();

  // Exact match against user domain names first
  for (const d of userDomains) {
    if (lower.includes(d.toLowerCase())) return d;
  }

  // Keyword scoring
  const scores: Record<string, number> = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORD_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) scores[domain] = score;
  }

  if (Object.keys(scores).length === 0) return null;

  const maxScore = Math.max(...Object.values(scores));
  const winners = Object.keys(scores).filter((k) => scores[k] === maxScore);
  if (winners.length === 1) return winners[0];

  // Tie-break by priority order
  for (const pref of DOMAIN_TIE_ORDER) {
    if (winners.includes(pref)) return pref;
  }
  return winners[0];
}

// ── 2G recurrence parsing ─────────────────────────────────────────────────────

function extractRecurrence(text: string): { recurrence: "daily" | "weekly" | "monthly" | null; strip: string } {
  const lower = text.toLowerCase();
  let m: RegExpMatchArray | null;

  if ((m = lower.match(/\b(?:every\s+day|daily|each\s+day|every\s+morning|every\s+night|every\s+evening)\b/)))
    return { recurrence: "daily", strip: m[0] };
  if ((m = lower.match(/\b(?:every\s+week|weekly|each\s+week|every\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun))\b/)))
    return { recurrence: "weekly", strip: m[0] };
  if ((m = lower.match(/\b(?:every\s+month|monthly|each\s+month)\b/)))
    return { recurrence: "monthly", strip: m[0] };

  return { recurrence: null, strip: "" };
}

// ── 2H noise filtering ────────────────────────────────────────────────────────

const NOISE_STARTS = /^(?:hi|hello|hey|dear|thanks|thank you|regards|cheers|sincerely|best|greetings)\b/i;

function isNoise(chunk: string): boolean {
  if (NOISE_STARTS.test(chunk.trim())) return true;
  if (chunk.trim().endsWith("?") && !hasActionVerb(chunk)) return true;
  if (!hasActionVerb(chunk)) return true;
  if (chunk.trim().split(/\s+/).length < 2) return true;
  return false;
}

// ── 2I deduplication ──────────────────────────────────────────────────────────

const STOP_WORDS = new Set(["the","a","an","to","for","of","in","on","at","by","and","or","is","it","my","me","i","we"]);

function titleWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}

function deduplicate(tasks: ParsedTask[]): ParsedTask[] {
  const result: ParsedTask[] = [];
  for (const task of tasks) {
    const words = titleWords(task.title);
    const isDup = result.some((existing) => overlap(titleWords(existing.title), words) >= 0.7);
    if (!isDup) result.push(task);
  }
  return result;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseCapture(
  input: string,
  referenceDate: Date,
  userDomains: string[],
): ParsedTask[] {
  const chunks = splitChunks(input);
  const tasks: ParsedTask[] = [];

  for (const chunk of chunks) {
    if (isNoise(chunk)) continue;

    // Parse components
    const { date, strips: dateStrips, isDue } = extractDate(chunk, referenceDate);
    const timeResult = extractTime(chunk);
    const durResult = extractDuration(chunk);
    const priority = extractPriority(chunk);
    const domain = inferDomain(chunk, userDomains);
    const { recurrence, strip: recurrenceStrip } = extractRecurrence(chunk);

    // Build strips list for title cleaning
    const allStrips: string[] = [
      ...dateStrips,
      timeResult?.strip ?? "",
      durResult?.strip ?? "",
      recurrenceStrip,
    ].filter(Boolean);

    // Build priority strips
    const priorityStrip = chunk.match(/\b(?:urgent|asap|!!!|!!|immediately|critical|must|crucial|top priority|p0|p1|high[\s-]priority|soon|p2|medium[\s-]priority|eventually|someday|nice to have|low[\s-]priority|p3|when i have time|if possible|maybe|could)\b/gi);
    if (priorityStrip) allStrips.push(...priorityStrip);

    const title = buildTitle(chunk, allStrips);
    if (title.replace(/[^a-z0-9]/gi, "").length < 2) continue;

    // Compute scheduledAt
    let scheduledAt: string | null = null;
    let dueDate: string | null = null;

    if (date) {
      if (isDue) {
        dueDate = toYMD(date);
      } else if (timeResult) {
        // Has explicit date + time → scheduled
        const s = new Date(date);
        s.setHours(timeResult.hour, timeResult.minute, 0, 0);
        scheduledAt = `${s.getFullYear()}-${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}T${pad2(s.getHours())}:${pad2(s.getMinutes())}:00`;
      } else {
        // Date only, no explicit time — check for deadline keyword
        dueDate = toYMD(date);
      }
    } else if (timeResult) {
      // Time with no date → today if future, tomorrow if past
      const now = referenceDate;
      let d = new Date(now);
      d.setHours(timeResult.hour, timeResult.minute, 0, 0);
      if (d <= now) d = addDaysToDate(now, 1);
      scheduledAt = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
    }

    tasks.push({
      title: title.slice(0, 200),
      dueDate,
      scheduledAt,
      duration: durResult?.minutes ?? null,
      priority,
      domain,
      recurrence,
    });
  }

  return deduplicate(tasks);
}
