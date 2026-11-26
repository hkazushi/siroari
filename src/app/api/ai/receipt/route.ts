// 領収書・レシート・請求書（画像 / PDF）を読み取って経費データを返す。
// ファイルはクライアントが先に Supabase Storage（receipts バケット）へ保存し、
// ここではそのパスを受け取ってログインユーザーの権限でダウンロードする
// （Vercel のリクエスト上限 4.5MB を避けるため、本文に画像を載せない）。
import { createClient } from "@supabase/supabase-js";
import { EXPENSE_ACCOUNTS, REVENUE_ACCOUNTS, WALLETS } from "@/lib/accounts";
import { ENTRY_JSON_SPEC, accountListForPrompt } from "@/lib/aiPrompt";
import { MODELS, extractJson, openRouterChat } from "@/lib/openrouter";
import { requireUser } from "@/lib/serverAuth";
import type { ReceiptEntry } from "@/lib/types";

export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

function normalize(raw: Record<string, unknown>, today: string): ReceiptEntry | null {
  const amount = Math.round(Number(String(raw.amount ?? "").replace(/[^\d.]/g, "")));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const kind = raw.kind === "income" ? "income" : "expense";
  const codes = (kind === "income" ? REVENUE_ACCOUNTS : EXPENSE_ACCOUNTS).map((a) => a.code);
  const code = String(raw.account_code ?? "");
  const date = String(raw.date ?? "");
  const rate = Number(raw.tax_rate);
  const wallet = String(raw.wallet ?? "");
  return {
    kind,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today,
    amount,
    account_code: codes.includes(code) ? code : kind === "income" ? "4100" : "6390",
    tax_rate: rate === 0 || rate === 8 || rate === 10 ? rate : 10,
    partner_name: String(raw.partner_name ?? "").slice(0, 100),
    memo: String(raw.memo ?? "").slice(0, 200),
    wallet: WALLETS.some((w) => w.id === wallet) ? (wallet as ReceiptEntry["wallet"]) : "cash",
    invoice_number: /^T\d{13}$/.test(String(raw.invoice_number ?? "")) ? String(raw.invoice_number) : "",
  };
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const { path, today } = (await req.json().catch(() => ({}))) as { path?: string; today?: string };
  const todayStr =
    typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)
      ? today
      : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // 日本時間の今日
  if (!path || !path.startsWith(`${user.id}/`) || path.includes("..")) {
    return Response.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }

  // ログインユーザーの権限でダウンロード（RLS で本人のフォルダだけ読める）
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${user.token}` } },
  });
  const { data: blob, error: dlError } = await sb.storage.from("receipts").download(path);
  if (dlError || !blob) {
    return Response.json({ error: `ファイルを読み込めませんでした: ${dlError?.message ?? ""}` }, { status: 400 });
  }
  if (blob.size > MAX_BYTES) return Response.json({ error: "ファイルが大きすぎます（20MB まで）" }, { status: 413 });

  const buf = Buffer.from(await blob.arrayBuffer());
  const isPdf = path.toLowerCase().endsWith(".pdf") || blob.type === "application/pdf";
  const mime = isPdf ? "application/pdf" : blob.type || "image/jpeg";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  try {
    const text = await openRouterChat({
      model: MODELS.vision,
      temperature: 0,
      maxTokens: 2000,
      messages: [
        {
          role: "system",
          content: `あなたは日本の個人事業主の経理担当です。領収書・レシート・請求書の画像や PDF から取引を読み取ります。今日は ${todayStr} です。

${accountListForPrompt()}

${ENTRY_JSON_SPEC}

【複数ある場合】1 つのファイルに別々の領収書が複数写っている（PDF の複数ページを含む）ときは、
{"entries": [ {...}, {...} ]} の形で 1 枚ずつ返す。1 枚だけなら {"entries": [ {...} ]}。
同じ領収書の明細行は分けず、合計金額で 1 件にする。
自分が支払ったもの（領収書・レシート・届いた請求書）は kind = "expense"。`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "このファイルの取引を読み取ってください。" },
            isPdf
              ? { type: "file", file: { filename: "receipt.pdf", file_data: dataUrl } }
              : { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });
    const parsed = extractJson<{ entries?: Record<string, unknown>[] } & Record<string, unknown>>(text);
    const rawList = Array.isArray(parsed.entries) ? parsed.entries : [parsed];
    const entries = rawList
      .map((r) => normalize(r, todayStr))
      .filter((e): e is ReceiptEntry => e !== null)
      .slice(0, 20);
    if (!entries.length) {
      return Response.json({ error: "金額を読み取れませんでした" }, { status: 422 });
    }
    return Response.json({ entries });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
