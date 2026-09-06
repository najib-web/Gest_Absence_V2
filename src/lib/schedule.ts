// Shared weekly schedule logic: days Lundi→Samedi, time slots 8h→18h,
// current-session detection based on system date/time.

export interface TimeSlotDef {
  id: number;
  startMin: number; // minutes since midnight
  endMin: number;
}

// 5 créneaux de 2h couvrant exactement 08:00 → 18:00
export const TIME_SLOTS: TimeSlotDef[] = [
  { id: 1, startMin: 8 * 60, endMin: 10 * 60 },  // 08:00 - 10:00
  { id: 2, startMin: 10 * 60, endMin: 12 * 60 }, // 10:00 - 12:00
  { id: 3, startMin: 12 * 60, endMin: 14 * 60 }, // 12:00 - 14:00
  { id: 4, startMin: 14 * 60, endMin: 16 * 60 }, // 14:00 - 16:00
  { id: 5, startMin: 16 * 60, endMin: 18 * 60 }, // 16:00 - 18:00
];

export const DAY_NAMES: { dow: number; fr: string; ar: string; frShort: string; arShort: string }[] = [
  { dow: 1, fr: "Lundi", ar: "الاثنين", frShort: "Lun", arShort: "الإثنين" },
  { dow: 2, fr: "Mardi", ar: "الثلاثاء", frShort: "Mar", arShort: "الثلاثاء" },
  { dow: 3, fr: "Mercredi", ar: "الأربعاء", frShort: "Mer", arShort: "الأربعاء" },
  { dow: 4, fr: "Jeudi", ar: "الخميس", frShort: "Jeu", arShort: "الخميس" },
  { dow: 5, fr: "Vendredi", ar: "الجمعة", frShort: "Ven", arShort: "الجمعة" },
  { dow: 6, fr: "Samedi", ar: "السبت", frShort: "Sam", arShort: "السبت" },
];

/** Convert minutes since midnight → "HH:MM" */
export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Label of a slot range, e.g. "08:00 - 10:00" */
export function slotRangeLabel(startMin: number, endMin: number): string {
  return `${minutesToLabel(startMin)} - ${minutesToLabel(endMin)}`;
}

/**
 * Day of week in school terms: 1 = Lundi ... 6 = Samedi.
 * Returns null on Sunday (0) — non school day.
 */
export function getSchoolDayOfWeek(d: Date = new Date()): number | null {
  const js = d.getDay(); // 0 = Sunday ... 6 = Saturday
  if (js === 0) return null;
  return js;
}

/** Minutes since midnight for a given date */
export function getMinutesOfDay(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export interface SlotLike {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
}

/** Find the slot currently in progress (day matches + startMin <= now < endMin) */
export function findCurrentSlot<T extends SlotLike>(slots: T[], now: Date = new Date()): T | null {
  const dow = getSchoolDayOfWeek(now);
  if (dow === null) return null;
  const minutes = getMinutesOfDay(now);
  return (
    slots.find(
      (s) => s.dayOfWeek === dow && s.startMin <= minutes && minutes < s.endMin
    ) ?? null
  );
}

/**
 * Find the next upcoming slot occurrence starting from `now`
 * (later today, or the next school days within the following week).
 * Returns the slot plus how many days ahead it is (0 = today).
 */
export function findNextSlot<T extends SlotLike>(
  slots: T[],
  now: Date = new Date()
): { slot: T; daysAhead: number } | null {
  if (slots.length === 0) return null;
  const minutes = getMinutesOfDay(now);
  const jsDow = now.getDay(); // 0=Sun..6=Sat

  // Candidate school days ordered from today: today (if not Sunday), then following days, wrap a full week
  for (let ahead = 0; ahead <= 7; ahead++) {
    const js = (jsDow + ahead) % 7;
    if (js === 0) continue; // skip Sunday
    const candidateSlots = slots.filter((s) => s.dayOfWeek === js);
    if (candidateSlots.length === 0) continue;
    // Sort by start time
    candidateSlots.sort((a, b) => a.startMin - b.startMin);
    if (ahead === 0) {
      const next = candidateSlots.find((s) => s.startMin > minutes);
      if (next) return { slot: next, daysAhead: 0 };
    } else {
      return { slot: candidateSlots[0], daysAhead: ahead };
    }
  }
  return null;
}

export interface SlotWithPeople extends SlotLike {
  teacher?: { firstName: string; lastName: string } | null;
  classe?: { code: string } | null;
  groupe?: { code: string } | null;
  subject?: string | null;
  subjectAr?: string | null;
}
