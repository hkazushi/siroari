// 勘定科目マスタ（青色申告決算書の並び順）
// コードは DB に保存されるので、既存コードの意味は変えないこと（追加は OK）。

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  /** 経費・売上の既定税率（0 = 不課税・非課税） */
  taxRate?: 0 | 8 | 10;
  /** 入力時のヒント（AI の科目推定にも使う） */
  hint?: string;
  /** 青色申告決算書で既定の欄が無い科目（空欄に手書きする科目） */
  custom?: boolean;
  /** 取引入力（振替）で選べるか */
  transferable?: boolean;
}

export const ACCOUNTS: Account[] = [
  // ---- 資産 ----
  { code: "1100", name: "現金", type: "asset", transferable: true },
  { code: "1110", name: "普通預金", type: "asset", transferable: true },
  { code: "1120", name: "定期預金", type: "asset", transferable: true },
  { code: "1200", name: "売掛金", type: "asset", transferable: true },
  { code: "1400", name: "前払金", type: "asset", transferable: true },
  { code: "1410", name: "仮払金", type: "asset", transferable: true },
  { code: "1500", name: "建物", type: "asset" },
  { code: "1510", name: "建物附属設備", type: "asset" },
  { code: "1520", name: "車両運搬具", type: "asset" },
  { code: "1530", name: "工具器具備品", type: "asset" },
  { code: "1540", name: "機械装置", type: "asset" },
  { code: "1550", name: "一括償却資産", type: "asset" },
  { code: "1600", name: "敷金・保証金", type: "asset", transferable: true },
  { code: "1900", name: "事業主貸", type: "asset", transferable: true, hint: "生活費の引き出し・私的な支払い" },

  // ---- 負債 ----
  { code: "2100", name: "買掛金", type: "liability", transferable: true },
  { code: "2110", name: "未払金", type: "liability", transferable: true, hint: "クレジットカードの未決済分など" },
  { code: "2120", name: "借入金", type: "liability", transferable: true },
  { code: "2130", name: "預り金", type: "liability", transferable: true },
  { code: "2140", name: "前受金", type: "liability", transferable: true },
  { code: "2900", name: "事業主借", type: "liability", transferable: true, hint: "個人のお金を事業に入れた" },

  // ---- 資本 ----
  { code: "3100", name: "元入金", type: "equity" },

  // ---- 収益 ----
  { code: "4100", name: "売上高", type: "revenue", taxRate: 10, hint: "施工代金・駆除作業・点検料" },
  { code: "4200", name: "雑収入", type: "revenue", taxRate: 10, hint: "本業以外の収入・紹介料" },

  // ---- 売上原価 ----
  { code: "5100", name: "仕入高", type: "expense", taxRate: 10, hint: "販売用の商品の仕入" },

  // ---- 経費（決算書の並び） ----
  { code: "6100", name: "租税公課", type: "expense", taxRate: 0, hint: "印紙・自動車税・固定資産税・事業税・消費税" },
  { code: "6110", name: "荷造運賃", type: "expense", taxRate: 10, hint: "宅配便・送料" },
  { code: "6120", name: "水道光熱費", type: "expense", taxRate: 10, hint: "電気・ガス・水道" },
  { code: "6130", name: "旅費交通費", type: "expense", taxRate: 10, hint: "電車・バス・タクシー・駐車場・高速道路" },
  { code: "6140", name: "通信費", type: "expense", taxRate: 10, hint: "携帯電話・インターネット・切手" },
  { code: "6150", name: "広告宣伝費", type: "expense", taxRate: 10, hint: "チラシ・ホームページ・ネット広告" },
  { code: "6160", name: "接待交際費", type: "expense", taxRate: 10, hint: "取引先との飲食・お中元・お歳暮" },
  { code: "6170", name: "損害保険料", type: "expense", taxRate: 0, hint: "賠償責任保険・自動車保険・火災保険" },
  { code: "6180", name: "修繕費", type: "expense", taxRate: 10, hint: "車や機材の修理" },
  { code: "6190", name: "消耗品費", type: "expense", taxRate: 10, hint: "10万円未満の道具・作業着・文房具" },
  { code: "6200", name: "減価償却費", type: "expense", taxRate: 0, hint: "固定資産から自動計上" },
  { code: "6210", name: "福利厚生費", type: "expense", taxRate: 10 },
  { code: "6220", name: "給料賃金", type: "expense", taxRate: 0 },
  { code: "6230", name: "外注工賃", type: "expense", taxRate: 10, hint: "応援の職人さん・下請けへの支払い" },
  { code: "6240", name: "利子割引料", type: "expense", taxRate: 0, hint: "借入金の利息" },
  { code: "6250", name: "地代家賃", type: "expense", taxRate: 10, hint: "事務所・倉庫・駐車場の賃料" },
  { code: "6260", name: "貸倒金", type: "expense", taxRate: 10 },
  // 空欄に記入する科目
  { code: "6300", name: "車両費", type: "expense", taxRate: 10, custom: true, hint: "ガソリン・オイル交換・車検・洗車" },
  { code: "6310", name: "薬剤・材料費", type: "expense", taxRate: 10, custom: true, hint: "殺虫剤・防蟻剤・ベイト剤・トラップ・資材" },
  { code: "6320", name: "支払手数料", type: "expense", taxRate: 10, custom: true, hint: "振込手数料・決済手数料・税理士報酬" },
  { code: "6330", name: "研修費", type: "expense", taxRate: 10, custom: true, hint: "講習・資格取得" },
  { code: "6340", name: "新聞図書費", type: "expense", taxRate: 10, custom: true, hint: "書籍・業界誌" },
  { code: "6350", name: "会議費", type: "expense", taxRate: 10, custom: true, hint: "打合せのお茶代" },
  { code: "6360", name: "諸会費", type: "expense", taxRate: 0, custom: true, hint: "協会・組合の会費" },
  { code: "6370", name: "固定資産除却損", type: "expense", taxRate: 0, custom: true },
  { code: "6390", name: "雑費", type: "expense", taxRate: 10, hint: "どれにも当てはまらないもの" },
];

const BY_CODE = new Map(ACCOUNTS.map((a) => [a.code, a]));

export function account(code: string): Account {
  return BY_CODE.get(code) ?? { code, name: `不明(${code})`, type: "expense" };
}

export function accountName(code: string): string {
  return account(code).name;
}

export const REVENUE_ACCOUNTS = ACCOUNTS.filter((a) => a.type === "revenue");
export const EXPENSE_ACCOUNTS = ACCOUNTS.filter((a) => a.type === "expense" && a.code !== "6200");
export const TRANSFER_ACCOUNTS = ACCOUNTS.filter((a) => a.transferable);
export const ASSET_ACCOUNTS_FOR_FIXED = ACCOUNTS.filter((a) =>
  ["1500", "1510", "1520", "1530", "1540", "1550"].includes(a.code),
);

/** 期首残高として入力できる科目（元入金は自動計算） */
export const OPENING_ACCOUNTS = ACCOUNTS.filter(
  (a) => (a.type === "asset" || a.type === "liability") && a.code !== "1900" && a.code !== "2900",
);

// ---- 決済手段（財布） ----
export type Wallet = "cash" | "bank" | "card" | "owner";

export const WALLETS: { id: Wallet; label: string }[] = [
  { id: "bank", label: "銀行口座" },
  { id: "cash", label: "現金" },
  { id: "card", label: "クレジットカード" },
  { id: "owner", label: "個人のお金（事業主）" },
];

export function walletLabel(w: Wallet): string {
  return WALLETS.find((x) => x.id === w)?.label ?? w;
}

/** 入金・支払で使う勘定科目 */
export function walletAccount(w: Wallet, kind: "income" | "expense"): string {
  switch (w) {
    case "cash":
      return "1100";
    case "bank":
      return "1110";
    case "card":
      // カード払いは未払金。売上のカード入金（決済代行）は売掛金扱い
      return kind === "expense" ? "2110" : "1200";
    case "owner":
      // 個人のお金で払った = 事業主借 / 個人口座に入金された = 事業主貸
      return kind === "expense" ? "2900" : "1900";
  }
}
