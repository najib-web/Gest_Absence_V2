"use client";

import { useI18n } from "@/lib/i18n-context";
import { useFetch, formatDate } from "@/lib/hooks";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Users, Send, CheckCircle2, BookOpen } from "lucide-react";
import type { SessionUser } from "@/components/app-shell";

export function TeacherOverview({ user, onStartSession }: { user: SessionUser; onStartSession: () => void }) {
  const { t, locale } = useI18n();
  const teacherId = user.teacherId;
  const { data: servicesData } = useFetch<{ services: any[] }>(`/api/service-tables?teacherId=${teacherId}`);
  const { data: sessionsData } = useFetch<{ sessions: any[] }>(`/api/sessions?teacherId=${teacherId}`);
  const { data: orientedData } = useFetch<{ absences: any[] }>(`/api/absences?oriented=true`);

  const services = servicesData?.services ?? [];
  const sessions = sessionsData?.sessions ?? [];
  const orientedAbsences = (orientedData?.absences ?? []).filter(
    (a) => a.session.teacherId === teacherId
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter((s) => {
    const d = new Date(s.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const totalAbsences = sessions.reduce((sum, s) => sum + (s._count?.absences ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.welcome}, {user.name}</h2>
          <p className="text-sm text-muted-foreground">{t.teacherDashboard}</p>
        </div>
        <Button onClick={onStartSession}>
          <CalendarClock className="h-4 w-4 me-2" />
          {t.newSession}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.serviceTables} value={services.length} icon={<BookOpen className="h-4 w-4" />} />
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
                      {s.classe.code} — {s.subject}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(s.date, locale)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (window.location.hash = `attendance/${s.id}`)}
                  >
                    {t.takeAttendance}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent oriented students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-500" />
            {t.orientedStudents}
          </CardTitle>
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
