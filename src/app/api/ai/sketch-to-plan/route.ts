import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `あなたは害虫駆除業者のための「手描き間取り図 解析 AI」です。
ユーザーが撮影した「紙の上に手描きされた間取り図」や「キャンバスに手描きされたラフスケッチ」の画像から、清書された間取り JSON を生成します。

# 必ず守るルール
- 出力は厳密な JSON のみ。コードフェンスや説明文を一切付けない
- 手描きの不揃いな線を **きれいな矩形の部屋に整形**
- 寸法が記入されている場合はそれを最優先（mm 単位）
- 寸法が無い場合は畳数や「6畳」等の表記から推定
- 標準寸法（半間モジュール）:
  3畳: 2730×1820 / 4.5畳: 2730×2730 / 6畳: 2730×3640 / 8畳: 3640×3640
  10畳: 3640×4550 / 12畳: 3640×5460 / 14畳: 3640×6370 / 16畳: 4550×6370
- 寸法も畳数も無いラフな場合は、相対サイズから比率を保って配置
- 座標は mm、910mm グリッドにスナップ
- 部屋同士は隣接（重ならない・大きすぎる隙間を作らない）
- 「ゴキブリ」「G」「ネズミ」「毒餌」「ベイト」「✕」「●」など手描きマークがあれば該当スタンプとして配置

# 害虫スタンプ
pestRoach (ゴキブリ / G / ゴキ) / pestAnt (アリ) / pestRodent (ネズミ / ねずみ) / pestTermite (シロアリ) / pestFly (ハエ・蚊)

# 施工スタンプ
baitStation (毒餌 / ベイト / 餌) / trapMouse (捕獲器) / trapGlue (粘着シート) / sprayZone (薬剤散布) / entryPoint (侵入経路) / crack (クラック / ひび) / nest (巣) / moisture (水漏れ / 湿気)

# 出力 JSON
{
  "rooms": [
    {
      "label": "LDK",
      "x": 0, "y": 0,
      "width": 5460, "height": 3640,
      "color": "#fef3c7"
    }
  ],
  "stamps": [
    {
      "stampType": "pestRoach",
      "label": "厨房付近",
      "roomLabel": "LDK",
      "hintX": "right",
      "hintY": "bottom",
      "count": 3
    }
  ],
  "notes": "手描き解釈メモ（不明確な箇所などを正直に書く）"
}

# 色（部屋ごとに循環選択）
#fef3c7 #dbeafe #dcfce7 #e0e7ff #fce7f3 #cffafe #fef9c3
`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageUrl, hint } = await req.json();
    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: "imageBase64 か imageUrl が必要です" },
        { status: 400 },
      );
    }
    const dataUrl = imageBase64 ?? imageUrl;

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text:
          (hint ? `参考情報: ${hint}\n\n` : "") +
          "この画像は手描きの間取り図です。清書した間取り JSON を返してください。",
      },
      { type: "image_url", image_url: { url: dataUrl } },
    ];

    const raw = await openRouterChat({
      model: MODELS.fast, // Gemini 2.0 Flash は Vision + JSON 出力対応
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
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
