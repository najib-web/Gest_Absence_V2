"use client";

// Surveillant page: weekly service table (Lundi→Samedi, 8h→18h).
// Add / remove sessions for each teacher directly on the grid.

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useFetch, apiPost, apiDelete } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, CalendarDays, FilterX } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WeeklyGrid } from "@/components/schedule/weekly-grid";
import { TIME_SLOTS, DAY_NAMES, slotRangeLabel, type SlotWithPeople } from "@/lib/schedule";

const SUBJECTS = [
  { fr: "Mathématiques", ar: "الرياضيات" },
  { fr: "Physique-Chimie", ar: "الفيزياء والكيمياء" },
  { fr: "SVT", ar: "علوم الحياة والأرض" },
  { fr: "Français", ar: "الفرنسية" },
  { fr: "Arabe", ar: "العربية" },
  { fr: "Anglais", ar: "الإنجليزية" },
  { fr: "Philosophie", ar: "الفلسفة" },
  { fr: "Histoire-Géo", ar: "التاريخ والجغرافيا" },
  { fr: "Informatique", ar: "المعلوميات" },
  { fr: "EPS", ar: "التربية البدنية" },
  { fr: "Mathématiques (TP)", ar: "الرياضيات (أعمال تطبيقية)" },
  { fr: "Physique (TP)", ar: "الفيزياء (أعمال تطبيقية)" },
];

interface SlotApi {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  subject: string;
  subjectAr: string | null;
  teacher: { id: string; firstName: string; lastName: string };
  classe: { code: string };
  groupe: { code: string } | null;
}

export function AdminSchedule() {
  const { t } = useI18n();
  const { data: slotsData, loading, refresh } = useFetch<{ slots: SlotApi[] }>("/api/service-slots");
  const { data: teachersData } = useFetch<{ teachers: any[] }>("/api/teachers");
  const { data: classesData } = useFetch<{ classes: any[] }>("/api/classes");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [preset, setPreset] = useState<{ dow: number; startMin: number; endMin: number } | null>(null);
  const [filterTeacher, setFilterTeacher] = useState<string>("all");

  const teachers = teachersData?.teachers ?? [];
  const classes = classesData?.classes ?? [];
  const allSlots = slotsData?.slots ?? [];

  const filteredSlots: SlotWithPeople[] = useMemo(
    () =>
      allSlots
        .filter((s) => filterTeacher === "all" || s.teacher.id === filterTeacher)
        .map((s) => ({ ...s, teacherId: s.teacher.id })),
    [allSlots, filterTeacher]
  );

  function openDialog(presetVal?: { dow: number; startMin: number; endMin: number }) {
    setPreset(presetVal ?? null);
    setDialogOpen(true);
  }

  async function deleteSlot(slot: SlotWithPeople) {
    if (!confirm(t.confirmDelete)) return;
    try {
      await apiDelete(`/api/service-slots/${slot.id}`);
      toast.success(t.deleted);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            {t.weeklySchedule}
          </h2>
          <p className="text-sm text-muted-foreground">{t.weeklyScheduleDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder={t.allTeachers} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTeachers}</SelectItem>
              {teachers.map((tc) => (
                <SelectItem key={tc.id} value={tc.id}>
                  {tc.lastName} {tc.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterTeacher !== "all" && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setFilterTeacher("all")}>
              <FilterX className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={() => openDialog()} disabled={teachers.length === 0 || classes.length === 0}>
            <Plus className="h-4 w-4 me-2" />
            {t.addSlot}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-3">
          <WeeklyGrid
            slots={filteredSlots}
            loading={loading}
            onDelete={deleteSlot}
            onEmptyClick={(dow, startMin, endMin) =>
              openDialog({ dow, startMin, endMin })
            }
          />
        </CardContent>
      </Card>

      <SlotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        preset={preset}
        teachers={teachers}
        classes={classes}
        onSaved={() => refresh()}
      />
    </div>
  );
}

function SlotDialog({
  open,
  onOpenChange,
  preset,
  teachers,
  classes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset: { dow: number; startMin: number; endMin: number } | null;
  teachers: any[];
  classes: any[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [teacherId, setTeacherId] = useState("");
  const [day, setDay] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [classeId, setClasseId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find((c) => c.id === classeId);
  const groups = selectedClass?.groups ?? [];

  // Sync form when opened (optionally pre-filled from an empty grid cell)
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setTeacherId("");
    setClasseId("");
    setGroupId("");
    setSubject("");
    setDay(preset ? String(preset.dow) : "");
    setSlotTime(preset ? `${preset.startMin}-${preset.endMin}` : "");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const [startMin, endMin] = slotTime.split("-").map((x) => parseInt(x));
    const subj = SUBJECTS.find((s) => s.fr === subject);
    setSaving(true);
    try {
      await apiPost("/api/service-slots", {
        teacherId,
        dayOfWeek: parseInt(day),
        startMin,
        endMin,
        classeId,
        groupId: groupId || null,
        subject,
        subjectAr: subj?.ar || null,
      });
      toast.success(t.created);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t.addSlot}
          </DialogTitle>
          <DialogDescription>{t.weeklyScheduleDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.teacher}</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectTeacher} />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((tc) => (
                  <SelectItem key={tc.id} value={tc.id}>
                    {tc.lastName} {tc.firstName} — {tc.matiere}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.selectDay}</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectDay} />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d) => (
                    <SelectItem key={d.dow} value={String(d.dow)}>
                      {d.fr} — {d.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.selectSlotTime}</Label>
              <Select value={slotTime} onValueChange={setSlotTime}>
                <SelectTrigger>
                  <SelectValue placeholder="08:00 → 18:00" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((ts) => (
                    <SelectItem key={ts.id} value={`${ts.startMin}-${ts.endMin}`}>
                      {slotRangeLabel(ts.startMin, ts.endMin)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.classe}</Label>
              <Select value={classeId} onValueChange={(v) => { setClasseId(v); setGroupId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectClass} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.groupe} ({t.optional})</Label>
              <Select value={groupId} onValueChange={setGroupId} disabled={groups.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectGroup} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.subject}</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectSubject} />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.fr} value={s.fr}>{s.fr} — {s.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button
              type="submit"
              disabled={saving || !teacherId || !day || !slotTime || !classeId || !subject}
            >
              {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
