"use client";

import { nanoid } from "nanoid";
import { supabase, isCloudConfigured } from "@/lib/supabase";

const BUCKET = "visit-photos";

/**
 * data URL を File に変換。
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/jpeg";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * File / Blob から data URL を作る（base64）。
 */
export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * 画像を 1024px に縮小して JPEG 化（容量節約）。
 */
export async function compressImage(file: File | Blob, maxSide = 1024): Promise<Blob> {
  const dataUrl = await fileToDataUrl(file);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no canvas ctx");
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => {
    c.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob failed"));
      },
      "image/jpeg",
      0.85,
    );
  });
}

/**
 * Supabase Storage に画像をアップロードして公開 URL を返す。
 * 失敗時は null（呼び出し側で base64 にフォールバック）。
 */
export async function uploadToStorage(
  blob: Blob,
  pathPrefix: string,
): Promise<{ url: string; path: string } | null> {
  if (!isCloudConfigured()) return null;
  try {
    const sb = supabase();
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const path = `${pathPrefix}/${nanoid(10)}.${ext}`;
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) {
      console.warn("upload failed:", error.message);
      return null;
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
  } catch (e) {
    console.warn("upload threw:", e);
    return null;
  }
}

export async function deleteFromStorage(path: string): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    await supabase().storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.warn("delete failed:", e);
  }
}

/**
 * 写真ピッカー（File）→ 圧縮 → クラウドにアップ → URL / なければ base64 を返す
 */
export async function processAndUploadPhoto(
  file: File,
  pathPrefix: string,
): Promise<{ url?: string; storagePath?: string; data?: string }> {
  const compressed = await compressImage(file, 1024);
  // クラウド有効なら upload
  if (isCloudConfigured()) {
    const uploaded = await uploadToStorage(compressed, pathPrefix);
    if (uploaded) {
      return { url: uploaded.url, storagePath: uploaded.path };
    }
  }
  // フォールバック: base64
  const data = await fileToDataUrl(compressed);
  return { data };
}

/**
 * 既に base64 で保存されている写真を Supabase に移行（オプション）。
 */
export async function migrateBase64ToCloud(
  data: string,
  pathPrefix: string,
): Promise<{ url: string; path: string } | null> {
  if (!isCloudConfigured()) return null;
  const blob = dataUrlToBlob(data);
  return uploadToStorage(blob, pathPrefix);
}

/** 表示用 URL: クラウド URL を優先、無ければ base64 */
export function photoSrc(photo: {
  url?: string;
  data?: string;
}): string | undefined {
  return photo.url ?? photo.data;
}
