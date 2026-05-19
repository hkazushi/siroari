import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `あなたは害虫識別の専門家です。
写真から害虫を識別し、JSON で結果を返してください。

# 出力 JSON
{
  "identified": true,           // 害虫が写っているか
  "primaryType": "pestRoach",   // 主に写っている害虫種
  "species": "チャバネゴキブリ", // 詳しい種名
  "confidence": "高",            // 高/中/低
  "description": "見分け方や特徴の解説（100 字程度）",
  "recommendations": [           // 対策の箇条書き 3 つ
    "ベイト剤（フィプロニル系）を高所と低所に分散設置",
    "発生源の水回り・厨房付近の清掃徹底",
    "IGR ピリプロキシフェン併用で繁殖抑制"
  ]
}

# primaryType の値
pestRoach (ゴキブリ) / pestAnt (アリ) / pestRodent (ネズミ・痕跡) / pestTermite (シロアリ) / pestFly (ハエ・蚊) / other (それ以外、害虫でないもの含む)

# ルール
- 確信できない時は confidence: "低" にする
- 害虫でない場合は identified: false、primaryType: "other"
- 食品害虫（コクゾウ等）や紙魚（シミ）も other
- 写真が不鮮明・暗い場合は素直にそう書く
`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageUrl } = await req.json();
    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: "imageBase64 か imageUrl が必要です" },
        { status: 400 },
      );
    }

    const dataUrl = imageBase64 ?? imageUrl;

    const raw = await openRouterChat({
      model: MODELS.fast,
      jsonMode: true,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この写真に写っている害虫を識別してください。",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI が JSON を返しませんでした");
      parsed = JSON.parse(m[0]);
    }
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
