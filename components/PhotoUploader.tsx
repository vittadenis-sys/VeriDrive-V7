"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const MAX_SIDE = 800;
const JPEG_QUALITY = 0.4;
const MAX_PHOTOS = 4;

async function fileToOptimizedJpeg(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) return file;

    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "medium";
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size === 0) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoUploader() {
  const [message, setMessage] = useState("");
  const [photoCount, setPhotoCount] = useState(0);

  async function upload(form: FormData) {
    if (!supabase) return setMessage("Configura Supabase.");
    const inspectionId = String(form.get("inspection_id") ?? "").trim();
    const file = form.get("photo") as File;
    if (!inspectionId || !file?.size) return setMessage("Inserisci l’ispezione e seleziona una foto.");
    if (photoCount >= MAX_PHOTOS) return setMessage("Massimo 4 foto per ispezione.");

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
    if (error) return setMessage(error.message);

    setPhotoCount((count) => count + 1);
    setMessage(`Foto caricata. ${photoCount + 1}/${MAX_PHOTOS}`);
  }

  return (
    <form action={upload} className="panel form">
      <label>ID ispezione<input name="inspection_id" required /></label>
      <label>Controllo (1–50)<input name="check_id" type="number" min="1" max="50" /></label>
      <label className="full">Foto {photoCount}/{MAX_PHOTOS}<input name="photo" type="file" accept="image/*" required disabled={photoCount >= MAX_PHOTOS} /></label>
      <label className="full">Didascalia<input name="caption" /></label>
      <button className="button full" disabled={photoCount >= MAX_PHOTOS}>{photoCount >= MAX_PHOTOS ? "Massimo 4 foto raggiunto" : "Carica foto"}</button>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
