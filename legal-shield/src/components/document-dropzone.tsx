"use client";

import { FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

interface DocumentDropzoneProps {
  onAnalyze: (payload: { text: string; file: File | null }) => Promise<void>;
  loading: boolean;
}

export function DocumentDropzone({ onAnalyze, loading }: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const submit = async () => {
    await onAnalyze({ text, file });
  };

  const onFile = (candidate: File | undefined) => {
    if (!candidate) return;
    setFile(candidate);
  };

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragActive ? "border-emerald-500 bg-emerald-50" : "border-blue-200 bg-blue-50/50"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          onFile(event.dataTransfer.files?.[0]);
        }}
      >
        <UploadCloud className="mx-auto mb-3 h-8 w-8 text-blue-700" />
        <p className="text-sm font-semibold text-blue-950">Drag and drop a legal file</p>
        <p className="mt-1 text-xs text-slate-600">Supports PDF or plain text. You can also paste text below.</p>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => inputRef.current?.click()}
        >
          <FileText className="h-4 w-4" />
          Choose file
        </button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".pdf,.txt,text/plain,application/pdf"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        {file ? <p className="mt-3 text-xs text-slate-700">Selected: {file.name}</p> : null}
      </div>

      <label className="mt-4 block text-sm font-semibold text-blue-950" htmlFor="document-text">
        Or paste document text
      </label>
      <textarea
        id="document-text"
        className="mt-2 min-h-36 w-full rounded-xl border border-blue-100 bg-white p-3 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2"
        placeholder="Paste contract or lease text here..."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      <button
        type="button"
        disabled={loading || (!text.trim() && !file)}
        className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={submit}
      >
        {loading ? "Analyzing..." : "Analyze document"}
      </button>
    </section>
  );
}
