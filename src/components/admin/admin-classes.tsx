"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useFetch, apiPost, apiDelete } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, GraduationCap, Layers, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function AdminClasses() {
  const { t } = useI18n();
  const { data: niveauxData, loading, refresh } = useFetch<{ niveaux: any[] }>("/api/niveaux");
  const { data: classesData, refresh: refreshClasses } = useFetch<{ classes: any[] }>("/api/classes?withCounts=true");

  const [niveauOpen, setNiveauOpen] = useState(false);
  const [classeOpen, setClasseOpen] = useState(false);
  const [groupOpenFor, setGroupOpenFor] = useState<string | null>(null);

  const niveaux = niveauxData?.niveaux ?? [];
  const classes = classesData?.classes ?? [];

  async function deleteClasse(id: string) {
    if (!confirm(t.confirmDelete)) return;
    try {
      await apiDelete(`/api/classes/${id}`);
      toast.success(t.deleted);
      refresh();
      refreshClasses();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm(t.confirmDelete)) return;
    try {
      await apiDelete(`/api/groups?id=${id}`);
      toast.success(t.deleted);
      refresh();
      refreshClasses();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.classes} & {t.groups}</h2>
          <p className="text-sm text-muted-foreground">{t.niveaux} · {t.classes} · {t.groups}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setNiveauOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t.createNiveau}
          </Button>
          <Button size="sm" onClick={() => setClasseOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t.createClass}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
        </div>
      ) : niveaux.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
            {t.noData}
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={[niveaux[0]?.id]} className="space-y-3">
          {niveaux.map((n) => {
            const niveauClasses = classes.filter((c) => c.niveauId === n.id);
            return (
              <AccordionItem
                key={n.id}
                value={n.id}
                className="border rounded-lg overflow-hidden bg-card"
              >
                <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/30">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div className="text-start">
                      <div className="font-semibold">
                        {n.labelFr} <span className="text-muted-foreground">· {n.labelAr}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {niveauClasses.length} {t.classes}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {niveauClasses.length === 0 ? (
                      <div className="md:col-span-2 text-center py-6 text-sm text-muted-foreground">
                        {t.noData}
                      </div>
                    ) : (
                      niveauClasses.map((c) => (
                        <Card key={c.id} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4 text-primary" />
                                  {c.code}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {c.labelFr} <span className="text-muted-foreground">· {c.labelAr}</span>
                                </CardDescription>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteClasse(c.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                {t.students}
                              </span>
                              <Badge variant="secondary">
                                {c._count?.students ?? 0} / {c.capacity}
                              </Badge>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {t.groups} ({c.groups.length})
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => setGroupOpenFor(c.id)}
                                >
                                  <Plus className="h-3 w-3 me-1" />
                                  {t.add}
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {c.groups.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">{t.noGroup}</span>
                                ) : (
                                  c.groups.map((g: any) => (
                                    <div
                                      key={g.id}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs group"
                                    >
                                      <span className="font-medium">{g.code}</span>
                                      <button
                                        onClick={() => deleteGroup(g.id)}
                                        className="opacity-0 group-hover:opacity-100 text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <NiveauDialog open={niveauOpen} onOpenChange={setNiveauOpen} onSaved={() => refresh()} />
      <ClasseDialog
        open={classeOpen}
        onOpenChange={setClasseOpen}
        niveaux={niveaux}
        onSaved={() => { refresh(); refreshClasses(); }}
      />
      <GroupDialog
        classeId={groupOpenFor}
        onOpenChange={(v) => !v && setGroupOpenFor(null)}
        onSaved={() => { refresh(); refreshClasses(); }}
      />
    </div>
  );
}

function NiveauDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [order, setOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/niveaux", { code, labelFr, labelAr, order: parseInt(order) || 0 });
      toast.success(t.created);
      setCode(""); setLabelFr(""); setLabelAr(""); setOrder("0");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {t.createNiveau}
          </DialogTitle>
          <DialogDescription>{t.niveaux}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nc">Code</Label>
            <Input id="nc" value={code} onChange={(e) => setCode(e.target.value)} placeholder="TC, 1BAC, 2BAC" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nfr">Libellé (FR)</Label>
              <Input id="nfr" value={labelFr} onChange={(e) => setLabelFr(e.target.value)} placeholder="Tronc Commun" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nar">Libellé (AR)</Label>
              <Input id="nar" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} placeholder="الجذع المشترك" dir="rtl" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ord">Ordre</Label>
            <Input id="ord" type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClasseDialog({ open, onOpenChange, niveaux, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; niveaux: any[]; onSaved: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [niveauId, setNiveauId] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/classes", { code, labelFr, labelAr, niveauId, capacity: parseInt(capacity) || 40 });
      toast.success(t.created);
      setCode(""); setLabelFr(""); setLabelAr(""); setNiveauId(""); setCapacity("40");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t.createClass}
          </DialogTitle>
          <DialogDescription>{t.classes}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cc">Code Classe</Label>
            <Input id="cc" value={code} onChange={(e) => setCode(e.target.value)} placeholder="TCSF-1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cfr">Libellé (FR)</Label>
              <Input id="cfr" value={labelFr} onChange={(e) => setLabelFr(e.target.value)} placeholder="Tronc Commun Sciences 1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="car">Libellé (AR)</Label>
              <Input id="car" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} placeholder="الجذع المشترك علمي 1" dir="rtl" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.niveau}</Label>
              <Select value={niveauId} onValueChange={setNiveauId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectNiveau} />
                </SelectTrigger>
                <SelectContent>
                  {niveaux.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.code} — {n.labelFr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cap">{t.capacity}</Label>
              <Input id="cap" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button type="submit" disabled={saving || !niveauId}>
              {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GroupDialog({ classeId, onOpenChange, onSaved }: { classeId: string | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!classeId) return;
    setSaving(true);
    try {
      await apiPost("/api/groups", { code, labelFr, labelAr, classeId });
      toast.success(t.created);
      setCode(""); setLabelFr(""); setLabelAr("");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!classeId} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.createGroup}</DialogTitle>
          <DialogDescription>{t.groups}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gc">Code</Label>
            <Input id="gc" value={code} onChange={(e) => setCode(e.target.value)} placeholder="G1, G2" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gfr">Libellé (FR)</Label>
              <Input id="gfr" value={labelFr} onChange={(e) => setLabelFr(e.target.value)} placeholder="Groupe 1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gar">Libellé (AR)</Label>
              <Input id="gar" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} placeholder="المجموعة 1" dir="rtl" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : null}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
