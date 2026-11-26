// Server-side only — API ルートでログイン済みユーザーかを確認する
import { createClient } from "@supabase/supabase-js";

export async function requireUser(req: Request): Promise<{ id: string } | Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: "Supabase 未設定です" }, { status: 500 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  return { id: data.user.id };
}
