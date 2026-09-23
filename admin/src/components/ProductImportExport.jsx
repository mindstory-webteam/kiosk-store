import React, { useRef, useState } from "react";
import api, { downloadFile } from "../api/axios";
import { btnGhost, btnPrimary, btnQuiet, field, label } from "../ui";

const MODES = [
  { value: "upsert", label: "Add new + update existing" },
  { value: "create", label: "Only add new (skip existing)" },
  { value: "update", label: "Only update existing (skip new)" },
];

const MEDIA_MODES = [
  { value: "replace", label: "Replace images with the sheet's" },
  { value: "append", label: "Add the sheet's images to existing" },
  { value: "keep", label: "Keep existing images, ignore the sheet's" },
];

const ProductImportExport = ({ onImported }) => {
  const fileRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState("xlsx");
  const [mode, setMode] = useState("upsert");
  const [mediaMode, setMediaMode] = useState("replace");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ---------------- export ---------------- */

  const handleExport = async () => {
    setBusy("export");
    setError("");
    try {
      await downloadFile(`/products/export?format=${format}`, `products_export.${format}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Export failed");
    } finally {
      setBusy("");
    }
  };

  const handleTemplate = async () => {
    setBusy("template");
    setError("");
    try {
      await downloadFile(
        `/products/template?format=${format}`,
        `products_import_template.${format}`
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not get the template");
    } finally {
      setBusy("");
    }
  };

  /* ---------------- import ---------------- */

  const runImport = async (dryRun) => {
    if (!file) {
      setError("Choose a .xlsx or .csv file first.");
      return;
    }
    setBusy(dryRun ? "validate" : "import");
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("mediaMode", mediaMode);
    formData.append("dryRun", dryRun ? "true" : "false");

    try {
      const { data } = await api.post("/products/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      if (!dryRun && (data.summary?.created || data.summary?.updated)) onImported?.();
    } catch (err) {
      const data = err.response?.data;
      if (data?.summary) setResult(data);
      setError(data?.message || err.message || "Import failed");
    } finally {
      setBusy("");
    }
  };

  const summary = result?.summary;

  return (
    <div className="mb-6 rounded-panel border border-rule bg-porcelain">
      {/* ---- header bar ---- */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <h3 className="font-display text-[16px] text-ink">Bulk import and export</h3>
          <p className="mt-0.5 text-[12px] text-ink/45">
            Excel or CSV in the Shopify product-export layout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            aria-label="File format"
            className={`${field} w-auto py-2`}
          >
            <option value="xlsx">.xlsx</option>
            <option value="csv">.csv</option>
          </select>

          <button onClick={handleExport} disabled={!!busy} className={`${btnGhost} py-2`}>
            {busy === "export" ? "Preparing..." : "Export all"}
          </button>

          <button onClick={handleTemplate} disabled={!!busy} className={`${btnGhost} py-2`}>
            {busy === "template" ? "Preparing..." : "Template"}
          </button>

          <button onClick={() => setOpen((v) => !v)} className={`${btnPrimary} py-2`}>
            {open ? "Close import" : "Import file"}
          </button>
        </div>
      </div>

      {/* ---- import panel ---- */}
      {open && (
        <div className="border-t border-rule px-5 py-5">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className={label}>File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setResult(null);
                  setError("");
                }}
                className="block w-full text-[13px] text-ink/60 file:mr-3 file:rounded-panel file:border file:border-ink/20 file:bg-transparent file:px-3 file:py-2 file:text-[13px] file:text-ink hover:file:border-ink"
              />
            </div>

            <div>
              <label className={label}>What to do with rows</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className={field}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Images on existing products</label>
              <select
                value={mediaMode}
                onChange={(e) => setMediaMode(e.target.value)}
                className={field}
              >
                {MEDIA_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-4 max-w-[80ch] text-[12px] leading-relaxed text-ink/45">
            Rows are matched on Handle, falling back to Variant SKU. Rows sharing a handle are
            merged into one product, with the extra rows treated as additional images and
            variants.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => runImport(true)}
              disabled={!!busy || !file}
              className={btnGhost}
            >
              {busy === "validate" ? "Checking..." : "Validate only"}
            </button>
            <button
              onClick={() => runImport(false)}
              disabled={!!busy || !file}
              className={btnPrimary}
            >
              {busy === "import" ? "Importing..." : "Import now"}
            </button>
            {(file || result) && (
              <button onClick={reset} disabled={!!busy} className={btnQuiet}>
                Clear
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-panel border border-clay/30 bg-clay/5 px-3 py-2 text-[13px] text-clay"
            >
              {error}
            </div>
          )}

          {summary && (
            <div className="mt-5 rounded-panel border border-rule bg-white p-5">
              <p className="text-[14px] text-ink">
                {result.message}
                {summary.dryRun && " Nothing was saved."}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-rule bg-rule sm:grid-cols-5">
                {[
                  ["Rows read", summary.rows],
                  ["Products", summary.products],
                  ["Created", summary.created],
                  ["Updated", summary.updated],
                  ["Skipped or failed", (summary.skipped || 0) + (summary.failed || 0)],
                ].map(([text, value]) => (
                  <div key={text} className="bg-porcelain px-3 py-3 text-center">
                    <div className="font-display text-[22px] leading-none tabular-nums text-ink">
                      {value ?? 0}
                    </div>
                    <div className="mt-1.5 text-[11px] text-ink/45">{text}</div>
                  </div>
                ))}
              </div>

              {result.errors?.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[12px] text-ink/50">
                    Row notes ({result.errors.length}
                    {result.truncatedErrors
                      ? ` of ${result.errors.length + result.truncatedErrors}`
                      : ""}
                    )
                  </p>
                  <div className="max-h-56 overflow-y-auto rounded-panel border border-rule">
                    <table className="w-full text-left text-[12px]">
                      <thead className="sticky top-0 bg-porcelain">
                        <tr>
                          <th className="px-3 py-2 font-normal text-ink/50">Line</th>
                          <th className="px-3 py-2 font-normal text-ink/50">Handle</th>
                          <th className="px-3 py-2 font-normal text-ink/50">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule">
                        {result.errors.map((e, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 tabular-nums text-ink/50">{e.line}</td>
                            <td className="px-3 py-2 text-ink/50">{e.handle || "—"}</td>
                            <td className="px-3 py-2 text-clay">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductImportExport;