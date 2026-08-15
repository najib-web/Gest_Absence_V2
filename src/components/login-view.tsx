"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Shield, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { toast } from "sonner";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "SURVEILLANT" | "ENSEIGNANT";
  teacherId?: string;
}

export function LoginView({ onLoggedIn }: { onLoggedIn: (user: SessionUser) => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.invalidCredentials);
        toast.error(data.error || t.invalidCredentials);
        return;
      }
      toast.success(`${t.welcome}, ${data.user.name}`);
      onLoggedIn(data.user as SessionUser);
    } catch {
      setError(t.error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  }

  function quickFill(mail: string, pwd: string) {
    setEmail(mail);
    setPassword(pwd);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">{t.appName}</div>
              <div className="text-xs text-muted-foreground leading-tight">{t.appSubtitle}</div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto px-4 py-12 w-full">
        {/* Left side — marketing */}
        <div className="hidden lg:flex flex-col gap-6 pr-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              {t.appName}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {t.appSubtitle} — {t.administration} & {t.enseignant}
            </p>
          </div>
          <div className="grid gap-4">
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title={t.surveillant}
              desc={t.adminDashboard}
            />
            <FeatureCard
              icon={<BookOpen className="h-5 w-5" />}
              title={t.enseignant}
              desc={t.teacherDashboard}
            />
          </div>
        </div>

        {/* Right side — form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="shadow-lg border-emerald-100">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                {t.login}
              </CardTitle>
              <CardDescription>{t.selectRole}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="exemple@edu.ma"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.signIn}
                </Button>
              </form>

              {/* Demo accounts */}
              <div className="mt-6 pt-6 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  {t.demoAccounts}
                </div>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => quickFill("surveillant@edu.ma", "surveillant123")}
                    className="text-start p-3 rounded-lg border border-emerald-100 hover:border-primary/40 hover:bg-emerald-50/50 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Shield className="h-4 w-4 text-primary" />
                      {t.surveillant}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      surveillant@edu.ma / surveillant123
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill("enseignant@edu.ma", "enseignant123")}
                    className="text-start p-3 rounded-lg border border-emerald-100 hover:border-primary/40 hover:bg-emerald-50/50 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {t.enseignant}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      enseignant@edu.ma / enseignant123
                    </div>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        © 2026 — {t.appName}
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-white/60 border border-emerald-100">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
