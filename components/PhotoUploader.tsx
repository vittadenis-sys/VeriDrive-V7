"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const MAX_SIDE = 1200;
const JPEG_QUALITY = 0.6;

async function fileToOptimizedJpeg(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    if (!image.naturalWidth || !image.naturalHeight) return file;

    // iPhone/Android photos may store camera orientation in EXIF.
    // createImageBitmap with from-image normalizes it before drawing.
    let source: CanvasImageSource = image;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let bitmap: ImageBitmap | null = null;

    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        source = bitmap;
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
      } catch {
        // Safari/older browsers may not support the option; the decoded image is used as fallback.
      }
    }

    const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size === 0) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoUploader() {
  const [message, setMessage] = useState("");

  async function upload(form: FormData) {
    if (!supabase) return setMessage("Configura Supabase.");

    const inspectionId = String(form.get("inspection_id"));
    const file = form.get("photo") as File;
    if (!inspectionId || !file?.size) return setMessage("Inserisci l’ispezione e seleziona una foto.");

    setMessage("Ottimizzazione foto…");
    let optimized: File;
    try {
      optimized = await fileToOptimizedJpeg(file);
    } catch {
      optimized = file;
    }

    const path = `${inspectionId}/${crypto.randomUUID()}-${optimized.name}`;
    const { error: storageError } = await supabase.storage
      .from("inspection-photos")
      .upload(path, optimized, { contentType: "image/jpeg", upsert: false });

    if (storageError) return setMessage(storageError.message);

    const { error } = await supabase.from("photos").insert({
      inspection_id: inspectionId,
      storage_path: path,
      caption: form.get("caption"),
      check_id: Number(form.get("check_id")) || null,
    });

    setMessage(error ? error.message : "Foto caricata nella galleria.");
  }

  return (
    <form action={upload} className="panel form">
      <label>ID ispezione<input name="inspection_id" required /></label>
      <label>Controllo (1–50)<input name="check_id" type="number" min="1" max="50" /></label>
      <label className="full">Foto<input name="photo" type="file" accept="image/*" capture="environment" required /></label>
      <label className="full">Didascalia<input name="caption" /></label>
      <button className="button full">Carica foto</button>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
