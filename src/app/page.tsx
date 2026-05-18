import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  Download,
  Mail,
  FileText,
  MessageCircle,
  Newspaper,
  Briefcase,
  Bug,
  ShieldCheck,
  MapPin,
  ClipboardList,
  Phone,
  Building2,
} from "lucide-react";

const SIDE_MENU = [
  { label: "事業内容", icon: Briefcase, href: "#services" },
  { label: "対応害虫一覧", icon: Bug, href: "#pests" },
  { label: "施工事例", icon: ClipboardList, href: "#cases" },
  { label: "ご相談 / 見積り", icon: Mail, href: "#estimate" },
  { label: "電話で問い合わせ", icon: Phone, href: "tel:#" },
  { label: "法人・店舗様向け", icon: Building2, href: "#corp" },
  { label: "ジャーナル", icon: Newspaper, href: "#journal" },
  { label: "お客様サポート", icon: MessageCircle, href: "#support" },
];

const SIDE_ACTIONS = [
  { label: "見積依頼", icon: FileText, href: "#estimate" },
  { label: "施工マップを起動", icon: MapPin, href: "/editor" },
  { label: "資料ダウンロード", icon: Download, href: "#docs" },
  { label: "お問い合わせ", icon: Mail, href: "#contact" },
];

const SIDE_LINKS = [
  { label: "個人情報保護方針", href: "#" },
  { label: "会社案内", href: "#" },
];

const NAV_TABS = [
  { label: "事業内容", href: "#services" },
  { label: "対応害虫", href: "#pests" },
  { label: "施工の流れ", href: "#flow" },
  { label: "施工事例", href: "#cases" },
  { label: "施工マップを開く", href: "/editor", primary: true },
];

export default function Home() {
  return (
    <div className="flex w-full bg-white">
      <Sidebar />
      <MainArea />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      {/* Brand */}
      <div className="border-b border-slate-100 px-4 py-5">
        <div className="flex justify-center">
          <Logo size={140} withText={false} />
        </div>
        <div className="mt-3 text-center text-[13px] font-bold text-[#1e3a5f]">
          東山メンテナンス
        </div>
        <div className="mt-0.5 text-center text-[10px] text-slate-500">
          害虫から、快適な暮らしを守る。
        </div>
        <div className="mt-3 border-t border-slate-100 pt-2 text-center text-[10px] font-semibold tracking-wide text-[#991b1b]">
          害虫駆除 / 建物メンテナンス
        </div>
      </div>

      {/* Section */}
      <div className="px-2 py-3">
        <div className="px-3 pb-2 text-[11px] font-semibold text-[#991b1b]">
          サービス
        </div>
        <nav className="flex flex-col">
          {SIDE_MENU.map((m) => (
            <SideLink key={m.label} {...m} />
          ))}
        </nav>
      </div>

      <div className="my-1 border-t border-slate-100" />

      <div className="px-2 py-2">
        <nav className="flex flex-col">
          {SIDE_ACTIONS.map((m) => (
            <SideLink key={m.label} {...m} />
          ))}
        </nav>
      </div>

      <div className="my-1 border-t border-slate-100" />

      <div className="px-4 py-2 text-[11px] text-slate-500">
        {SIDE_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="flex items-center justify-between py-1 hover:text-slate-900"
          >
            <span>{l.label}</span>
            <span className="text-slate-300">↗</span>
          </a>
        ))}
      </div>

      {/* Phone CTA */}
      <div className="mx-3 mb-4 mt-2 overflow-hidden rounded">
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] p-3 text-white">
          <div className="flex items-center gap-1.5">
            <Phone size={14} className="text-amber-300" />
            <div className="text-[10px] text-slate-300">受付 9:00 – 18:00</div>
          </div>
          <div className="mt-0.5 text-[18px] font-black tracking-wider">
            000-0000-0000
          </div>
          <div className="mt-0.5 text-[10px] text-slate-300">
            無料現地調査 受付中
          </div>
        </div>
      </div>
    </aside>
  );
}

function SideLink({
  label,
  icon: Icon,
  href,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 rounded px-3 py-1.5 text-[12.5px] text-slate-700 hover:bg-slate-50"
    >
      <Icon size={14} className="text-slate-400" />
      <span>{label}</span>
    </a>
  );
}

function MainArea() {
  return (
    <div className="flex-1">
      <Hero />
      <NavTabs />
      <BodySection />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr]">
        {/* Left: logo + scene */}
        <div className="relative flex h-72 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] sm:h-80 lg:h-[480px]">
          <div className="absolute left-0 right-0 top-0 z-10 h-2 bg-[#991b1b]" />
          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            <div className="rounded-full bg-white p-4 shadow-2xl">
              <Logo size={220} withText={false} />
            </div>
            <div className="mt-4 text-[11px] font-bold tracking-[0.3em] text-amber-300">
              PEST CONTROL
            </div>
            <div className="mt-1 text-[10px] text-slate-300">
              SAFE &amp; EFFECTIVE · PROTECT YOUR SPACE
            </div>
          </div>
          {/* faint floor plan in the background */}
          <div className="absolute inset-0 opacity-10">
            <HeroIllustration />
          </div>
        </div>

        {/* Right: copy */}
        <div className="flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
          <div className="self-start rounded-sm bg-[#991b1b] px-3 py-1 text-xs font-bold text-white">
            害虫駆除のプロが、現場を、見える化する。
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-[#1e3a5f] sm:text-4xl">
            東山メンテナンス
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            害虫から、快適な暮らしを守る。
          </p>
          <p className="mt-4 text-[13.5px] leading-7 text-slate-700">
            本アプリは <span className="font-bold text-[#1e3a5f]">東山メンテナンス専用</span>{" "}
            の現場記録ツールです。タブレット・スマホで現場の見取り図を素早く作成し、
            害虫発見ポイント・毒餌設置場所・薬剤散布範囲などを記録できます。
            <br />
            <br />
            紙の図面に書き込んでいた情報を、現場で直接デジタル化。
            お客様への報告書・社内共有・次回施工時の参照まで、すべて一つのアプリで完結します。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/editor"
              className="rounded-md bg-[#991b1b] px-5 py-3 text-sm font-bold text-white shadow hover:bg-[#7f1d1d]"
            >
              施工マップを開く →
            </Link>
            <Link
              href="/projects"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              過去の現場記録
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 600 440"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* iPad mockup */}
      <rect x="60" y="60" width="480" height="340" rx="20" fill="#fff" stroke="#cbd5e1" strokeWidth="3" />
      <rect x="80" y="80" width="440" height="300" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
      {/* grid */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={`v${i}`} x1={80 + i * 44} y1={80} x2={80 + i * 44} y2={380} stroke="#e2e8f0" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h${i}`} x1={80} y1={80 + i * 40} x2={520} y2={80 + i * 40} stroke="#e2e8f0" />
      ))}
      {/* rooms */}
      <rect x="120" y="120" width="180" height="120" fill="#fef3c7" stroke="#1e293b" strokeWidth="2.5" />
      <rect x="300" y="120" width="140" height="120" fill="#dbeafe" stroke="#1e293b" strokeWidth="2.5" />
      <rect x="120" y="240" width="320" height="100" fill="#dcfce7" stroke="#1e293b" strokeWidth="2.5" />
      <text x="200" y="180" fontSize="14" fontWeight="bold" fill="#0f172a">キッチン</text>
      <text x="345" y="180" fontSize="14" fontWeight="bold" fill="#0f172a">脱衣所</text>
      <text x="260" y="295" fontSize="14" fontWeight="bold" fill="#0f172a">店舗フロア</text>
      {/* Pest markers */}
      <circle cx="170" cy="200" r="13" fill="#fee2e2" stroke="#991b1b" strokeWidth="2" />
      <text x="170" y="206" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#991b1b">G</text>
      <circle cx="250" cy="215" r="13" fill="#fee2e2" stroke="#991b1b" strokeWidth="2" />
      <text x="250" y="221" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#991b1b">蟻</text>
      <circle cx="370" cy="210" r="13" fill="#fef9c3" stroke="#a16207" strokeWidth="2" />
      <text x="370" y="215" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#a16207">侵入</text>
      {/* bait stations */}
      <rect x="180" y="280" width="20" height="20" fill="#fef9c3" stroke="#92400e" strokeWidth="2" />
      <text x="190" y="294" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#7c2d12">毒</text>
      <rect x="350" y="280" width="20" height="20" fill="#fef9c3" stroke="#92400e" strokeWidth="2" />
      <text x="360" y="294" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#7c2d12">毒</text>
      {/* spray zone */}
      <rect x="125" y="245" width="100" height="60" fill="none" stroke="#15803d" strokeWidth="2" strokeDasharray="6 4" />
      <text x="135" y="262" fontSize="9" fontWeight="bold" fill="#15803d">薬剤散布範囲</text>
      {/* Apple Pencil */}
      <g transform="translate(380 270) rotate(35)">
        <rect x="0" y="-6" width="160" height="12" rx="6" fill="#fff" stroke="#94a3b8" />
        <polygon points="160,-6 180,0 160,6" fill="#cbd5e1" stroke="#94a3b8" />
        <rect x="0" y="-6" width="12" height="12" fill="#1e293b" />
      </g>
      <circle cx="380" cy="270" r="3" fill="#1e293b" />
    </svg>
  );
}

function NavTabs() {
  return (
    <nav className="bg-[#0f172a] text-white">
      <div className="flex flex-wrap items-center">
        <div className="hidden bg-[#991b1b] px-4 py-2 text-sm font-bold sm:flex sm:items-center sm:gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-white">
            <Logo size={24} withText={false} />
          </div>
          害虫駆除
        </div>
        <div className="px-4 py-3 text-sm font-semibold sm:px-5">
          東山メンテナンス
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end">
          {NAV_TABS.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={
                t.primary
                  ? "bg-[#991b1b] px-4 py-3 text-sm font-bold hover:bg-[#7f1d1d]"
                  : "px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              }
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function BodySection() {
  return (
    <section className="bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center text-center">
          <div className="text-xs font-semibold text-slate-500">
            害虫駆除現場の記録アプリ
          </div>
          <div className="mt-3">
            <Logo size={160} withText={false} />
          </div>
          <h2 className="mt-3 text-3xl font-black text-[#1e3a5f] sm:text-4xl">
            東山メンテナンス
          </h2>
          <div className="mt-1 text-[13px] text-slate-500">
            害虫から、快適な暮らしを守る。
          </div>
        </div>

        {/* Stats / CTA */}
        <div className="mt-8 grid grid-cols-1 items-center gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[auto_1fr_auto] sm:p-8">
          <div className="flex items-center justify-center">
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-[#991b1b] bg-red-50 text-center">
              <div className="text-[10px] font-bold tracking-wider text-[#991b1b]">
                SAFE &amp; EFFECTIVE
              </div>
              <ShieldCheck className="my-1 text-[#991b1b]" size={28} />
              <div className="text-[10px] text-[#991b1b]">安心施工</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              対応害虫
            </div>
            <div className="mt-1 flex items-end gap-1 text-4xl font-black tracking-tight text-[#1e3a5f] sm:text-5xl">
              30
              <span className="text-2xl">種類以上</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              ゴキブリ・アリ・ネズミ・シロアリ・ハチ・ハエ・蚊・トコジラミ ほか
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/editor"
              className="rounded-md bg-[#991b1b] px-5 py-3 text-center text-sm font-bold text-white shadow hover:bg-[#7f1d1d]"
            >
              施工マップを開く →
            </Link>
            <Link
              href="/projects"
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              過去の現場一覧
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div id="features" className="mt-12">
          <h3 className="text-center text-lg font-bold text-[#1e3a5f]">
            このアプリでできること
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              num="01"
              title="現場の見取り図を即作成"
              desc="マウス・タッチ・Apple Pencil 統一対応。910mm 半間グリッドに自動スナップ＋直角補正で、現場で素早くまっすぐ描けます。"
            />
            <FeatureCard
              num="02"
              title="害虫発見ポイント記録"
              desc="ゴキブリ・アリ・ネズミ・シロアリ・ハエ／蚊 など、種類別スタンプで発生箇所をワンタップで記録。"
            />
            <FeatureCard
              num="03"
              title="施工内容の見える化"
              desc="毒餌・捕獲器・粘着シート・薬剤散布範囲・侵入経路・クラック・巣 など、施工に必要な記号を完備。"
            />
            <FeatureCard
              num="04"
              title="マルチデバイス対応"
              desc="PC（事務所）・iPad（現場）・スマホ（外出先）全対応。場所・時間を選ばず作業できます。"
            />
            <FeatureCard
              num="05"
              title="オフライン保存"
              desc="現場でネット環境が無くても作業継続。お客様ごとに複数現場を保存・履歴管理。"
            />
            <FeatureCard
              num="06"
              title="報告書 PDF 出力"
              desc="作った現場マップはワンクリックで PNG / PDF に出力。報告書・社内共有・お客様提出にそのまま使えます。"
            />
          </div>
        </div>

        {/* Workflow */}
        <div id="flow" className="mt-12 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <div className="text-center">
            <div className="inline-block rounded bg-red-50 px-2 py-1 text-[11px] font-bold text-[#991b1b]">
              現場フロー
            </div>
            <h3 className="mt-3 text-2xl font-bold text-[#1e3a5f]">
              現場到着から報告書発行まで、すべて 1 台で。
            </h3>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              { n: "1", t: "見取り図作成", d: "現場で建物の図面を描く" },
              { n: "2", t: "害虫マーキング", d: "発見箇所をスタンプで記録" },
              { n: "3", t: "施工記録", d: "毒餌・散布範囲を記録" },
              { n: "4", t: "報告書出力", d: "PDF 出力 → お客様共有" },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border border-slate-200 p-4">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1e3a5f] text-sm font-bold text-white">
                  {s.n}
                </div>
                <div className="mt-2 text-sm font-bold text-[#1e3a5f]">{s.t}</div>
                <div className="mt-1 text-[12px] text-slate-600">{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Spec */}
        <div id="spec" className="mt-12 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
            <div>
              <div className="inline-block rounded bg-red-50 px-2 py-1 text-[11px] font-bold text-[#991b1b]">
                アプリ仕様
              </div>
              <h3 className="mt-3 text-2xl font-bold text-[#1e3a5f]">
                現場で、すぐ使える。
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                ブラウザだけで動くので、アプリストアからのインストール不要。
                URL を開けば即起動。データは端末内に保存されるので、
                電波の無い建物内部でも安心して使えます。
              </p>
              <Link
                href="/editor"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152a47]"
              >
                今すぐ使ってみる →
              </Link>
            </div>
            <div className="rounded-lg bg-slate-50 p-6 ring-1 ring-slate-200">
              <div className="space-y-3 text-sm">
                <Spec label="対応デバイス" value="PC / iPad / スマートフォン" />
                <Spec label="入力" value="マウス / タッチ / Apple Pencil" />
                <Spec label="グリッド" value="910mm（半間） / 455mm" />
                <Spec label="害虫スタンプ" value="ゴキブリ・アリ・ネズミ・シロアリ 他" />
                <Spec label="施工スタンプ" value="毒餌・捕獲器・粘着・薬剤散布 他" />
                <Spec label="保存" value="端末内（オフライン対応）" />
                <Spec label="出力" value="PNG / PDF" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="mx-auto mt-12 max-w-5xl border-t border-slate-200 px-6 pt-6 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} 東山メンテナンス ／ 害虫から、快適な暮らしを守る。
      </footer>
    </section>
  );
}

function FeatureCard({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-black tracking-wider text-[#991b1b]">
        POINT {num}
      </div>
      <div className="mt-1.5 text-base font-bold text-[#1e3a5f]">{title}</div>
      <div className="mt-2 text-[12.5px] leading-6 text-slate-600">{desc}</div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="text-right text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
