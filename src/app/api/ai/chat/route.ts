import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `あなたは害虫駆除業界のベテラン専門家アシスタントです。
ユーザー（害虫駆除業者）の質問に、現場ですぐ役立つ具体的な助言をします。

# 回答の方針
- 簡潔（最大 400 字程度）、要点を箇条書きで
- 専門的だが分かりやすい
- 安全性（薬剤の取り扱い・人体影響・ペット・食品工場）を必ず考慮
- 法令（建築物衛生法、PRTR 法、毒物及び劇物取締法）を意識
- 「医師に相談を」「専門家判断を」など免責は最小限
- 不確実な場合は「現場確認が必要」と正直に
- 害虫種別ごとの **典型的な対策パターン** と **推奨薬剤の系統** を提示
  例: ゴキブリ → フィプロニル系ベイト + IGR ピリプロキシフェン
- 顧客対応（クレーム返答、説明文）の相談にも対応
- 1 メッセージで完結する回答を心がける
`;

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages が必要です" },
        { status: 400 },
      );
    }

    // 最大 20 件まで（コンテキスト制限）
    const recent: Msg[] = messages.slice(-20);

    const text = await openRouterChat({
      model: MODELS.smart,
      temperature: 0.7,
      maxTokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...recent.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });

    return NextResponse.json({ reply: text.trim() });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
