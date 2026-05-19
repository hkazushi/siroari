"use client";

import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { processAndUploadPhoto, photoSrc } from "@/lib/photoStorage";
import { nanoid } from "nanoid";
import type { EntityPhoto } from "@/types";

export function EntityPhotoSection({
  photos,
  pathPrefix,
  onChange,
  emptyHint = "外観・鍵保管場所など、関連写真を保存できます",
}: {
  photos: EntityPhoto[];
  pathPrefix: string;
  onChange: (next: EntityPhoto[]) => void | Promise<void>;
  emptyHint?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const onPick = async (file: File) => {
    setUploading(true);
    try {
      const result = await processAndUploadPhoto(file, pathPrefix);
      const photo: EntityPhoto = {
        id: nanoid(8),
        ...result,
        takenAt: Date.now(),
      };
      await onChange([...photos, photo]);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-600">
          関連写真 ({photos.length})
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#152a47] ${
            uploading ? "opacity-50" : ""
          }`}
        >
          <Camera size={12} /> {uploading ? "..." : "追加"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {photos.length === 0 ? (
        <div className="rounded bg-slate-50 px-3 py-3 text-center text-[10px] text-slate-400">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoSrc(p)}
                alt="関連写真"
                className="aspect-square w-full cursor-pointer rounded object-cover"
                onClick={() => {
                  const src = photoSrc(p);
                  if (src) window.open(src, "_blank");
                }}
              />
              <button
                onClick={() => remove(p.id)}
                className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-red-500 opacity-0 shadow group-hover:opacity-100"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
