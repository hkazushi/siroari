import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HomeDashboard } from "@/components/HomeDashboard";
import {
  MapPin,
  Bug,
  ShieldCheck,
  Smartphone,
  FileDown,
  Save,
  Ruler,
  ArrowRight,
  Users,
  Calendar,
  Settings,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <Header />
      <HomeDashboard />
      <Hero />
      <Features />
      <Workflow />
      <CTASection />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 sm:px-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90">
          <Logo size={40} withText={false} />
          <div className="leading-tight">
            <div className="text-[14px] font-bold text-[#1e3a5f] sm:text-[15px]">
              東山メンテナンス
            </div>
            <div className="hidden text-[10px] text-slate-500 sm:block">
              害虫から、快適な暮らしを守る。
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/customers"
            className="hidden rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
          >
            <Users size={16} className="mr-1.5" />
            顧客
          </Link>
          <Link
            href="/calendar"
            className="hidden rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:inline-flex"
            title="訪問スケジュール"
          >
            <Calendar size={16} className="mr-1.5" />
            予定
          </Link>
          <Link
            href="/settings"
            className="rounded-md border border-slate-300 px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            title="設定"
          >
            <Settings size={16} />
          </Link>
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#991b1b] px-3 py-2 text-sm font-bold text-white shadow hover:bg-[#7f1d1d] sm:px-4"
          >
            <MapPin size={16} />
            <span>マップ</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#1e293b] to-[#0f172a] py-10 sm:py-14">
      <div className="absolute left-0 right-0 top-0 h-1 bg-[#991b1b]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-white p-2 shadow-2xl sm:p-3">
            <Logo size={120} withText={false} />
          </div>
          <div className="mt-4 text-[10px] font-bold tracking-[0.3em] text-amber-300">
            PEST CONTROL
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            東山メンテナンス
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            害虫から、快適な暮らしを守る。
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] text-slate-400 sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={14} className="text-amber-300" />
              SAFE &amp; EFFECTIVE
            </span>
            <span className="inline-flex items-center gap-1">
              <Smartphone size={14} className="text-amber-300" />
              PC / iPad / スマホ対応
            </span>
            <span className="inline-flex items-center gap-1">
              <Save size={14} className="text-amber-300" />
              クラウド同期
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: MapPin,
      title: "見取り図をすぐ作成",
      desc: "910mm 半間グリッドに自動スナップ。直角補正で素早くまっすぐ描けます。",
    },
    {
      icon: Bug,
      title: "害虫発見ポイント記録",
      desc: "ゴキブリ・アリ・ネズミ・シロアリ・ハエ蚊。種類別スタンプでワンタップ記録。",
    },
    {
      icon: ShieldCheck,
      title: "施工内容の見える化",
      desc: "毒餌・捕獲器・粘着シート・薬剤散布範囲・侵入経路 など完備。",
    },
    {
      icon: Ruler,
      title: "面積を自動計算",
      desc: "部屋を描くだけで ㎡・畳数を自動表示。総床面積もリアルタイム集計。",
    },
    {
      icon: Save,
      title: "クラウド同期",
      desc: "Supabase で複数端末同期。iPad の現場記録がそのまま事務所 PC に。",
    },
    {
      icon: FileDown,
      title: "PDF / 公開リンク",
      desc: "報告書 PDF と、お客様向け閲覧専用 URL を発行できます。",
    },
  ];
  return (
    <section className="bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className="text-xs font-bold tracking-wider text-[#991b1b]">
            FEATURES
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[#1e3a5f] sm:text-3xl">
            このアプリでできること
          </h2>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-[#991b1b]">
                <f.icon size={20} />
              </div>
              <div className="mt-3 text-base font-bold text-[#1e3a5f]">
                {f.title}
              </div>
              <div className="mt-1.5 text-[13px] leading-6 text-slate-600">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { n: "1", t: "見取り図作成", d: "現場で建物の図面を描く" },
    { n: "2", t: "害虫マーキング", d: "発見箇所をスタンプで記録" },
    { n: "3", t: "施工記録", d: "毒餌・散布範囲を記録" },
    { n: "4", t: "報告書出力", d: "PDF / 公開リンクで提出" },
  ];
  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className="text-xs font-bold tracking-wider text-[#991b1b]">
            WORKFLOW
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[#1e3a5f] sm:text-3xl">
            現場到着から報告書発行まで、1 台で。
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#1e3a5f] text-sm font-black text-white">
                  {s.n}
                </div>
                <div className="mt-3 text-sm font-bold text-[#1e3a5f] sm:text-base">
                  {s.t}
                </div>
                <div className="mt-1 text-[12px] leading-5 text-slate-600">
                  {s.d}
                </div>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight
                  size={20}
                  className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-300 sm:block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          現場でも、事務所でも、すぐ使える。
        </h2>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          ブラウザだけで動くので、インストール不要。スマホで開いて「ホーム画面に追加」すればアプリ感覚で起動できます。
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 rounded-lg bg-[#991b1b] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#7f1d1d] sm:text-base"
          >
            <MapPin size={18} />
            今すぐ施工マップを開く
          </Link>
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-500 bg-transparent px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:text-base"
          >
            <Users size={18} />
            顧客台帳
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2">
          <Logo size={28} withText={false} />
          <div className="text-[11px] text-slate-500">
            <div className="font-bold text-[#1e3a5f]">東山メンテナンス</div>
            <div>害虫から、快適な暮らしを守る。</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-400">
          © {new Date().getFullYear()} 東山メンテナンス
        </div>
      </div>
    </footer>
  );
}
