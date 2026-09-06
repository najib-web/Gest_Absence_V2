"use client";

// Weekly service table grid: Lundi→Samedi columns × hourly rows (08:00→18:00).
// Séances de 1h ou 2h — chaque carte occupe visuellement sa durée réelle.
// Used by the surveillant (edit mode) and by teachers (read-only personal view).

import { useI18n } from "@/lib/i18n-context";
import { useNow } from "@/lib/hooks";
import {
  HOUR_SLOTS,
  SCHOOL_START_MIN,
  SCHOOL_END_MIN,
  DAY_NAMES,
  getSchoolDayOfWeek,
  getMinutesOfDay,
  minutesToLabel,
  type SlotWithPeople,
} from "@/lib/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2 } from "lucide-react";

// Height of one hour row in px
const HOUR_H = 68;
// Total grid height (8h → 18h)
const GRID_H = ((SCHOOL_END_MIN - SCHOOL_START_MIN) / 60) * HOUR_H;

// Subtle color coding per teacher (no blue/indigo per design rules)
const CELL_COLORS = [
  "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
  "bg-amber-50 border-amber-200 hover:border-amber-300",
  "bg-rose-50 border-rose-200 hover:border-rose-300",
  "bg-teal-50 border-teal-200 hover:border-teal-300",
  "bg-violet-50 border-violet-200 hover:border-violet-300",
  "bg-orange-50 border-orange-200 hover:border-orange-300",
  "bg-fuchsia-50 border-fuchsia-200 hover:border-fuchsia-300",
  "bg-lime-50 border-lime-200 hover:border-lime-300",
];

function teacherColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CELL_COLORS[hash % CELL_COLORS.length];
}

export function WeeklyGrid({
  slots,
  loading,
  showTeacher = true,
  onDelete,
  onEmptyClick,
}: {
  slots: SlotWithPeople[];
  loading?: boolean;
  showTeacher?: boolean;
  onDelete?: (slot: SlotWithPeople) => void;
  onEmptyClick?: (dayOfWeek: number, startMin: number, endMin: number) => void;
}) {
  const { t, locale } = useI18n();
  const now = useNow(30_000);

  const todayDow = now ? getSchoolDayOfWeek(now) : null;
  const nowMinutes = now ? getMinutesOfDay(now) : -1;
  const nowVisible =
    nowMinutes >= SCHOOL_START_MIN && nowMinutes <= SCHOOL_END_MIN;
  const nowOffset = ((nowMinutes - SCHOOL_START_MIN) / 60) * HOUR_H;

  /** Click on a day column: compute the hour from the Y position */
  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dow: number) {
    if (!onEmptyClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourIndex = Math.min(9, Math.max(0, Math.floor(y / HOUR_H)));
    const startMin = SCHOOL_START_MIN + hourIndex * 60;
    onEmptyClick(dow, startMin, startMin + 60);
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row */}
        <div className="grid grid-cols-[72px_repeat(6,minmax(0,1fr))] border-b bg-muted/60">
          <div className="p-2 text-xs font-semibold text-muted-foreground flex items-center justify-center">
            {t.timeSlot}
          </div>
          {DAY_NAMES.map((d) => (
            <div
              key={d.dow}
              className={`p-2 text-center text-xs font-semibold ${
                todayDow === d.dow
                  ? "bg-primary/10 text-primary border-b-2 border-b-primary -mb-px"
                  : "text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                {locale === "ar" ? d.ar : d.fr}
                {todayDow === d.dow && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-foreground"></span>
                    </span>
                    {t.now}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Body: time axis + 6 day columns */}
        <div className="grid grid-cols-[72px_repeat(6,minmax(0,1fr))]">
          {/* Time axis */}
          <div className="relative border-e" style={{ height: GRID_H }}>
            {HOUR_SLOTS.map((h) => (
              <div
                key={h.id}
                className="absolute inset-x-0 flex items-start justify-center"
                style={{ top: (h.startMin - SCHOOL_START_MIN) / 60 * HOUR_H, height: HOUR_H }}
              >
                <span className="text-[11px] font-mono text-muted-foreground bg-card px-1 -translate-y-1/2 mt-px">
                  {minutesToLabel(h.startMin)}
                </span>
              </div>
            ))}
            <div
              className="absolute inset-x-0 border-t"
              style={{ top: GRID_H }}
            >
              <span className="text-[11px] font-mono text-muted-foreground bg-card px-1 absolute start-1/2 -translate-x-1/2 -translate-y-1/2">
                18:00
              </span>
            </div>
          </div>

          {/* Day columns */}
          {DAY_NAMES.map((d) => {
            const daySlots = slots
              .filter((s) => s.dayOfWeek === d.dow)
              .sort((a, b) => a.startMin - b.startMin);
            const isToday = todayDow === d.dow;
            return (
              <div
                key={d.dow}
                className={`relative border-e last:border-e-0 ${
                  isToday ? "bg-primary/[0.04]" : ""
                } ${onEmptyClick ? "cursor-pointer" : ""}`}
                style={{ height: GRID_H }}
                onClick={(e) => handleColumnClick(e, d.dow)}
              >
                {/* Hour separators */}
                {HOUR_SLOTS.map((h) => (
                  <div
                    key={h.id}
                    className="absolute inset-x-0 border-t border-border/50 pointer-events-none"
                    style={{ top: (h.startMin - SCHOOL_START_MIN) / 60 * HOUR_H }}
                  />
                ))}

                {/* "Now" line (today only) */}
                {isToday && nowVisible && (
                  <div
                    className="absolute inset-x-0 z-20 pointer-events-none"
                    style={{ top: nowOffset }}
                  >
                    <div className="relative border-t-2 border-red-500/80">
                      <span className="absolute -top-2 start-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-px">
                        {minutesToLabel(nowMinutes)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Slots */}
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  daySlots.map((slot) => {
                    const top = ((slot.startMin - SCHOOL_START_MIN) / 60) * HOUR_H;
                    const hours = (slot.endMin - slot.startMin) / 60;
                    const height = hours * HOUR_H - 6;
                    const isCurrent =
                      isToday &&
                      slot.startMin <= nowMinutes &&
                      nowMinutes < slot.endMin;
                    return (
                      <div
                        key={slot.id}
                        className={`absolute inset-x-1 rounded-md border p-1.5 transition-colors shadow-sm overflow-hidden ${
                          isCurrent
                            ? "ring-2 ring-amber-500 border-amber-400 bg-amber-50 dark:bg-amber-950/40"
                            : teacherColor((slot as any).teacher?.id ?? slot.id)
                        }`}
                        style={{ top: top + 3, height }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-[10px] font-mono text-muted-foreground leading-none mb-1">
                          {minutesToLabel(slot.startMin)}–{minutesToLabel(slot.endMin)}
                          {isCurrent && (
                            <span className="ms-1 text-amber-600 dark:text-amber-400 font-bold">● {t.inProgress}</span>
                          )}
                        </div>
                        {showTeacher && (slot as any).teacher && (
                          <div className="text-xs font-semibold leading-tight pe-4 truncate">
                            {(slot as any).teacher.lastName} {(slot as any).teacher.firstName?.[0]}.
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {slot.classe?.code}
                          </Badge>
                          {(slot as any).groupe && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {(slot as any).groupe.code}
                            </Badge>
                          )}
                        </div>
                        {(locale === "ar" && slot.subjectAr) || slot.subject ? (
                          <div className="text-[11px] text-muted-foreground mt-1 truncate">
                            {locale === "ar" && slot.subjectAr ? slot.subjectAr : slot.subject}
                          </div>
                        ) : null}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-0.5 end-0.5 h-5 w-5 rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-background/60"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(slot);
                            }}
                            title={t.delete}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Empty hint */}
                {onEmptyClick && !loading && daySlots.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Plus className="h-4 w-4 text-muted-foreground/25" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Small helper used by parents to render a "delete slot" confirm button inline
export { teacherColor };

export function EmptyGridMessage() {
  const { t } = useI18n();
  return (
    <div className="text-center py-10 text-sm text-muted-foreground">
      {t.noSlotsConfigured}
    </div>
  );
}
