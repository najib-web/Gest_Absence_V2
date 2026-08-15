"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { AppShell, type SessionUser, type NavItem } from "@/components/app-shell";
import { LayoutDashboard, CalendarClock, ClipboardCheck, Send } from "lucide-react";
import { TeacherOverview } from "@/components/teacher/teacher-overview";
import { TeacherSessions } from "@/components/teacher/teacher-sessions";
import { TeacherAttendance } from "@/components/teacher/teacher-attendance";
import { TeacherOriented } from "@/components/teacher/teacher-oriented";

export function TeacherDashboard({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { t } = useI18n();
  const [active, setActive] = useState("overview");
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);

  function openAttendance(id: string) {
    setAttendanceSessionId(id);
    setActive("attendance");
  }

  function backFromAttendance() {
    setAttendanceSessionId(null);
    setActive("sessions");
  }

  const navItems: NavItem[] = [
    { id: "overview", label: t.overview, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "sessions", label: t.mySessions, icon: <CalendarClock className="h-4 w-4" /> },
    { id: "oriented", label: t.orientedStudents, icon: <Send className="h-4 w-4" /> },
  ];

  // Hide nav when in attendance view (full focus)
  if (active === "attendance" && attendanceSessionId) {
    return (
      <AppShell
        user={user}
        navItems={[
          { id: "back", label: t.back, icon: <LayoutDashboard className="h-4 w-4" /> },
        ]}
        activeId="back"
        onNavigate={backFromAttendance}
        onLogout={onLogout}
      >
        <TeacherAttendance sessionId={attendanceSessionId} onBack={backFromAttendance} />
      </AppShell>
    );
  }

  return (
    <AppShell user={user} navItems={navItems} activeId={active} onNavigate={setActive} onLogout={onLogout}>
      {active === "overview" && (
        <TeacherOverview user={user} onStartSession={() => setActive("sessions")} />
      )}
      {active === "sessions" && (
        <TeacherSessions user={user} onOpenAttendance={openAttendance} />
      )}
      {active === "oriented" && <TeacherOriented user={user} />}
    </AppShell>
  );
}
