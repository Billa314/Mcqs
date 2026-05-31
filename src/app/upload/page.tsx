"use client";

import { useState } from "react";

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!files?.length) return;
    setLoading(true);
    setStatus("");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const form = new FormData();
        form.append("file", file);
        const up = await fetch("/api/upload-pdf", { method: "POST", body: form });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error ?? `Upload failed: ${file.name}`);
        setStatus(`Uploaded ${i + 1}/${files.length}: ${file.name}`);
      }

      setStatus("Running OCR on images…");
      const gen = await fetch("/api/generate-mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagesOnly: true, useData: true, replace: true }),
      });
      const genData = await gen.json();
      if (!gen.ok) throw new Error(genData.message ?? genData.error);

      setStatus(
        genData.message ??
          `Done: ${genData.mcqCount} MCQs from ${genData.imageCount} images.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Images</h1>
        <p className="mt-1 text-slate-600">
          Add past-paper photos (JPG/PNG). Each image is OCR&apos;d and turned
          into quiz questions. PDFs are optional and often lower quality.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          multiple
          className="mx-auto block text-sm"
          onChange={(e) => setFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={!files?.length || loading}
          onClick={upload}
          className="mt-4 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Processing…" : "Upload Images & Build MCQs"}
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Or run locally:{" "}
        <code className="rounded bg-slate-100 px-1">npm run process-images -- --force</code>
      </p>

      {status && (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">
          {status}
        </p>
      )}
    </div>
  );
}
