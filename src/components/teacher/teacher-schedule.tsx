"use client";

// Teacher's personal weekly schedule (read-only view of the service table grid).

import { useI18n } from "@/lib/i18n-context";
import { useFetch } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { WeeklyGrid } from "@/components/schedule/weekly-grid";
import type { SessionUser } from "@/components/app-shell";

interface SlotApi {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  subject: string;
  subjectAr: string | null;
  classe: { code: string };
  groupe: { code: string } | null;
}

export function TeacherSchedule({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  const { data, loading } = useFetch<{ slots: SlotApi[] }>(
    `/api/service-slots?teacherId=${user.teacherId}`
  );
  const slots = data?.slots ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          {t.mySchedule}
        </h2>
        <p className="text-sm text-muted-foreground">{t.weeklyScheduleDesc}</p>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-3">
          <WeeklyGrid slots={slots} loading={loading} showTeacher={false} />
        </CardContent>
      </Card>
    </div>
  );
}
