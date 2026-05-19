"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicVisit } from "@/lib/sync";
import { isCloudConfigured } from "@/lib/supabase";
import { photoSrc } from "@/lib/photoStorage";
import type { Visit, Customer, Site, Stamp } from "@/types";
import { stampDefOf, PEST_STAMP_TYPES } from "@/lib/stamps";
import { formatArea, polygonArea } from "@/lib/utils";
import { Logo } from "@/components/Logo";

export default function PublicReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "no-cloud" }
    | { kind: "not-found" }
    | {
        kind: "ok";
        visit: Visit;
        customer?: Customer;
        site?: Site;
      }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isCloudConfigured()) {
        if (!cancelled) setState({ kind: "no-cloud" });
        return;
      }
      const r = await getPublicVisit(slug);
      if (cancelled) return;
      if (!r) setState({ kind: "not-found" });
      else setState({ kind: "ok", ...r });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === "loading") {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        読み込み中...
      </div>
    );
  }
  if (state.kind === "no-cloud") {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <Logo size={80} />
          <div className="mt-3 text-sm text-slate-500">
            この公開リンクは現在ご利用いただけません。
          </div>
        </div>
      </div>
    );
  }
  if (state.kind === "not-found") {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <Logo size={80} />
          <div className="mt-3 text-sm text-slate-500">
            お探しの報告書は見つかりませんでした。
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            リンクの有効期限が切れているか、公開が解除された可能性があります。
          </div>
        </div>
      </div>
    );
  }

  const { visit, customer, site } = state;

  const pestStamps = visit.elements.filter(
    (e): e is Stamp =>
      e.type === "stamp" &&
      (PEST_STAMP_TYPES as string[]).includes(e.stampType),
  );
  const treatStamps = visit.elements.filter(
    (e): e is Stamp =>
      e.type === "stamp" &&
      [
        "baitStation",
        "trapMouse",
        "trapGlue",
        "sprayZone",
        "entryPoint",
        "crack",
        "nest",
        "moisture",
      ].includes(e.stampType),
  );
  const rooms = visit.elements.filter((e) => e.type === "room");
  const totalArea = rooms.reduce(
    (s, r) => s + ("points" in r ? polygonArea(r.points) : 0),
    0,
  );

  const groupCount = (arr: Stamp[]): Record<string, number> => {
    const m: Record<string, number> = {};
    for (const s of arr) m[s.stampType] = (m[s.stampType] ?? 0) + 1;
    return m;
  };
  const pestCounts = groupCount(pestStamps);
  const treatCounts = groupCount(treatStamps);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl bg-white p-6 shadow sm:p-8">
        {/* Header */}
        <header className="flex items-start justify-between border-b-2 border-[#1e3a5f] pb-3">
          <div className="flex items-center gap-3">
            <Logo size={56} withText={false} />
            <div>
              <div className="text-lg font-black text-[#1e3a5f]">
                東山メンテナンス
              </div>
              <div className="text-[10px] text-slate-500">
                害虫から、快適な暮らしを守る。
              </div>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-600">
            <div className="text-base font-bold text-[#1e3a5f]">
              害虫防除施工報告書
            </div>
            <div>
              発行日:{" "}
              {visit.visitDate
                ? new Date(visit.visitDate).toLocaleDateString("ja-JP")
                : new Date(visit.updatedAt).toLocaleDateString("ja-JP")}
            </div>
            {visit.visitNumber && <div>第 {visit.visitNumber} 回施工</div>}
          </div>
        </header>

        {/* Customer info */}
        <section className="mt-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <Row label="お客様名" value={customer?.name ?? "—"} />
            <Row label="現場名" value={site?.name ?? visit.name} />
            <Row
              label="所在地"
              value={site?.address ?? customer?.address ?? "—"}
              colSpan
            />
            <Row label="建物種別" value={site?.buildingType ?? "—"} />
            <Row
              label="床面積"
              value={site?.floorArea ? `${site.floorArea}㎡` : "—"}
            />
            {visit.nextVisitDate && (
              <Row
                label="次回予定"
                value={new Date(visit.nextVisitDate).toLocaleDateString(
                  "ja-JP",
                )}
                colSpan
              />
            )}
          </div>
        </section>

        {/* Findings */}
        <section className="mt-4">
          <Title>発見された害虫</Title>
          {pestStamps.length === 0 ? (
            <Empty>発見なし</Empty>
          ) : (
            <SimpleTable
              rows={Object.entries(pestCounts).map(([type, count]) => [
                stampDefOf(type as Stamp["stampType"]).label,
                `${count} 箇所`,
              ])}
              footer={["合計", `${pestStamps.length} 箇所`]}
            />
          )}
        </section>

        {/* Treatments */}
        <section className="mt-4">
          <Title>実施した施工内容</Title>
          {treatStamps.length === 0 ? (
            <Empty>なし</Empty>
          ) : (
            <SimpleTable
              rows={Object.entries(treatCounts).map(([type, count]) => [
                stampDefOf(type as Stamp["stampType"]).label,
                `${count} 箇所`,
              ])}
            />
          )}
        </section>

        {/* Chemicals */}
        <section className="mt-4">
          <Title>使用薬剤</Title>
          {(visit.chemicals ?? []).length === 0 ? (
            <Empty>なし</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 px-2 py-1 text-left">
                      薬剤名
                    </th>
                    <th className="border border-slate-300 px-2 py-1 text-left">
                      有効成分
                    </th>
                    <th className="border border-slate-300 px-2 py-1 text-left">
                      希釈
                    </th>
                    <th className="border border-slate-300 px-2 py-1 text-right">
                      使用量
                    </th>
                    <th className="border border-slate-300 px-2 py-1 text-left">
                      使用箇所
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(visit.chemicals ?? []).map((c) => (
                    <tr key={c.id}>
                      <td className="border border-slate-300 px-2 py-1">
                        {c.name}
                      </td>
                      <td className="border border-slate-300 px-2 py-1">
                        {c.activeIngredient ?? "—"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1">
                        {c.dilution ?? "—"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right">
                        {c.amount} {c.unit}
                      </td>
                      <td className="border border-slate-300 px-2 py-1">
                        {c.location ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Total area */}
        <section className="mt-4">
          <Title>現場概況</Title>
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[12px]">
            総床面積: <strong>{formatArea(totalArea)}</strong> ／ 部屋数:{" "}
            <strong>{rooms.length}</strong>
          </div>
        </section>

        {/* Notes */}
        {visit.generalNotes && (
          <section className="mt-4">
            <Title>所見・備考</Title>
            <div className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
              {visit.generalNotes}
            </div>
          </section>
        )}

        {/* Photos */}
        <PhotosBlock visit={visit} />

        {/* Signatures */}
        <section className="mt-4 grid grid-cols-2 gap-3">
          <SignatureBox label="お客様 ご確認" sig={visit.customerSignature} />
          <SignatureBox label="施工担当者" sig={visit.technicianSignature} />
        </section>

        <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
          本書は害虫防除施工の記録としてお客様の閲覧用に発行されました。
          <br />
          © 東山メンテナンス
        </footer>
      </div>
    </div>
  );
}

function PhotosBlock({ visit }: { visit: Visit }) {
  type LP = { src: string; location: string; kind?: "before" | "after" | "other" };
  const photos: LP[] = [];
  for (const el of visit.elements) {
    if (el.type !== "stamp" || !el.photos) continue;
    const def = stampDefOf(el.stampType);
    for (const p of el.photos) {
      const src = photoSrc(p);
      if (!src) continue;
      photos.push({
        src,
        location: `${def.label}${el.note ? ` / ${el.note}` : ""}`,
        kind: p.kind,
      });
    }
  }
  if (photos.length === 0) return null;
  return (
    <section className="mt-4">
      <Title>現場写真</Title>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p, i) => {
          const isBefore = p.kind === "before";
          const isAfter = p.kind === "after";
          return (
            <div
              key={i}
              className="overflow-hidden rounded border border-slate-200"
            >
              <div
                className={`px-1.5 py-0.5 text-[9px] font-bold text-white ${
                  isBefore
                    ? "bg-[#991b1b]"
                    : isAfter
                      ? "bg-emerald-600"
                      : "bg-[#1e3a5f]"
                }`}
              >
                {isBefore ? "施工前" : isAfter ? "施工後" : "現場"}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.location}
                className="aspect-video w-full object-cover"
              />
              <div className="px-1.5 py-1 text-[9px] text-slate-600">
                {p.location}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 border-l-4 border-[#991b1b] pl-2 text-[12px] font-bold text-[#1e3a5f]">
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
      {children}
    </div>
  );
}
function Row({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string;
  colSpan?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${colSpan ? "sm:col-span-2" : ""}`}>
      <div className="w-24 shrink-0 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
        {label}
      </div>
      <div className="flex-1 border-b border-slate-200 px-2 py-1 text-[11px]">
        {value || "—"}
      </div>
    </div>
  );
}
function SimpleTable({
  rows,
  footer,
}: {
  rows: [string, string][];
  footer?: [string, string];
}) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a}>
            <td className="border border-slate-300 px-2 py-1">{a}</td>
            <td className="w-24 border border-slate-300 px-2 py-1 text-right">
              {b}
            </td>
          </tr>
        ))}
        {footer && (
          <tr className="bg-slate-50 font-bold">
            <td className="border border-slate-300 px-2 py-1 text-right">
              {footer[0]}
            </td>
            <td className="border border-slate-300 px-2 py-1 text-right">
              {footer[1]}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
function SignatureBox({ label, sig }: { label: string; sig?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 grid h-20 place-items-center rounded border border-slate-300 bg-white">
        {sig ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sig}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-[10px] text-slate-400">—</div>
        )}
      </div>
    </div>
  );
}
