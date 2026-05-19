import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, MODELS } from "@/lib/openrouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `あなたは害虫害獣識別の専門家です。
写真から害虫害獣を識別し、JSON で結果を返してください。

# 出力 JSON
{
  "identified": true,
  "primaryType": "pestRoach",
  "species": "チャバネゴキブリ",
  "confidence": "高",
  "description": "見分け方や特徴の解説（100 字程度、生態・危険性含む）",
  "recommendations": [
    "ベイト剤（フィプロニル系）を高所と低所に分散設置",
    "発生源の水回り・厨房付近の清掃徹底",
    "IGR ピリプロキシフェン併用で繁殖抑制"
  ]
}

# primaryType（識別可能な全種別）
害虫:
- pestRoach (ゴキブリ各種: チャバネ・クロ・ヤマト)
- pestAnt (アリ: クロアリ・ヒアリ・アルゼンチンアリ等)
- pestTermite (シロアリ: ヤマトシロアリ・イエシロアリ)
- pestFly (ハエ各種)
- pestMosquito (蚊: ヒトスジシマカ・アカイエカ等)
- pestBee (ハチ: スズメバチ・アシナガバチ・ミツバチ)
- pestSpider (クモ: 一般的なクモ・セアカゴケグモ等)
- pestCentipede (ムカデ)
- pestMillipede (ヤスデ)
- pestHouseCentipede (ゲジゲジ)
- pestBedbug (トコジラミ・南京虫)
- pestMite (ダニ: ヒョウヒダニ・マダニ等)
- pestFlea (ノミ)
- pestSilverfish (シミ・紙魚)
- pestStinkbug (カメムシ)
- pestMoth (ガ・イガ)
- pestDrainFly (チョウバエ)
- pestEarwig (ハサミムシ)
- pestWeevil (コクゾウ・穀象等の貯穀害虫)

害獣:
- pestRodent (ネズミ種類不明)
- pestRat (ドブネズミ)
- pestMouse (ハツカネズミ)
- pestWeasel (イタチ)
- pestCivet (ハクビシン)
- pestRaccoon (アライグマ)
- pestRaccoonDog (タヌキ)
- pestBat (コウモリ)
- pestSnake (ヘビ: マムシ等含む)
- pestStrayCat (野良猫)

害鳥:
- pestPigeon (ハト・ドバト)
- pestSparrow (スズメ)
- pestCrow (カラス: ハシブト・ハシボソ)
- pestStarling (ムクドリ)
- pestSwallow (ツバメ)

その他:
- other (識別不能・害虫害獣でない・痕跡のみ等)

# ルール
- 確信できない時は confidence: "低"
- 害虫害獣でない場合は identified: false、primaryType: "other"
- 写真が不鮮明・暗い場合は素直にそう書く
- 痕跡（足跡・糞・抜け殻・かじり跡）のみの場合は推定種を返しつつ confidence: "中" 程度に
- 危険な種（スズメバチ・セアカゴケグモ・マムシ等）は description に「注意」「危険」を含める
- recommendations は **その種に特化した** 対策を 3 つ。汎用的な内容は避ける
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
