import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** id / created_at / updated_at を除いた入力用オブジェクトを作る */
export function stripMeta<T extends { id: string; created_at?: string; updated_at?: string }>(
  o: T,
): Omit<T, "id" | "created_at" | "updated_at"> {
  const copy: Partial<T> = { ...o };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  return copy as Omit<T, "id" | "created_at" | "updated_at">;
}
