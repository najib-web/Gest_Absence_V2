"use client";

// Shared absence history page (surveillant + enseignant):
// - History of one student by Code Massar
// - History of a class over a period
// - Excel download of the current view

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useFetch, formatDateShort } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  History,
  Search,
  Download,
  Loader2,
  User,
  Users,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface AbsenceRow {
  id: string;
  status: string;
  justified: boolean;
  oriented: boolean;
  reason: string | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    codeMassar: string;
    classe: { code: string } | null;
    groupe: { code: string } | null;
  };
  session: {
    date: string;
    subject: string;
    subjectAr: string | null;
    teacher?: { firstName: string; lastName: string } | null;
    classe?: { code: string } | null;
  };
}

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  return q.toString();
}

export function AbsenceHistory() {
  const { t, locale } = useI18n();

  // Common period filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Student mode
  const [massar, setMassar] = useState("");
  const [massarQuery, setMassarQuery] = useState("");

  // Class mode
  const [classeId, setClasseId] = useState("");
  const [classeApplied, setClasseApplied] = useState("");

  const { data: classesData } = useFetch<{ classes: any[] }>("/api/classes");
  const classes = classesData?.classes ?? [];

  const studentUrl = massarQuery
    ? `/api/absences?${buildQuery({ codeMassar: massarQuery, from, to })}`
    : null;
  const { data: studentData, loading: loadingStudent } = useFetch<{ absences: AbsenceRow[] }>(studentUrl);

  const classeUrl = classeApplied
    ? `/api/absences?${buildQuery({ classeId: classeApplied, from, to })}`
    : null;
  const { data: classeData, loading: loadingClasse } = useFetch<{ absences: AbsenceRow[] }>(classeUrl);

  const studentAbsences = studentData?.absences ?? [];
  const classeAbsences = classeData?.absences ?? [];

  const studentStats = useMemo(() => {
    return {
      total: studentAbsences.length,
      unjustified: studentAbsences.filter((a) => !a.justified).length,
      justified: studentAbsences.filter((a) => a.justified).length,
      late: studentAbsences.filter((a) => a.status === "RETARD").length,
    };
  }, [studentAbsences]);

  function searchStudent() {
    setMassarQuery(massar.trim());
  }

  function searchClasse() {
    setClasseApplied(classeId);
  }

  /** Export the given rows to an Excel file */
  function exportExcel(rows: AbsenceRow[], label: string) {
    if (rows.length === 0) {
      toast.error(t.noDataToExport);
      return;
    }
    const isAr = locale === "ar";
    const headers = [
      isAr ? "التاريخ" : "Date",
      isAr ? "القسم" : "Classe",
      isAr ? "المجموعة" : "Groupe",
      isAr ? "المادة" : "Matière",
      isAr ? "الأستاذ" : "Enseignant",
      isAr ? "التلميذ" : "Élève",
      isAr ? "الرمز المساري" : "Code Massar",
      isAr ? "الحالة" : "Statut",
      isAr ? "مبرر" : "Justifiée",
      isAr ? "موجه" : "Orientée",
      isAr ? "السبب" : "Motif",
    ];

    const data = rows.map((a) => [
      formatDateShort(a.session.date, locale),
      a.student.classe?.code ?? a.session.classe?.code ?? "—",
      a.student.groupe?.code ?? "—",
      (isAr && a.session.subjectAr) || a.session.subject,
      a.session.teacher ? `${a.session.teacher.lastName} ${a.session.teacher.firstName}` : "—",
      `${a.student.lastName} ${a.student.firstName}`,
      a.student.codeMassar,
      a.status === "ABSENT" ? (isAr ? "غائب" : "Absent") : isAr ? "متأخر" : "Retard",
      a.justified ? (isAr ? "نعم" : "Oui") : isAr ? "لا" : "Non",
      a.oriented ? (isAr ? "نعم" : "Oui") : isAr ? "لا" : "Non",
      a.reason ?? "—",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    // Column widths
    ws["!cols"] = headers.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAr ? "الغيابات" : "Absences");
    const fname = `historique_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success(`${t.exportOk} — ${fname}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          {t.absenceHistory}
        </h2>
        <p className="text-sm text-muted-foreground">{t.absenceHistoryDesc}</p>
      </div>

      <Tabs defaultValue="student">
        <TabsList>
          <TabsTrigger value="student" className="gap-1.5">
            <User className="h-4 w-4" />
            {t.byStudent}
          </TabsTrigger>
          <TabsTrigger value="classe" className="gap-1.5">
            <Users className="h-4 w-4" />
            {t.byClasse}
          </TabsTrigger>
        </TabsList>

        {/* ===== Par élève (Code Massar) ===== */}
        <TabsContent value="student" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>{t.codeMassar}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={massar}
                      onChange={(e) => setMassar(e.target.value.toUpperCase())}
                      placeholder="R123456789"
                      onKeyDown={(e) => e.key === "Enter" && searchStudent()}
                      className="font-mono"
                    />
                    <Button size="icon" onClick={searchStudent} disabled={!massar.trim()} title={t.search}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.periodFrom}</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.periodTo}</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => exportExcel(studentAbsences, massarQuery || "eleve")}
                    disabled={studentAbsences.length === 0}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {t.downloadExcel}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {massarQuery && studentAbsences.length > 0 && (
            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-lg">
                    {studentAbsences[0].student.lastName} {studentAbsences[0].student.firstName}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {studentAbsences[0].student.codeMassar} · {studentAbsences[0].student.classe?.code}
                    {studentAbsences[0].student.groupe ? ` · ${studentAbsences[0].student.groupe.code}` : ""}
                  </div>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-600">{studentStats.total}</div>
                    <div className="text-xs text-muted-foreground">{t.totalAbsences}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{studentStats.unjustified}</div>
                    <div className="text-xs text-muted-foreground">{t.unjustified}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{studentStats.justified}</div>
                    <div className="text-xs text-muted-foreground">{t.justifiedAbsences}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <AbsenceTable rows={studentAbsences} loading={loadingStudent} searched={!!massarQuery} t={t} locale={locale} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Par classe / période ===== */}
        <TabsContent value="classe" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>{t.classe}</Label>
                  <Select value={classeId} onValueChange={setClasseId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectClass} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.periodFrom}</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.periodTo}</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={searchClasse} disabled={!classeId} className="flex-1">
                    <Search className="h-4 w-4 me-2" />
                    {t.search}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportExcel(classeAbsences, classeAbsences[0]?.student.classe?.code ?? "classe")}
                    disabled={classeAbsences.length === 0}
                    title={t.downloadExcel}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <AbsenceTable rows={classeAbsences} loading={loadingClasse} searched={!!classeApplied} t={t} locale={locale} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AbsenceTable({
  rows,
  loading,
  searched,
  t,
  locale,
}: {
  rows: AbsenceRow[];
  loading: boolean;
  searched: boolean;
  t: any;
  locale: string;
}) {
  return (
    <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead>{t.date}</TableHead>
            <TableHead>{t.fullName}</TableHead>
            <TableHead>{t.codeMassar}</TableHead>
            <TableHead>{t.classe}</TableHead>
            <TableHead>{t.subject}</TableHead>
            <TableHead>{t.teacher}</TableHead>
            <TableHead>{t.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {searched ? t.noData : t.enterCriteriaHint}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateShort(a.session.date, locale)}
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {a.student.lastName} {a.student.firstName}
                </TableCell>
                <TableCell className="font-mono text-xs">{a.student.codeMassar}</TableCell>
                <TableCell>
                  <Badge variant="outline">{a.student.classe?.code ?? "—"}</Badge>
                </TableCell>
                <TableCell className="text-sm">{a.session.subject}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {a.session.teacher ? `${a.session.teacher.lastName} ${a.session.teacher.firstName?.[0]}.` : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant={a.status === "ABSENT" ? "destructive" : "secondary"}>
                      {a.status === "ABSENT" ? t.absent : t.late}
                    </Badge>
                    {a.justified && (
                      <Badge variant="default" className="bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3 me-1" />
                        {t.justified}
                      </Badge>
                    )}
                    {a.oriented && (
                      <Badge variant="outline" className="text-amber-600">
                        {t.oriented}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
