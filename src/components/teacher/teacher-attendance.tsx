"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useFetch, apiPost, formatDate } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ArrowLeft,
  Check,
  X,
  Clock,
  Send,
  Save,
  Search,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Status = "PRESENT" | "ABSENT" | "RETARD";

interface SessionDetail {
  session: {
    id: string;
    date: string;
    subject: string;
    subjectAr: string | null;
    teacher: { id: string; firstName: string; lastName: string };
    classe: { id: string; code: string; labelFr: string };
    students: Array<{
      id: string;
      codeMassar: string;
      firstName: string;
      lastName: string;
      absence: {
        id: string;
        status: string;
        reason: string | null;
        oriented: boolean;
        justified: boolean;
      } | null;
    }>;
  };
}

export function TeacherAttendance({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const { data, loading, refresh } = useFetch<SessionDetail>(`/api/sessions/${sessionId}`);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [oriented, setOriented] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [reasonTarget, setReasonTarget] = useState<{ id: string; name: string } | null>(null);

  // Initialize statuses from existing absences
  useEffect(() => {
    if (data?.session?.students) {
      const s: Record<string, Status> = {};
      const r: Record<string, string> = {};
      const o: Record<string, boolean> = {};
      for (const st of data.session.students) {
        s[st.id] = (st.absence?.status as Status) || "PRESENT";
        r[st.id] = st.absence?.reason || "";
        o[st.id] = st.absence?.oriented ?? false;
      }
      setStatuses(s);
      setReasons(r);
      setOriented(o);
    }
  }, [data]);

  if (loading || !data) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
      </div>
    );
  }

  const session = data.session;
  const students = session.students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.codeMassar.toLowerCase().includes(q)
    );
  });

  const counts = {
    present: students.filter((s) => statuses[s.id] === "PRESENT").length,
    absent: students.filter((s) => statuses[s.id] === "ABSENT").length,
    late: students.filter((s) => statuses[s.id] === "RETARD").length,
  };

  function setStatus(id: string, status: Status) {
    setStatuses((prev) => ({ ...prev, [id]: status }));
    if (status === "PRESENT") {
      setOriented((prev) => ({ ...prev, [id]: false }));
    }
  }

  function setReason(id: string, reason: string) {
    setReasons((prev) => ({ ...prev, [id]: reason }));
  }

  function toggleOriented(id: string) {
    if (statuses[id] === "PRESENT") return;
    setOriented((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function save() {
    setSaving(true);
    try {
      const entries = students.map((s) => ({
        studentId: s.id,
        status: statuses[s.id] || "PRESENT",
        reason: reasons[s.id] || undefined,
        oriented: oriented[s.id] ?? false,
      }));
      const data = await apiPost("/api/absences", { sessionId, entries });
      toast.success(`${t.saved} — ${data.marked} ${t.absent.toLowerCase()}/${t.late.toLowerCase()}, ${data.present} ${t.present.toLowerCase()}`);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t.takeAttendance}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>{session.classe.code}</span>
              {(session as any).groupe && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {(session as any).groupe.code}
                </Badge>
              )}
              <span>— {session.subject} · {formatDate(session.date, locale)}</span>
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {t.save}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t.present}</div>
              <div className="text-2xl font-bold text-emerald-600">{counts.present}</div>
            </div>
            <Check className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t.absent}</div>
              <div className="text-2xl font-bold text-red-600">{counts.absent}</div>
            </div>
            <X className="h-6 w-6 text-red-500" />
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{t.late}</div>
              <div className="text-2xl font-bold text-amber-600">{counts.late}</div>
            </div>
            <Clock className="h-6 w-6 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9 max-w-md"
        />
      </div>

      {/* Students */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t.codeMassar}</TableHead>
                  <TableHead>{t.fullName}</TableHead>
                  <TableHead className="text-center">{t.status}</TableHead>
                  <TableHead className="text-center">{t.oriented}</TableHead>
                  <TableHead className="text-center">{t.reason}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((s, i) => {
                    const st = statuses[s.id] || "PRESENT";
                    const isOriented = oriented[s.id] ?? false;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{s.codeMassar}</TableCell>
                        <TableCell className="font-medium">
                          {s.lastName} {s.firstName}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <StatusButton
                              active={st === "PRESENT"}
                              color="emerald"
                              icon={<Check className="h-3.5 w-3.5" />}
                              onClick={() => setStatus(s.id, "PRESENT")}
                              title={t.present}
                            />
                            <StatusButton
                              active={st === "ABSENT"}
                              color="red"
                              icon={<X className="h-3.5 w-3.5" />}
                              onClick={() => setStatus(s.id, "ABSENT")}
                              title={t.absent}
                            />
                            <StatusButton
                              active={st === "RETARD"}
                              color="amber"
                              icon={<Clock className="h-3.5 w-3.5" />}
                              onClick={() => setStatus(s.id, "RETARD")}
                              title={t.late}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={isOriented ? "default" : "outline"}
                            className={`h-7 px-2 ${isOriented ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                            disabled={st === "PRESENT"}
                            onClick={() => toggleOriented(s.id)}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          {reasons[s.id] ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setReasonTarget({ id: s.id, name: `${s.lastName} ${s.firstName}` })}
                            >
                              <AlertCircle className="h-3 w-3 me-1" />
                              {t.view}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              disabled={st === "PRESENT"}
                              onClick={() => setReasonTarget({ id: s.id, name: `${s.lastName} ${s.firstName}` })}
                            >
                              +
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ReasonDialog
        target={reasonTarget}
        initial={reasonTarget ? reasons[reasonTarget.id] || "" : ""}
        onClose={() => setReasonTarget(null)}
        onSave={(reason) => {
          if (reasonTarget) {
            setReason(reasonTarget.id, reason);
            setReasonTarget(null);
          }
        }}
      />
    </div>
  );
}

function StatusButton({
  active,
  color,
  icon,
  onClick,
  title,
}: {
  active: boolean;
  color: "emerald" | "red" | "amber";
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  const colors = {
    emerald: active ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-600 hover:bg-emerald-50",
    red: active ? "bg-red-600 text-white hover:bg-red-700" : "text-red-600 hover:bg-red-50",
    amber: active ? "bg-amber-600 text-white hover:bg-amber-700" : "text-amber-600 hover:bg-amber-50",
  };
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={`h-8 w-8 p-0 ${colors[color]}`}
      onClick={onClick}
      title={title}
    >
      {icon}
    </Button>
  );
}

function ReasonDialog({
  target,
  initial,
  onClose,
  onSave,
}: {
  target: { id: string; name: string } | null;
  initial: string;
  onClose: () => void;
  onSave: (reason: string) => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState(initial);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReason(initial);
  }, [initial, target]);

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.reason} — {target?.name}</DialogTitle>
          <DialogDescription>{t.notes} ({t.optional})</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="r">{t.enterReason}</Label>
          <Textarea
            id="r"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t.enterReason}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button type="button" onClick={() => onSave(reason)}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
