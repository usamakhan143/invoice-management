import { DateTime } from "luxon";
import { formatLocalDayKey, parseLocalDayKey } from "./localDayKey";

/** Used only by dashboard “My call activity” — not global app calendar. */
export type MyCallActivityWorkdaySettings = {
  /** When false, day bounds use the viewer’s local calendar (legacy). */
  useBusinessWorkday: boolean;
  /** IANA zone, e.g. Asia/Karachi */
  timezone: string;
  workdayStartHour: number;
  workdayStartMinute: number;
  workdayEndHour: number;
  workdayEndMinute: number;
};

/** Default: overnight sales window (6 PM → 3 AM) in Asia/Karachi. Owner can turn off in Profile. */
export const DEFAULT_MY_CALL_ACTIVITY_WORKDAY_SETTINGS: MyCallActivityWorkdaySettings = {
  useBusinessWorkday: true,
  timezone: "Asia/Karachi",
  workdayStartHour: 18,
  workdayStartMinute: 0,
  workdayEndHour: 3,
  workdayEndMinute: 0,
};

/** IANA zones for datalist hints (Profile + dashboard). */
export const MY_CALL_ACTIVITY_COMMON_TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Europe/London",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

export function canManageCompanyWorkdaySettings(user: {
  isOwner?: boolean;
  role?: string;
} | null): boolean {
  if (!user) return false;
  if (user.isOwner === true) return true;
  return user.role === "admin";
}

export function mergeMyCallActivityWorkdaySettings(
  raw: Partial<MyCallActivityWorkdaySettings> | null | undefined,
): MyCallActivityWorkdaySettings {
  const base = DEFAULT_MY_CALL_ACTIVITY_WORKDAY_SETTINGS;
  const r = raw ?? {};
  return {
    ...base,
    ...r,
    timezone: (r.timezone ?? base.timezone).trim() || "UTC",
    /** Do not use `Boolean(raw?.x)` — that forces false when the Firestore field is missing. */
    useBusinessWorkday: r.useBusinessWorkday ?? base.useBusinessWorkday,
    workdayStartHour: clampHour(r.workdayStartHour ?? base.workdayStartHour),
    workdayStartMinute: clampMin(r.workdayStartMinute ?? base.workdayStartMinute),
    workdayEndHour: clampHour(r.workdayEndHour ?? base.workdayEndHour),
    workdayEndMinute: clampMin(r.workdayEndMinute ?? base.workdayEndMinute),
  };
}

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(23, Math.floor(n)));
}

function clampMin(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(59, Math.floor(n)));
}

function parseAnchorDayKey(dayKey: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

/**
 * Half-open window [start, endExclusive) in UTC for the business “anchor” date
 * (the calendar date the shift opens on in `settings.timezone`).
 * Overnight: if wall-clock end ≤ start on that anchor day, end is moved to the next calendar day.
 */
export function resolveMyCallActivityWorkdayWindow(
  anchorDayKey: string,
  settings: MyCallActivityWorkdaySettings,
): { start: Date; endExclusive: Date } | null {
  if (!settings.useBusinessWorkday) return null;
  const parsed = parseAnchorDayKey(anchorDayKey);
  if (!parsed) return null;
  const zone = settings.timezone.trim() || "UTC";

  let start = DateTime.fromObject(
    {
      year: parsed.y,
      month: parsed.m,
      day: parsed.d,
      hour: settings.workdayStartHour,
      minute: settings.workdayStartMinute,
      second: 0,
      millisecond: 0,
    },
    { zone },
  );
  if (!start.isValid) return null;

  let end = DateTime.fromObject(
    {
      year: parsed.y,
      month: parsed.m,
      day: parsed.d,
      hour: settings.workdayEndHour,
      minute: settings.workdayEndMinute,
      second: 0,
      millisecond: 0,
    },
    { zone },
  );
  if (!end.isValid) return null;

  if (end <= start) {
    end = end.plus({ days: 1 });
  }

  return {
    start: start.toUTC().toJSDate(),
    endExclusive: end.toUTC().toJSDate(),
  };
}

/** Which anchor YYYY-MM-DD (in business TZ) owns this instant for workday bucketing. */
export function getMyCallActivityBusinessDayKeyForInstant(
  instant: Date,
  settings: MyCallActivityWorkdaySettings,
): string {
  if (!settings.useBusinessWorkday) {
    return formatLocalDayKey(instant);
  }
  const zone = settings.timezone.trim() || "UTC";
  const t = DateTime.fromJSDate(instant, { zone: "utc" }).setZone(zone);
  const iso = t.toISODate();
  if (!iso) return formatLocalDayKey(instant);

  const candidates = [
    t.minus({ days: 1 }).toISODate(),
    iso,
    t.plus({ days: 1 }).toISODate(),
  ].filter((x): x is string => Boolean(x));

  const uniq = [...new Set(candidates)];
  const u = instant.getTime();

  for (const anchor of uniq) {
    const w = resolveMyCallActivityWorkdayWindow(anchor, settings);
    if (!w) continue;
    if (u >= w.start.getTime() && u < w.endExclusive.getTime()) {
      return anchor;
    }
  }

  return iso;
}

/** Legacy local-calendar bounds (browser timezone) for `<input type="date">` dayKey. */
export function localCalendarDayBoundsForDayKey(dayKey: string): { start: Date; endExclusive: Date } | null {
  const d = parseLocalDayKey(dayKey);
  if (!d) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endExclusive = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return { start, endExclusive };
}

/**
 * Previous “anchor” day for comparing today vs yesterday in dashboard call stats.
 * Local mode: previous calendar day in the browser timezone. Business mode: previous calendar day in company TZ.
 */
export function getPreviousMyCallActivityAnchorDayKey(
  anchorDayKey: string,
  settings: MyCallActivityWorkdaySettings,
): string | null {
  const merged = mergeMyCallActivityWorkdaySettings(settings);
  if (!merged.useBusinessWorkday) {
    const d = parseLocalDayKey(anchorDayKey);
    if (!d) return null;
    const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    return formatLocalDayKey(prev);
  }
  const zone = merged.timezone.trim() || "UTC";
  const dt = DateTime.fromISO(anchorDayKey.trim(), { zone });
  if (!dt.isValid) return null;
  const prev = dt.minus({ days: 1 }).toISODate();
  return prev ?? null;
}
