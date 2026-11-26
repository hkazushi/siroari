"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Delete } from "lucide-react";
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
  const [mode, setMode] = useState<"pin" | "email">("pin");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col items-center gap-2">
          <CatSitting width={100} follow />
          <div className="text-center">
            <div className="text-lg font-bold text-[#1e3a5f]">会計アプリ</div>
            <div className="text-xs text-slate-500">東山メンテナンス 青色申告</div>
          </div>
        </div>
        {!isCloudConfigured() && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Supabase の環境変数（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）が未設定です。
          </p>
        )}
        {mode === "pin" ? <PinLogin /> : <EmailLogin />}
        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-800"
          onClick={() => setMode(mode === "pin" ? "email" : "pin")}
        >
          {mode === "pin" ? "メールアドレスでログイン" : "番号でログイン"}
        </button>
      </div>
    </div>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

function PinLogin() {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  async function submit(code: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.locked_until) {
          const t = new Date(json.locked_until);
          setError(
            `続けて間違えたためロック中です。${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")} 以降にもう一度お試しください`,
          );
        } else if (res.status === 401) {
          setError(json.remaining != null ? `番号が違います（あと ${json.remaining} 回でロック）` : "番号が違います");
        } else {
          setError(json.error ?? `ログインできませんでした（${res.status}）`);
        }
        setShake((n) => n + 1);
        setPin("");
        return;
      }
      const { error } = await supabase().auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });
      if (error) {
        setError(`ログインできませんでした: ${error.message}`);
        setPin("");
      }
    } catch (e) {
      setError(`通信できませんでした: ${e instanceof Error ? e.message : e}`);
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function press(k: string) {
    if (busy) return;
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!/^\d$/.test(k)) return;
    if (pin.length >= 4) return;
    setError(null);
    // state 更新関数の中で送信すると開発モードで 2 回呼ばれるので外で判定する
    const next = pin + k;
    setPin(next);
    if (next.length === 4) void submit(next);
  }

  // キーボード入力（PC）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div>
      <p className="mb-3 text-center text-sm text-slate-600">4桁の番号を入力してください</p>
      <div key={shake} className={`mb-4 flex justify-center gap-3 ${shake ? "pin-shake" : ""}`} aria-live="polite">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 ${
              i < pin.length ? "border-[#1e3a5f] bg-[#1e3a5f]" : "border-slate-300 bg-white"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => press(k)}
              className="flex h-14 items-center justify-center rounded-xl bg-slate-100 text-xl font-semibold text-slate-800 select-none hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50"
              aria-label={k === "del" ? "1文字消す" : k}
            >
              {k === "del" ? <Delete size={20} /> : k}
            </button>
          ),
        )}
      </div>
      <div className="mt-3 min-h-5 text-center text-sm">
        {busy ? <Spinner className="text-slate-500" /> : error && <span className="text-red-700">{error}</span>}
      </div>
    </div>
  );
}

function EmailLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <form onSubmit={submit}>
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
      <Button type="submit" className="mt-5 w-full" disabled={busy}>
        {busy ? <Spinner /> : "ログイン"}
      </Button>
    </form>
  );
}
