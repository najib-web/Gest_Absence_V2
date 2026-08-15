"use client";

import { useI18n } from "@/lib/i18n-context";
import { useFetch, formatDate } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import type { SessionUser } from "@/components/app-shell";

export function TeacherOriented({ user }: { user: SessionUser }) {
  const { t, locale } = useI18n();
  const teacherId = user.teacherId;
  const { data: orientedData, loading } = useFetch<{ absences: any[] }>(`/api/absences?oriented=true`);

  const orientedAbsences = (orientedData?.absences ?? []).filter(
    (a) => a.session.teacherId === teacherId
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t.orientedStudents}</h2>
        <p className="text-sm text-muted-foreground">{t.orientedStudents} — {user.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-500" />
            {t.orientedAbsences} ({orientedAbsences.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.fullName}</TableHead>
                  <TableHead>{t.codeMassar}</TableHead>
                  <TableHead>{t.classe}</TableHead>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.subject}</TableHead>
                  <TableHead>{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : orientedAbsences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      {t.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  orientedAbsences.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.student.lastName} {a.student.firstName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.student.codeMassar}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.student.classe?.code}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(a.session.date, locale)}
                      </TableCell>
                      <TableCell className="text-sm">{a.session.subject}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={a.status === "ABSENT" ? "destructive" : "secondary"}>
                            {a.status === "ABSENT" ? t.absent : t.late}
                          </Badge>
                          <Badge variant={a.justified ? "default" : "outline"} className={a.justified ? "bg-emerald-600" : "text-amber-600"}>
                            {a.justified ? t.justified : t.pending}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
