"use client";

import { useMemo } from "react";
import { useData } from "./data";
import { balanceSheet, booksForYear, monthly, profitLoss } from "./ledger";
import { consumptionTax } from "./tax";

/** 指定年の帳簿・決算書をまとめて計算 */
export function useBooks(year: number) {
  const { transactions, assets, profile } = useData();
  return useMemo(() => {
    const books = booksForYear(transactions, assets, profile, year);
    const pl = profitLoss(books, profile);
    const bs = balanceSheet(books, pl);
    const months = monthly(books);
    const tax = consumptionTax(transactions, assets, profile, year);
    return { books, pl, bs, months, tax };
  }, [transactions, assets, profile, year]);
}
