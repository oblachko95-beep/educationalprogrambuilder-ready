"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleLabels, type UserRole } from "@/lib/roles";

type Mode = "login" | "register" | "forgot" | "reset";

export default function AuthForm({ mode, returnTo = "/", token = "" }: { mode: Mode; returnTo?: string; token?: string }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<UserRole>("author");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const meta = useMemo(() => {
    if (mode === "register") return { title: "Регистрация", description: "Создайте личный кабинет. Фактическую роль после регистрации назначит администратор.", action: "Зарегистрироваться" };
    if (mode === "forgot") return { title: "Восстановление пароля", description: "Пока почта не подключена, система покажет одноразовую ссылку восстановления.", action: "Создать ссылку" };
    if (mode === "reset") return { title: "Новый пароль", description: "Введите новый пароль для входа в конструктор.", action: "Сохранить пароль" };
    return { title: "Вход", description: "Войдите по email и паролю, чтобы открыть личный кабинет.", action: "Войти" };
  }, [mode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResetUrl(null);
    try {
      const endpoint = mode === "register"
        ? "/api/auth/register"
        : mode === "forgot"
          ? "/api/auth/password-reset/request"
          : mode === "reset"
            ? "/api/auth/password-reset/confirm"
            : "/api/auth/login";
      const body = mode === "register"
        ? { email, password, displayName, requestedRole }
        : mode === "forgot"
          ? { email }
          : mode === "reset"
            ? { token, password }
            : { email, password };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string; resetUrl?: string | null };
      if (!response.ok) throw new Error(result.error || "Запрос не выполнен");
      if (mode === "forgot") {
        setResetUrl(result.resetUrl ?? null);
      } else {
        window.location.href = returnTo;
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Запрос не выполнен");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#14213d]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <Card className="w-full max-w-lg rounded-2xl border-0 shadow-xl">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">{meta.title}</CardTitle>
              <CardDescription className="mt-2 text-base leading-relaxed">{meta.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
              {mode !== "reset" && (
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                </div>
              )}
              {mode === "register" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">ФИО или отображаемое имя</Label>
                    <Input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Желаемая роль</Label>
<select
  id="requestedRole"
  value={requestedRole}
  onChange={(event) => setRequestedRole(event.target.value as UserRole)}
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
>
  {Object.entries(roleLabels).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ))}
</select>
                </>
              )}
              {mode !== "forgot" && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
                </div>
              )}
              {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              {resetUrl && (
                <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">Ссылка восстановления создана:</p>
                  <a className="mt-2 block break-all text-primary underline" href={resetUrl}>{resetUrl}</a>
                </div>
              )}
              <Button type="submit" className="mt-2" disabled={busy}>
                {busy ? "Подождите..." : meta.action}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {mode !== "login" && <Link className="text-primary underline" href="/login">Войти</Link>}
              {mode !== "register" && <Link className="text-primary underline" href="/register">Регистрация</Link>}
              {mode !== "forgot" && mode !== "reset" && <Link className="text-primary underline" href="/forgot-password">Забыли пароль?</Link>}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
