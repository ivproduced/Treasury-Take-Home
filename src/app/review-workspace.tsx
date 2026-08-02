"use client";

import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, FileImage, LoaderCircle, LockKeyhole, ShieldCheck, Upload, X } from "lucide-react";
import Image from "next/image";
import { APPLICATION_FIELD_LIMITS, type ApplicationFields, type ReviewResult } from "@/lib/review";

type QueueItem = { id: string; file: File; preview: string; status: "ready" | "processing" | "complete" | "error"; result?: ReviewResult; error?: string };
type RejectedFile = { id: string; name: string; reason: string };

const MAX_FILES = 20;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const INITIAL_FIELDS: ApplicationFields = {
  brandName: "Old Tom Distillery",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
};

const STATUS_LABELS = { pass: "Match", review: "Review", fail: "Mismatch" } as const;

export default function ReviewWorkspace({ demoMode }: { demoMode: boolean }) {
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const controllersRef = useRef(new Map<string, AbortController>());
  const removedItemIdsRef = useRef(new Set<string>());

  function addFiles(files: File[]) {
    const availableSlots = Math.max(0, MAX_FILES - items.length);
    const accepted: File[] = [];
    const rejected: RejectedFile[] = [];

    for (const file of files) {
      let reason: string | null = null;
      if (!ALLOWED_FILE_TYPES.has(file.type)) reason = "Unsupported type. Use JPEG, PNG, or WebP.";
      else if (file.size === 0) reason = "The file is empty.";
      else if (file.size > MAX_FILE_BYTES) reason = "Larger than the 8 MB limit.";
      else if (accepted.length >= availableSlots) reason = `Only ${MAX_FILES} artworks can be queued for one application record.`;

      if (reason) rejected.push({ id: crypto.randomUUID(), name: file.name, reason });
      else accepted.push(file);
    }

    setItems((current) => [...current, ...accepted.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: "ready" as const }))]);
    if (rejected.length) setRejectedFiles((current) => [...current, ...rejected]);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeItem(id: string) {
    removedItemIdsRef.current.add(id);
    controllersRef.current.get(id)?.abort();
    setItems((current) => {
      const item = current.find((candidate) => candidate.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((candidate) => candidate.id !== id);
    });
  }

  function updateField(key: keyof ApplicationFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setItems((current) => current.map((item) => item.status === "complete"
      ? { ...item, status: "ready", result: undefined, error: undefined }
      : item));
  }

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!items.length || isRunning) return;
    setIsRunning(true);

    for (const item of items) {
      if (item.status === "complete" || removedItemIdsRef.current.has(item.id)) continue;
      const controller = new AbortController();
      controllersRef.current.set(item.id, controller);
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "processing", error: undefined } : candidate));
      try {
        const body = new FormData();
        body.set("label", item.file);
        body.set("application", JSON.stringify(fields));
        const response = await fetch("/api/analyze", { method: "POST", body, signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Analysis failed.");
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "complete", result: payload } : candidate));
      } catch (error) {
        if (controller.signal.aborted) continue;
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "error", error: error instanceof Error ? error.message : "Analysis failed." } : candidate));
      } finally {
        controllersRef.current.delete(item.id);
      }
    }
    for (const item of items) removedItemIdsRef.current.delete(item.id);
    setIsRunning(false);
  }

  const completed = items.filter((item) => item.status === "complete").length;

  return (
    <main id="main-content" className="workspace">
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="Proofmark label review home">
          <span className="brand-mark" aria-hidden="true"><ShieldCheck size={20} /></span>
          <span>PROOFMARK</span>
        </a>
        <div className="session-note"><LockKeyhole size={16} aria-hidden="true" /><span>Private session · files are not retained</span></div>
      </header>

      {demoMode && (
        <aside className="mode-banner" aria-label="Demo simulation mode">
          <AlertTriangle size={20} aria-hidden="true" />
          <div><strong>Demo simulation mode</strong><span>Images are not inspected. Results use simulated evidence and always require manual review.</span></div>
        </aside>
      )}

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">TTB compliance workspace</p>
          <h1 id="page-title">Review label artwork</h1>
          <p>Compare application data with label evidence. AI recommendations are advisory; an agent makes the final determination.</p>
        </div>
        <div className="batch-stat" aria-label={`${items.length} artworks queued`}><strong>{items.length}</strong><span>artworks queued</span></div>
      </section>

      <form onSubmit={analyze} className="review-grid">
        <section className="application-panel" aria-labelledby="application-title">
          <div className="section-heading"><span>01</span><div><h2 id="application-title">Application record</h2><p>This record applies to every queued artwork.</p></div></div>
          <div className="field-grid">
            {([
              ["brandName", "Brand name"],
              ["classType", "Class / type"],
              ["alcoholContent", "Alcohol content"],
              ["netContents", "Net contents"],
            ] as const).map(([key, label]) => (
              <label key={key}>{label}<input required disabled={isRunning} maxLength={APPLICATION_FIELD_LIMITS[key]} value={fields[key]} onChange={(event) => updateField(key, event.target.value)} /></label>
            ))}
          </div>
        </section>

        <section className="upload-panel" aria-labelledby="upload-title">
          <div className="section-heading"><span>02</span><div><h2 id="upload-title">Label artwork</h2><p>Add up to 20 images for this application record.</p></div></div>
          <div className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => inputRef.current?.click()}>
            <Upload size={28} aria-hidden="true" />
            <strong>Choose label images</strong>
            <span>or drag and drop JPEG, PNG, or WebP · 8 MB maximum each</span>
            <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} />
            <button type="button" className="secondary-button" aria-describedby="file-help" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>Browse files</button>
            <span id="file-help" className="visually-hidden">Selected files appear in the review queue below.</span>
          </div>
          {rejectedFiles.length > 0 && (
            <div className="upload-errors" role="alert">
              <strong>Files not added</strong>
              <ul>{rejectedFiles.map((rejected) => <li key={rejected.id}><span><b>{rejected.name}</b> {rejected.reason}</span><button type="button" className="icon-button" aria-label={`Dismiss rejection for ${rejected.name}`} onClick={() => setRejectedFiles((current) => current.filter((candidate) => candidate.id !== rejected.id))}><X size={16} /></button></li>)}</ul>
            </div>
          )}
        </section>

        <section className="queue-panel" aria-labelledby="queue-title">
          <div className="queue-header">
            <div className="section-heading"><span>03</span><div><h2 id="queue-title">Artwork queue</h2><p>{items.length ? `${completed} of ${items.length} analyzed` : "No artwork added yet"}</p></div></div>
            <button className="primary-button" disabled={!items.length || isRunning} type="submit">
              {isRunning ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
              {isRunning ? "Analyzing…" : items.length ? `Analyze ${items.length} artwork${items.length === 1 ? "" : "s"}` : "Analyze artwork"}
            </button>
          </div>
          <p className="visually-hidden" aria-live="polite">{isRunning ? `Analyzing label ${completed + 1} of ${items.length}.` : items.length ? `${completed} of ${items.length} labels analyzed.` : "Queue empty."}</p>

          {!items.length ? (
            <div className="empty-state"><FileImage size={32} aria-hidden="true" /><p>Your label queue will appear here.</p></div>
          ) : (
            <ol className="queue-list">
              {items.map((item, index) => (
                <li key={item.id} className="queue-item">
                  <div className="file-summary">
                    <Image src={item.preview} alt="" width={54} height={54} unoptimized />
                    <div><span className="file-index">{String(index + 1).padStart(2, "0")}</span><strong>{item.file.name}</strong><small>{(item.file.size / 1024 / 1024).toFixed(1)} MB</small></div>
                    {item.status === "ready" && <span className="status neutral">Ready</span>}
                    {item.status === "processing" && <span className="status neutral"><LoaderCircle className="spin" size={15} /> Processing</span>}
                    {item.status === "error" && <span className="status fail"><AlertTriangle size={15} /> Error</span>}
                    {item.result && <span className={`status ${item.result.recommendation === "appears-compliant" ? "pass" : item.result.recommendation === "does-not-match" ? "fail" : "review"}`}>{item.result.recommendation === "appears-compliant" ? <Check size={15} /> : <AlertTriangle size={15} />}{item.result.recommendation.replaceAll("-", " ")}</span>}
                    <button type="button" className="icon-button" aria-label={`Remove ${item.file.name}`} onClick={() => removeItem(item.id)}><X size={18} /></button>
                  </div>
                  {item.error && <p className="error-message" role="alert">{item.error}</p>}
                  {item.result && (
                    <details className="results">
                      <summary>View comparison <ChevronDown size={17} aria-hidden="true" /></summary>
                      <div className="result-meta"><span>{item.result.mode === "ai" ? "Vision AI" : "Demo simulation"}</span><span>{item.result.confidence} confidence</span><span>Image quality: {item.result.imageQuality}</span><span>{item.result.durationMs} ms</span></div>
                      <div className="evidence-notes"><strong>Extraction notes</strong>{item.result.notes.length ? <ul>{item.result.notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>No extraction notes were returned.</p>}</div>
                      <div className="table-wrap"><table><caption className="visually-hidden">Application and label comparison for {item.file.name}</caption><thead><tr><th scope="col">Check</th><th scope="col">Application</th><th scope="col">Label evidence</th><th scope="col">Result</th></tr></thead><tbody>{item.result.checks.map((check) => <tr key={check.field}><th scope="row">{check.field}<small>{check.detail}</small></th><td>{check.expected}</td><td>{check.observed}</td><td><span className={`status ${check.status}`}>{check.status === "pass" ? <Check size={15} /> : <AlertTriangle size={15} />}{STATUS_LABELS[check.status]}</span></td></tr>)}</tbody></table></div>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </form>
      <footer><span>Proofmark prototype</span><span>Human review required · WCAG 2.2 AA target</span></footer>
    </main>
  );
}