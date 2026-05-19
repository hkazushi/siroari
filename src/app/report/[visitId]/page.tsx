"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import {
  loadVisit,
  getCustomer,
  getSite,
} from "@/lib/db";
import { isCloudConfigured } from "@/lib/supabase";
import { publishVisit, unpublishVisit } from "@/lib/sync";
import { photoSrc } from "@/lib/photoStorage";
import type { Visit, Customer, Site, Stamp } from "@/types";
import { stampDefOf } from "@/lib/stamps";
import { formatArea, polygonArea } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Share2, Copy, CheckCircle2 } from "lucide-react";

export default function ReportPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await loadVisit(visitId);
        if (!v) return;
        const [c, s] = await Promise.all([
          v.customerId ? getCustomer(v.customerId) : Promise.resolve(undefined),
          v.siteId ? getSite(v.siteId) : Promise.resolve(undefined),
        ]);
        if (cancelled) return;
        setVisit(v);
        setCustomer(c ?? null);
        setSite(s ?? null);
        // Map image from sessionStorage (set by editor before navigating)
        if (typeof window !== "undefined") {
          const img = sessionStorage.getItem(`report:${visitId}:map`);
          if (img) setMapImage(img);
        }
        // QR for next visit
        if (v.nextVisitDate) {
          const url = `${typeof window !== "undefined" ? window.location.origin : ""}/sites/${v.siteId ?? ""}`;
          const qr = await QRCode.toDataURL(url, {
            margin: 1,
            width: 120,
            errorCorrectionLevel: "M",
          });
          if (!cancelled) setQrDataUrl(qr);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visitId]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        読み込み中...
      </div>
    );
  }
  if (!visit) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        訪問記録が見つかりません
      </div>
    );
  }

  const pestStamps = visit.elements.filter(
    (e): e is Stamp =>
      e.type === "stamp" &&
      ["pestRoach", "pestAnt", "pestRodent", "pestTermite", "pestFly"].includes(
        e.stampType,
      ),
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

  const groupCount = (
    arr: Stamp[],
  ): Record<string, number> => {
    const m: Record<string, number> = {};
    for (const s of arr) m[s.stampType] = (m[s.stampType] ?? 0) + 1;
    return m;
  };

  const pestCounts = groupCount(pestStamps);
  const treatCounts = groupCount(treatStamps);

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      {/* Toolbar (hidden when printing) */}
      <div className="sticky top-0 z-20 border-b border-slate-300 bg-white px-4 py-3 shadow-sm print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-700">
            報告書プレビュー — {visit.name}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.history.back()}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← 戻る
            </button>
            <PublishButton visitId={visit.id} />
            <button
              onClick={() => window.print()}
              className="rounded-md bg-[#991b1b] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#7f1d1d]"
            >
              PDF として保存 / 印刷
            </button>
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-[210mm] text-[11px] text-slate-500">
          ヒント: ブラウザの印刷ダイアログで「送信先: PDF として保存」を選ぶと A4 PDF が生成されます。
        </div>
      </div>

      {/* A4 Sheet */}
      <div className="mx-auto my-4 max-w-[210mm] bg-white p-8 shadow-lg print:my-0 print:max-w-none print:shadow-none">
        {/* Letterhead */}
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
            <div className="text-base font-bold text-[#1e3a5f]">害虫防除施工報告書</div>
            <div>
              発行日:{" "}
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </div>
            {visit.visitNumber && <div>第 {visit.visitNumber} 回施工</div>}
          </div>
        </header>

        {/* Customer / Site / Visit info */}
        <section className="mt-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
            <InfoRow label="お客様名" value={customer?.name ?? "—"} />
            <InfoRow
              label="施工日"
              value={
                visit.visitDate
                  ? new Date(visit.visitDate).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
            <InfoRow label="現場名" value={site?.name ?? visit.name} />
            <InfoRow
              label="次回予定"
              value={
                visit.nextVisitDate
                  ? new Date(visit.nextVisitDate).toLocaleDateString("ja-JP")
                  : "—"
              }
            />
            <InfoRow
              label="所在地"
              value={site?.address ?? customer?.address ?? "—"}
              colSpan
            />
            <InfoRow
              label="建物種別 / 床面積"
              value={`${site?.buildingType ?? "—"} / ${site?.floorArea ?? "—"}㎡`}
            />
            <InfoRow
              label="連絡先"
              value={`${customer?.contactPerson ?? ""} ${customer?.contactPhone ? `(${customer.contactPhone})` : ""}`}
            />
            <InfoRow
              label="担当技術者"
              value={visit.technicianName ?? "—"}
            />
            <InfoRow
              label="資格番号"
              value={visit.technicianLicense ?? "—"}
            />
          </div>
        </section>

        {/* Findings */}
        <section className="mt-4">
          <SectionTitle>1. 発見された害虫</SectionTitle>
          {pestStamps.length === 0 ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              発見なし
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">害虫種類</th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-20">発見箇所数</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(pestCounts).map(([type, count]) => (
                  <tr key={type}>
                    <td className="border border-slate-300 px-2 py-1">
                      {stampDefOf(type as Stamp["stampType"]).label}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right">
                      {count} 箇所
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="border border-slate-300 px-2 py-1 text-right">合計</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    {pestStamps.length} 箇所
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        {/* Treatments */}
        <section className="mt-4">
          <SectionTitle>2. 実施した施工内容</SectionTitle>
          {treatStamps.length === 0 ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              なし
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">施工項目</th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-20">数量</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(treatCounts).map(([type, count]) => (
                  <tr key={type}>
                    <td className="border border-slate-300 px-2 py-1">
                      {stampDefOf(type as Stamp["stampType"]).label}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right">
                      {count} 箇所
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Chemicals */}
        <section className="mt-4">
          <SectionTitle>3. 使用薬剤一覧（建築物衛生法対応）</SectionTitle>
          {(visit.chemicals ?? []).length === 0 ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              なし
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">薬剤名</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">有効成分</th>
                  <th className="border border-slate-300 px-2 py-1 text-left w-20">希釈</th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-20">使用量</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">使用箇所</th>
                </tr>
              </thead>
              <tbody>
                {(visit.chemicals ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="border border-slate-300 px-2 py-1">{c.name}</td>
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
          )}
        </section>

        {/* Map */}
        <section className="mt-4 break-inside-avoid">
          <SectionTitle>
            4. 現場見取り図（総床面積: {formatArea(totalArea)}）
          </SectionTitle>
          {mapImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapImage}
              alt="現場マップ"
              className="w-full rounded border border-slate-300"
            />
          ) : (
            <div className="grid h-40 place-items-center rounded border border-slate-300 bg-slate-50 text-[11px] text-slate-500">
              マップ画像なし
            </div>
          )}
        </section>

        {/* Notes */}
        {visit.generalNotes && (
          <section className="mt-4 break-inside-avoid">
            <SectionTitle>5. 所見・備考</SectionTitle>
            <div className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
              {visit.generalNotes}
            </div>
          </section>
        )}

        {/* Photos */}
        <PhotosSection visit={visit} />

        {/* Signatures */}
        <section className="mt-6 grid grid-cols-2 gap-4 break-inside-avoid">
          <SignatureBox
            label="お客様 ご確認サイン"
            sig={visit.customerSignature}
          />
          <SignatureBox
            label="施工担当者サイン"
            sig={visit.technicianSignature}
          />
        </section>

        {/* QR + Footer */}
        <footer className="mt-6 flex items-end justify-between border-t border-slate-300 pt-3 text-[10px] text-slate-500">
          <div>
            <div>本書は害虫防除施工の記録として保管してください。</div>
            <div>建築物衛生法・PRTR 法に基づく薬剤使用記録を含みます。</div>
            <div className="mt-1">© 東山メンテナンス</div>
          </div>
          {qrDataUrl && (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="次回訪問QR" className="h-20 w-20" />
              <div className="mt-1 text-[9px]">次回訪問用 QR</div>
            </div>
          )}
        </footer>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html,
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

function PhotosSection({ visit }: { visit: Visit }) {
  type LabeledPhoto = {
    src: string;
    location: string;
    kind?: "before" | "after" | "other";
  };
  const photos: LabeledPhoto[] = [];
  for (const el of visit.elements) {
    if (el.type !== "stamp") continue;
    if (!el.photos || el.photos.length === 0) continue;
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
  const before = photos.filter((p) => p.kind === "before");
  const after = photos.filter((p) => p.kind === "after");
  const other = photos.filter((p) => !p.kind || p.kind === "other");
  return (
    <section className="mt-4 break-inside-avoid">
      <SectionTitle>6. 現場写真</SectionTitle>
      {before.length > 0 && after.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[10px] font-bold text-slate-600">
            施工前 / 施工後 比較
          </div>
          <div className="space-y-2">
            {Math.min(before.length, after.length) > 0 &&
              Array.from({
                length: Math.min(before.length, after.length),
              }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-2 break-inside-avoid"
                >
                  <PhotoBlock label="施工前" photo={before[i]} red />
                  <PhotoBlock label="施工後" photo={after[i]} />
                </div>
              ))}
          </div>
        </div>
      )}
      {(before.length > 0 || after.length > 0) &&
        (before.length !== after.length || other.length > 0) && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ...before.slice(Math.min(before.length, after.length)),
              ...after.slice(Math.min(before.length, after.length)),
              ...other,
            ].map((p, i) => (
              <PhotoBlock
                key={i}
                label={
                  p.kind === "before"
                    ? "施工前"
                    : p.kind === "after"
                      ? "施工後"
                      : "現場"
                }
                photo={p}
                red={p.kind === "before"}
              />
            ))}
          </div>
        )}
      {before.length === 0 && after.length === 0 && other.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {other.map((p, i) => (
            <PhotoBlock key={i} label="現場" photo={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function PhotoBlock({
  label,
  photo,
  red,
}: {
  label: string;
  photo: { src: string; location: string };
  red?: boolean;
}) {
  return (
    <div className="break-inside-avoid rounded border border-slate-200">
      <div
        className={`px-1.5 py-0.5 text-[9px] font-bold text-white ${red ? "bg-[#991b1b]" : "bg-[#1e3a5f]"}`}
      >
        {label}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={label}
        className="aspect-video w-full object-cover"
      />
      <div className="px-1.5 py-1 text-[9px] text-slate-600">
        {photo.location}
      </div>
    </div>
  );
}

function PublishButton({ visitId }: { visitId: string }) {
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isCloudConfigured()) {
    return null;
  }

  const publicUrl = slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}`
    : null;

  const onPublish = async () => {
    setBusy(true);
    try {
      const s = await publishVisit(visitId);
      setSlug(s);
    } catch (e) {
      alert(
        "公開リンク作成に失敗しました。Supabase のスキーマが未作成かもしれません。\n" +
          (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  const onUnpublish = async () => {
    setBusy(true);
    try {
      await unpublishVisit(visitId);
      setSlug(null);
      setCopied(false);
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(publicUrl);
    }
  };

  if (slug && publicUrl) {
    return (
      <div className="flex flex-wrap items-center gap-1 rounded-md border-2 border-emerald-300 bg-emerald-50 px-2 py-1">
        <span className="text-[10px] font-bold text-emerald-700">公開中</span>
        <input
          readOnly
          value={publicUrl}
          className="w-64 rounded border border-emerald-200 bg-white px-2 py-1 text-[10px]"
          onClick={(e) => e.currentTarget.select()}
        />
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
        >
          {copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
          {copied ? "コピー済" : "コピー"}
        </button>
        <button
          onClick={onUnpublish}
          disabled={busy}
          className="rounded border border-emerald-300 bg-white px-2 py-1 text-[10px] text-emerald-700 hover:bg-emerald-100"
        >
          公開停止
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onPublish}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      title="お客様用の閲覧専用 URL を発行します"
    >
      <Share2 size={12} />
      {busy ? "発行中..." : "公開リンク作成"}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 border-l-4 border-[#991b1b] pl-2 text-[12px] font-bold text-[#1e3a5f]">
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  colSpan = false,
}: {
  label: string;
  value: string;
  colSpan?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${colSpan ? "col-span-2" : ""}`}>
      <div className="w-24 shrink-0 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
        {label}
      </div>
      <div className="flex-1 border-b border-slate-200 px-2 py-1 text-[11px]">
        {value || "—"}
      </div>
    </div>
  );
}

function SignatureBox({ label, sig }: { label: string; sig?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 grid h-24 place-items-center rounded border border-slate-300 bg-white">
        {sig ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sig}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-[10px] text-slate-400">（サイン欄）</div>
        )}
      </div>
    </div>
  );
}
