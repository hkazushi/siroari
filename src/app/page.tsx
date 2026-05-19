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
  Sparkles,
  Mic,
  Camera,
  MessageSquare,
  FileText,
  Cloud,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <Header />
      <HomeDashboard />
      <Hero />
      <AIFeatures />
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
            href="/assistant"
            className="hidden items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-2 text-sm font-bold text-white shadow-sm hover:from-amber-600 hover:to-rose-600 md:inline-flex"
            title="AI コンシェルジュ"
          >
            <Sparkles size={14} />
            AI 相談
          </Link>
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
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-amber-300 ring-1 ring-amber-400/30">
            <Sparkles size={12} /> AI POWERED
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            東山メンテナンス
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            害虫から、快適な暮らしを守る。
          </p>
          <p className="mt-3 max-w-xl text-[13px] leading-7 text-slate-300">
            喋るだけで間取り作成、AI が報告書を執筆、ベテラン専門家がチャットで 24 時間相談に応じる
            <br className="hidden sm:block" />
            <strong className="text-amber-300">害虫駆除業に特化した AI 業務システム</strong>。
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
              <Cloud size={14} className="text-amber-300" />
              クラウド同期
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIFeatures() {
  const items = [
    {
      icon: Mic,
      title: "音声で間取り自動生成",
      desc: "「LDK 12畳、北側に寝室 6畳、キッチンにゴキブリ 3 匹」と喋るだけで、間取り図・害虫マーカー・施工内容まで全自動で AI が描画。畳数から正確な ㎡ 計算。",
      tag: "NEW",
    },
    {
      icon: FileText,
      title: "AI 報告書自動執筆",
      desc: "施工データから丁寧で専門的な報告書文章をワンクリックで生成。15 分の事務作業が 30 秒に。所見・備考欄が空でも AI が立派に書いてくれます。",
      tag: "NEW",
    },
    {
      icon: MessageSquare,
      title: "AI コンシェルジュ常駐",
      desc: "現場で困った時に専門家 AI に何でも相談。薬剤選定・クレーム返答文・法令確認まで、ベテラン経験者が横にいる感覚で。",
      tag: "NEW",
    },
    {
      icon: Camera,
      title: "写真から害虫 AI 判別",
      desc: "撮った写真を AI が解析し、害虫種類を識別。チャバネゴキブリ・クマネズミなど詳しい種別と、対策推奨を即提示。",
      tag: "NEW",
    },
  ];
  return (
    <section className="relative bg-gradient-to-br from-amber-50 via-white to-rose-50 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white">
            <Sparkles size={11} /> AI FEATURES
          </div>
          <h2 className="mt-2 text-2xl font-bold text-[#1e3a5f] sm:text-3xl">
            業務を一変させる 4 つの AI
          </h2>
          <p className="mt-2 text-[13px] text-slate-600">
            OpenAI / Gemini / Claude を組み合わせた最新の AI が、1 人事業を加速します
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f) => (
            <div
              key={f.title}
              className="relative rounded-xl border border-amber-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
            >
              {f.tag && (
                <div className="absolute -right-1 -top-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                  {f.tag}
                </div>
              )}
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-rose-100 text-[#991b1b]">
                <f.icon size={20} />
              </div>
              <div className="mt-3 text-base font-bold text-[#1e3a5f]">
                {f.title}
              </div>
              <div className="mt-1.5 text-[12px] leading-6 text-slate-600">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/editor?new=1"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-rose-600"
          >
            <Sparkles size={16} /> AI で間取りを描いてみる
          </Link>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50"
          >
            <MessageSquare size={16} /> AI に質問する
          </Link>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: MapPin,
      title: "手描き / 音声で間取り",
      desc: "910mm 半間グリッドに自動スナップ。Apple Pencil / 指 / マウス / 音声、好きな方法で。",
    },
    {
      icon: Bug,
      title: "害虫発見ポイント記録",
      desc: "ゴキブリ・アリ・ネズミ・シロアリ・ハエ蚊。種類別スタンプ + 写真添付 + Before/After 比較。",
    },
    {
      icon: ShieldCheck,
      title: "施工内容の見える化",
      desc: "毒餌・捕獲器・粘着シート・薬剤散布範囲・侵入経路。法令対応の薬剤使用記録も。",
    },
    {
      icon: Ruler,
      title: "面積を自動計算",
      desc: "畳数 / ㎡ をリアルタイム集計。総床面積も即表示。",
    },
    {
      icon: Save,
      title: "クラウド同期 + オフライン",
      desc: "Supabase で複数端末同期。圏外でも IndexedDB で作業継続、戻ったら自動アップロード。",
    },
    {
      icon: FileDown,
      title: "PDF / 公開リンク",
      desc: "A4 報告書 + お客様用閲覧 URL を発行。サイン・QR コード・施工前後写真も同梱。",
    },
  ];
  return (
    <section className="bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className="text-xs font-bold tracking-wider text-[#991b1b]">
            CORE FEATURES
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[#1e3a5f] sm:text-3xl">
            業務必須の基本機能
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
    { n: "1", t: "🎙️ 音声で説明", d: "「LDK 12畳、ゴキブリ3匹」と喋るだけ" },
    { n: "2", t: "🤖 AI が描く", d: "5 秒で間取り + マーカー自動生成" },
    { n: "3", t: "✍️ 微調整", d: "サイン・薬剤・写真を追加" },
    { n: "4", t: "📄 報告書発行", d: "AI が文章作成 → PDF / 公開リンク" },
  ];
  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <div className="text-xs font-bold tracking-wider text-[#991b1b]">
            WORKFLOW
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[#1e3a5f] sm:text-3xl">
            現場到着から報告書発行まで、最短 5 分。
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
          AI が間取り作成・報告書執筆・薬剤選定アドバイスまで。1 人事業の弱点を全部カバーします。
          <br />
          ブラウザだけで動くので、インストール不要。
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/editor?new=1"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:from-amber-600 hover:to-rose-600 sm:text-base"
          >
            <Sparkles size={18} />
            AI で新規マップを作る
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
