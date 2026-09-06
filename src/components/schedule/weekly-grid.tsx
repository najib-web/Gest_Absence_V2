"use client";

// Weekly service table grid: Lundi→Samedi columns × 2h time slots (8h→18h).
// Used by the surveillant (edit mode) and by teachers (read-only personal view).

import { useI18n } from "@/lib/i18n-context";
import { useNow } from "@/lib/hooks";
import {
  TIME_SLOTS,
  DAY_NAMES,
  getSchoolDayOfWeek,
  getMinutesOfDay,
  type SlotWithPeople,
} from "@/lib/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2 } from "lucide-react";

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
  const currentSlotStart = now
    ? TIME_SLOTS.find((s) => s.startMin <= nowMinutes && nowMinutes < s.endMin)?.startMin ?? null
    : null;

  function slotsForCell(dow: number, startMin: number): SlotWithPeople[] {
    return slots.filter((s) => s.dayOfWeek === dow && s.startMin === startMin);
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky start-0 z-10 bg-muted/80 backdrop-blur border-b border-e p-2 text-start w-28 min-w-28">
              <div className="text-xs font-semibold text-muted-foreground">{t.timeSlot}</div>
            </th>
            {DAY_NAMES.map((d) => (
              <th
                key={d.dow}
                className={`border-b p-2 text-center text-xs font-semibold ${
                  todayDow === d.dow
                    ? "bg-primary/10 text-primary border-b-2 border-b-primary"
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
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((ts) => {
            const isCurrentRow = currentSlotStart === ts.startMin;
            return (
              <tr key={ts.id} className={isCurrentRow ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}>
                <td
                  className={`sticky start-0 z-10 border-b border-e p-2 align-middle w-28 min-w-28 ${
                    isCurrentRow ? "bg-amber-50/95 dark:bg-amber-950/40" : "bg-card"
                  }`}
                >
                  <div className={`text-xs font-mono font-semibold ${isCurrentRow ? "text-amber-700 dark:text-amber-400" : "text-foreground/80"}`}>
                    {String(Math.floor(ts.startMin / 60)).padStart(2, "0")}:00
                    <br />
                    {String(Math.floor(ts.endMin / 60)).padStart(2, "0")}:00
                  </div>
                  {isCurrentRow && (
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      ● {t.inProgress}
                    </div>
                  )}
                </td>
                {DAY_NAMES.map((d) => {
                  const cellSlots = slotsForCell(d.dow, ts.startMin);
                  return (
                    <td
                      key={`${ts.id}-${d.dow}`}
                      className="border-b p-1.5 align-top min-w-[120px]"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : cellSlots.length === 0 ? (
                        onEmptyClick ? (
                          <button
                            onClick={() => onEmptyClick(d.dow, ts.startMin, ts.endMin)}
                            title={t.emptyCellHint}
                            className="group w-full h-full min-h-[64px] rounded-md border border-dashed border-transparent hover:border-border hover:bg-accent/40 flex items-center justify-center transition-all"
                          >
                            <Plus className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                          </button>
                        ) : (
                          <div className="min-h-[64px]" />
                        )
                      ) : (
                        <div className="space-y-1.5">
                          {cellSlots.map((slot) => (
                            <div
                              key={slot.id}
                              className={`relative rounded-md border p-2 transition-colors ${
                                slot.id ? teacherColor((slot as any).teacher?.id ?? slot.id) : "bg-muted"
                              }`}
                            >
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(slot)}
                                  className="absolute top-1 end-1 rounded-full p-0.5 text-muted-foreground/60 hover:text-destructive hover:bg-background/60 transition-colors"
                                  title={t.delete}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
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
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
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
