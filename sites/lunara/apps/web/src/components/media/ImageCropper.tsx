"use client";
import { ImagePlus, RotateCw, ZoomIn } from "lucide-react";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Btn, cx } from "../ui";

export async function fileToDataUrl(f: Blob) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

/** Downscale very large photos before editing so the cropper and storage stay light. */
export async function normalizeImage(f: Blob, max = 2048) {
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.9);
}

async function crop(src: string, area: Area, rotation: number, size: number) {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  // draw rotated full image, then cut out the crop area
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = img.width * cos + img.height * sin;
  const bh = img.width * sin + img.height * cos;
  const big = document.createElement("canvas");
  big.width = bw;
  big.height = bh;
  const b = big.getContext("2d")!;
  b.translate(bw / 2, bh / 2);
  b.rotate(rad);
  b.drawImage(img, -img.width / 2, -img.height / 2);
  const out = document.createElement("canvas");
  out.width = size;
  out.height = Math.round((size * area.height) / area.width);
  out.getContext("2d")!.drawImage(big, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.88);
}

/**
 * Crop / zoom / reposition / rotate with live preview.
 * The original image is kept by the caller so the user can re-crop it later without picking a new file.
 */
export function ImageCropper({ src, round, onCancel, onSave, onPickNew, outputSize = 512 }: { src: string; round?: boolean; onCancel: () => void; onSave: (cropped: string) => void | Promise<void>; onPickNew?: () => void; outputSize?: number }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onComplete = useCallback(
    async (_: Area, px: Area) => {
      setArea(px);
      setPreview(await crop(src, px, rotation, 160).catch(() => null));
    },
    [src, rotation],
  );
  return (
    <div className="space-y-4">
      <div className="relative h-72 overflow-hidden rounded-2xl bg-black sm:h-80">
        <Cropper image={src} crop={pos} zoom={zoom} rotation={rotation} aspect={1} cropShape={round ? "round" : "rect"} showGrid={!round} onCropChange={setPos} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={onComplete} />
      </div>
      <div className="flex items-center gap-3">
        <ZoomIn className="h-4 w-4 text-muted" />
        <input type="range" className="range flex-1" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zum" style={{ ["--pct" as string]: `${((zoom - 1) / 3) * 100}%` }} />
        <button type="button" aria-label="Putar 90 darjah" onClick={() => setRotation((r) => (r + 90) % 360)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full ring-1 ring-line hover:bg-card">
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted">Seret gambar untuk ubah kedudukan. Cubit atau guna slider untuk zum.</p>
      <div className="flex items-center gap-4">
        <div className={cx("h-20 w-20 shrink-0 overflow-hidden bg-card ring-2 ring-line", round ? "rounded-full" : "rounded-xl")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Pratonton" className="h-full w-full object-cover" />}
        </div>
        <span className="text-xs text-muted">Pratonton</span>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onPickNew && (
          <Btn variant="ghost" onClick={onPickNew} className="mr-auto">
            <ImagePlus className="h-4 w-4" /> Pilih gambar lain
          </Btn>
        )}
        <Btn variant="ghost" onClick={onCancel}>
          Batal
        </Btn>
        <Btn
          disabled={!area || busy}
          onClick={async () => {
            if (!area) return;
            setBusy(true);
            try {
              await onSave(await crop(src, area, rotation, outputSize));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Menyimpan…" : "Simpan"}
        </Btn>
      </div>
    </div>
  );
}
