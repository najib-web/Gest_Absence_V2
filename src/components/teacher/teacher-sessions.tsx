"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useFetch, apiPost, formatDate } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, CalendarClock, CheckCircle2, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SessionUser } from "@/components/app-shell";

export function TeacherSessions({ user, onOpenAttendance }: { user: SessionUser; onOpenAttendance: (id: string) => void }) {
  const { t, locale } = useI18n();
  const teacherId = user.teacherId;
  const { data: servicesData } = useFetch<{ services: any[] }>(`/api/service-tables?teacherId=${teacherId}`);
  const { data: sessionsData, loading, refresh } = useFetch<{ sessions: any[] }>(`/api/sessions?teacherId=${teacherId}`);

  const [open, setOpen] = useState(false);

  const services = servicesData?.services ?? [];
  const sessions = sessionsData?.sessions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.mySessions}</h2>
          <p className="text-sm text-muted-foreground">{t.sessions} — {user.name}</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={services.length === 0}>
          <Plus className="h-4 w-4 me-2" />
          {t.newSession}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.classe}</TableHead>
                  <TableHead>{t.subject}</TableHead>
                  <TableHead className="text-center">{t.absences}</TableHead>
                  <TableHead className="text-end">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {t.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-accent/30" onClick={() => onOpenAttendance(s.id)}>
                      <TableCell className="text-sm">
                        {formatDate(s.date, locale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary">{s.classe.code}</Badge>
                          {s.groupe && <Badge variant="outline">{s.groupe.code}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{s.subject}</TableCell>
                      <TableCell className="text-center">
                        {s._count.absences > 0 ? (
                          <Badge variant="destructive">{s._count.absences}</Badge>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); onOpenAttendance(s.id); }}
                        >
                          {t.takeAttendance}
                          <ArrowRight className="h-3.5 w-3.5 ms-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NewSessionDialog
        open={open}
        onOpenChange={setOpen}
        services={services}
        teacherId={teacherId!}
        onCreated={() => refresh()}
        onOpenAttendance={onOpenAttendance}
      />
    </div>
  );
}

function NewSessionDialog({
  open,
  onOpenChange,
  services,
  teacherId,
  onCreated,
  onOpenAttendance,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  services: any[];
  teacherId: string;
  onCreated: () => void;
  onOpenAttendance: (id: string) => void;
}) {
  const { t } = useI18n();
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setSaving(true);
    try {
      const data = await apiPost("/api/sessions", {
        teacherId,
        classeId: svc.classeId,
        serviceId: svc.id,
        date: new Date(date).toISOString(),
        subject: svc.subject,
        subjectAr: svc.subjectAr,
      });
      toast.success(t.created);
      onOpenChange(false);
      onCreated();
      onOpenAttendance(data.session.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {t.newSession}
          </DialogTitle>
          <DialogDescription>{t.sessions}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.serviceTable}</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectClass} />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.classe.code} {s.groupe ? `· ${s.groupe.code}` : ""} — {s.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="d">{t.sessionDate}</Label>
            <Input
              id="d"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || !serviceId}>
              {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
              {t.startSession}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
