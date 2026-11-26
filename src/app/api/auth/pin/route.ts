// 4桁 PIN ログイン。PIN はサーバーの環境変数だけにあり、合っていれば
// サーバーが本来のメール・パスワードで Supabase にログインしてセッションを返す。
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { OWNER_EMAIL } from "@/lib/serverAuth";

export const maxDuration = 15;

/** 長さに関係なく一定時間で比較する */
function same(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pinEnv = process.env.LOGIN_PIN;
  const email = OWNER_EMAIL;
  const password = process.env.LOGIN_PASSWORD;
  if (!url || !key || !pinEnv || !password) {
    return Response.json(
      { error: "番号ログインの設定がされていません（Vercel の環境変数 LOGIN_PIN / LOGIN_PASSWORD）" },
      { status: 500 },
    );
  }

  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return Response.json({ error: "4桁の数字を入力してください" }, { status: 400 });
  }

  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const status = await anon.rpc("pin_guard_status");
  if (status.error) {
    return Response.json({ error: `ログイン制限の確認に失敗しました: ${status.error.message}` }, { status: 500 });
  }
  if (status.data) {
    return Response.json({ error: "ロック中です", locked_until: status.data }, { status: 429 });
  }

  if (!same(pin, pinEnv)) {
    const fail = await anon.rpc("pin_guard_fail");
    const info = (fail.data ?? {}) as { locked_until?: string | null; remaining?: number };
    return Response.json(
      { error: "番号が違います", remaining: info.remaining ?? null, locked_until: info.locked_until ?? null },
      { status: info.locked_until ? 429 : 401 },
    );
  }

  let { data, error } = await anon.auth.signInWithPassword({ email, password });

  // 初回: 内部ユーザーがまだ無ければ作る（正しい PIN のときだけ通る）
  if (error && /invalid login credentials/i.test(error.message)) {
    // 「Confirm email」がオンのまま作ると未確認ユーザーができて詰まるので、先に設定を確認する
    const settings = (await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => r.json())
      .catch(() => ({}))) as { mailer_autoconfirm?: boolean; disable_signup?: boolean };
    if (!settings.mailer_autoconfirm || settings.disable_signup) {
      return Response.json(
        {
          error:
            "初回設定がまだです。Supabase の Authentication → Sign In / Providers → Email で「Confirm email」をオフ（新規登録はオンのまま）にしてから、もう一度番号を入力してください",
        },
        { status: 500 },
      );
    }
    const created = await anon.auth.signUp({ email, password });
    if (created.error) {
      return Response.json({ error: `初回設定に失敗しました: ${created.error.message}` }, { status: 500 });
    }
    if (!created.data.session) {
      return Response.json(
        {
          error:
            "初回設定の途中です。Supabase の Authentication → Sign In / Providers → Email の「Confirm email」をオフにしてから、もう一度番号を入力してください",
        },
        { status: 500 },
      );
    }
    data = { user: created.data.user!, session: created.data.session };
    error = null;
  }

  if (error || !data.session) {
    return Response.json({ error: `ログインできませんでした: ${error?.message ?? "不明なエラー"}` }, { status: 500 });
  }

  // ログイン済みのトークンで失敗回数をリセット（未ログインでは呼べない関数）
  const authed = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
  await authed.rpc("pin_guard_success");

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
