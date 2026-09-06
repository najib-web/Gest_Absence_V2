"use client";

// Teacher overview: automatic roll call proposal based on the weekly service
// table and the system date/time, plus oriented-students signals.

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useFetch, apiPost, formatDate, useNow } from "@/lib/hooks";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Users,
  Send,
  CheckCircle2,
  BookOpen,
  BellRing,
  Megaphone,
  Clock3,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { SessionUser } from "@/components/app-shell";
import {
  getSchoolDayOfWeek,
  getMinutesOfDay,
  findCurrentSlot,
  findNextSlot,
  slotRangeLabel,
  DAY_NAMES,
} from "@/lib/schedule";

interface SlotApi {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  subject: string;
  subjectAr: string | null;
  classeId: string;
  groupId: string | null;
  classe: { code: string };
  groupe: { code: string } | null;
}

export function TeacherOverview({
  user,
  onOpenAttendance,
}: {
  user: SessionUser;
  onOpenAttendance: (sessionId: string) => void;
}) {
  const { t, locale } = useI18n();
  const teacherId = user.teacherId;
  const { data: slotsData, loading: slotsLoading } = useFetch<{ slots: SlotApi[] }>(
    `/api/service-slots?teacherId=${teacherId}`
  );
  const { data: sessionsData } = useFetch<{ sessions: any[] }>(`/api/sessions?teacherId=${teacherId}`);
  const { data: orientedData } = useFetch<{ absences: any[] }>(`/api/absences?oriented=true`);

  const [starting, setStarting] = useState<string | null>(null);

  // Live clock: recompute the current session every 30 s from system date
  const now = useNow(30_000);

  const slots = slotsData?.slots ?? [];
  const sessions = sessionsData?.sessions ?? [];
  const orientedAbsences = (orientedData?.absences ?? []).filter(
    (a) => a.session.teacherId === teacherId
  );

  const today = now ? new Date(new Date(now).setHours(0, 0, 0, 0)) : null;
  const todaySessions = today
    ? sessions.filter((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })
    : [];

  const totalAbsences = sessions.reduce((sum, s) => sum + (s._count?.absences ?? 0), 0);

  // Current / next slot from the weekly service table (system date based)
  const currentSlot = now ? findCurrentSlot(slots, now) : null;
  const nextOccurrence = useMemo(
    () => (now && !currentSlot ? findNextSlot(slots, now) : null),
    [now, currentSlot, slots]
  );

  async function startRollCall(slot: SlotApi) {
    setStarting(slot.id);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const res = await apiPost("/api/sessions", {
        teacherId,
        classeId: slot.classeId,
        groupId: slot.groupId || null,
        date: new Date().toISOString(),
        subject: slot.subject,
        subjectAr: slot.subjectAr,
        dedupeFrom: todayStart.toISOString(),
      });
      toast.success(t.currentSession + " — " + slot.classe.code + (slot.groupe ? " · " + slot.groupe.code : ""));
      onOpenAttendance(res.session.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStarting(null);
    }
  }

  function dayLabel(daysAhead: number): string {
    if (daysAhead === 0) return t.today;
    if (daysAhead === 1) return t.tomorrow;
    return `+${daysAhead} ${t.days}`;
  }

  const currentDow = now ? getSchoolDayOfWeek(now) : null;
  const todayName =
    currentDow !== null ? (locale === "ar" ? DAY_NAMES[currentDow - 1].ar : DAY_NAMES[currentDow - 1].fr) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.welcome}, {user.name}</h2>
          <p className="text-sm text-muted-foreground">
            {t.teacherDashboard}
            {now && (
              <span className="ms-2 inline-flex items-center gap-1 font-mono text-xs">
                <Clock3 className="h-3 w-3" />
                {now.toLocaleTimeString(locale === "ar" ? "ar-MA" : "fr-FR", { hour: "2-digit", minute: "2-digit" })}
                {todayName && ` · ${todayName}`}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ===== Appel automatique selon la date du système ===== */}
      <Card
        className={
          currentSlot
            ? "border-primary shadow-md bg-gradient-to-br from-primary/5 to-transparent"
            : "border-dashed"
        }
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className={`h-5 w-5 ${currentSlot ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
            {currentSlot ? t.currentSession : t.nextSession}
          </CardTitle>
          <CardDescription>{t.rollCallHint}</CardDescription>
        </CardHeader>
        <CardContent>
          {slotsLoading || !now ? (
            <div className="py-4 text-sm text-muted-foreground">{t.loading}</div>
          ) : currentSlot ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="font-mono" variant="default">
                    {slotRangeLabel(currentSlot.startMin, currentSlot.endMin)}
                  </Badge>
                  <Badge variant="secondary">{currentSlot.classe?.code}</Badge>
                  {(currentSlot as any).groupe && (
                    <Badge variant="outline">{(currentSlot as any).groupe.code}</Badge>
                  )}
                  <span className="text-sm font-medium">
                    {locale === "ar" && (currentSlot as any).subjectAr ? (currentSlot as any).subjectAr : (currentSlot as any).subject}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.currentSession} — {t.now}{" "}
                  {now.toLocaleTimeString(locale === "ar" ? "ar-MA" : "fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => startRollCall(currentSlot as SlotApi)}
                disabled={starting === currentSlot.id}
              >
                {starting === currentSlot.id ? (
                  <CalendarClock className="h-5 w-5 me-2 animate-spin" />
                ) : (
                  <Megaphone className="h-5 w-5 me-2" />
                )}
                {t.takeAttendance}
                <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>
          ) : nextOccurrence ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {dayLabel(nextOccurrence.daysAhead)}
                  </Badge>
                  <Badge className="font-mono" variant="secondary">
                    {slotRangeLabel(nextOccurrence.slot.startMin, nextOccurrence.slot.endMin)}
                  </Badge>
                  <Badge variant="secondary">{nextOccurrence.slot.classe?.code}</Badge>
                  {(nextOccurrence.slot as any).groupe && (
                    <Badge variant="outline">{(nextOccurrence.slot as any).groupe.code}</Badge>
                  )}
                  <span className="text-sm font-medium">
                    {locale === "ar" && (nextOccurrence.slot as any).subjectAr
                      ? (nextOccurrence.slot as any).subjectAr
                      : (nextOccurrence.slot as any).subject}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{t.noSessionNow}</div>
              </div>
            </div>
          ) : (
            <div className="py-3 text-sm text-muted-foreground">
              {slots.length === 0 ? t.noSlotsConfigured : t.noSessionNow}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.serviceTables} value={slots.length} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label={t.todaySessions} value={todaySessions.length} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label={t.sessions} value={sessions.length} icon={<Users className="h-4 w-4" />} hint={t.totalAbsences + ": " + totalAbsences} />
        <StatCard label={t.orientedAbsences} value={orientedAbsences.length} icon={<Send className="h-4 w-4" />} hint={t.pending} />
      </div>

      {/* Today's sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {t.todaySessions}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t.noSessionsToday}
            </div>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {s.classe.code}
                      {s.groupe ? ` · ${s.groupe.code}` : ""} — {s.subject}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(s.date, locale)}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onOpenAttendance(s.id)}>
                    {t.takeAttendance}
                    <ArrowRight className="h-3.5 w-3.5 ms-1" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal : élèves orientés vers le surveillant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-500" />
            {t.orientedStudents}
          </CardTitle>
          <CardDescription>{t.sendToSurveillant}</CardDescription>
        </CardHeader>
        <CardContent>
          {orientedAbsences.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t.noData}
            </div>
          ) : (
            <div className="space-y-2">
              {orientedAbsences.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {a.student.lastName} {a.student.firstName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.student.codeMassar} · {a.student.classe?.code}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-end">
                    <div>{formatDate(a.session.date, locale)}</div>
                    <div>{a.session.subject}</div>
                  </div>
                  <Badge variant={a.justified ? "default" : "destructive"}>
                    {a.justified ? t.justified : t.unjustified}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
