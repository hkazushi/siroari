"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isCloudConfigured, supabase } from "@/lib/supabase";
import { DataProvider } from "@/lib/data";
import { YearProvider } from "@/lib/year";
import { CatSitting } from "./Cat";
import { Button, Field, Input, Spinner } from "./ui";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isCloudConfigured()) {
      queueMicrotask(() => setSession(null));
      return;
    }
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        <Spinner />
      </div>
    );
  }
  if (!session) return <Login />;
  return (
    // ユーザーが変わったら全データを読み直す
    <DataProvider key={session.user.id} session={session}>
      <YearProvider>{children}</YearProvider>
    </DataProvider>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isCloudConfigured();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "メールアドレスまたはパスワードが違います"
          : `ログインできませんでした: ${error.message}`,
      );
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <CatSitting width={110} follow />
          <div className="text-center">
            <div className="text-lg font-bold text-[#1e3a5f]">会計アプリ</div>
            <div className="text-xs text-slate-500">東山メンテナンス 青色申告</div>
          </div>
        </div>
        {!configured && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Supabase の環境変数（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）が未設定です。
          </p>
        )}
        <div className="space-y-3">
          <Field label="メールアドレス">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="パスワード">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="mt-5 w-full" disabled={busy || !configured}>
          {busy ? <Spinner /> : "ログイン"}
        </Button>
      </form>
    </div>
  );
}
