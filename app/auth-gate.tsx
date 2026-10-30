"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegistryApp } from "./registry-app";

type User = { id: number; email: string; name: string; accessRole: "user" | "manager" | "admin"; notificationsEnabled: boolean };

export function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()).user as User;
      })
      .then(setUser)
      .finally(() => setChecking(false));
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error || "Входът е неуспешен.");
      return;
    }
    setUser(result.user);
  }

  if (checking)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#0b4778]" />
      </main>
    );

  if (!user)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e8f2fb,_#f8fafc_48%,_#eef2f7)] px-4 dark:bg-[radial-gradient(circle_at_top_left,_#102d47,_#07111f_52%,_#020617)]">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-300/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b4778] text-white shadow-lg shadow-blue-900/20">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Клиентски запитвания</h1>
          <p className="mt-2 text-base text-slate-500 dark:text-slate-400">Влезте, за да продължите към регистъра.</p>
          <form className="mt-8 space-y-5" onSubmit={login}>
            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="username">Потребителско име</label>
              <Input id="username" type="email" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="name@company.com" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="password">Парола</label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500" aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
            <Button className="h-12 w-full bg-[#0b4778] text-base hover:bg-[#08385f]" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Вход
            </Button>
          </form>
        </section>
      </main>
    );

  return <RegistryApp currentUser={user} onUserChange={setUser} onLogout={() => setUser(null)} />;
}
