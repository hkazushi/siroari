// Server-side only — API ルートでログイン済みユーザーかを確認する
import { createClient } from "@supabase/supabase-js";

/**
 * PIN ログインの裏で使う内部ユーザー。メールは受信しない固定アドレスで、
 * パスワードは環境変数 LOGIN_PASSWORD（ランダム生成）。利用者がメールを登録する必要はない。
 */
export const OWNER_EMAIL = process.env.LOGIN_EMAIL || "owner@higashiyama-kaikei.example.com";

export async function requireUser(req: Request): Promise<{ id: string } | Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: "Supabase 未設定です" }, { status: 500 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  // 新規登録が開いていても、本人（内部ユーザー）以外は AI などを使えないようにする
  if (data.user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return Response.json({ error: "このアカウントでは利用できません" }, { status: 403 });
  }
  return { id: data.user.id };
}
