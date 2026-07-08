import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ImageUp, Loader2, X, ArrowRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import DropZone from "./DropZone";
import "./upscaler.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SCALES = ["2", "4"];
const FORMATS = ["png", "jpg", "webp"];

export default function UpscalerPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scale, setScale] = useState("4");
  const [format, setFormat] = useState("png");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { url, size, name }
  const inputRef = useRef(null);

  function handleFileSelect(selectedFile) {
    setFile(selectedFile);
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpscale() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("scale", scale);
      formData.append("format", format);

      const res = await fetch(`${API_URL}/upscaler/upscale`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const blob = await res.blob();
      const ext = format === "jpg" ? "jpg" : format;
      const outName = `upscaled_${scale}x_${Date.now()}.${ext}`;
      const url = URL.createObjectURL(blob);

      setResult({ url, name: outName, size: (blob.size / 1024).toFixed(1) });
      toast.success(`Imagen escalada ${scale}x lista para descargar`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.name;
    a.click();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20">
          <ImageUp size={22} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 leading-none mb-1">
            Upscaler de Imágenes
          </h2>
          <p className="text-xs text-slate-400">
            Escalado local 2x / 4x con Real-ESRGAN &mdash; sin subir datos a ningún servidor externo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo — controles */}
        <div className="flex flex-col gap-4">
          {/* Drop zone */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              1 · Imagen de entrada
            </p>
            {!file ? (
              <DropZone onFileSelect={handleFileSelect} />
            ) : (
              <div className="flex items-center gap-3 p-3 bg-violet-50/60 rounded-xl border border-violet-100">
                <ImageIcon size={20} className="text-violet-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {(file.size / 1024).toFixed(0)} KB &middot; {file.type.split("/")[1].toUpperCase()}
                  </p>
                </div>
                <button onClick={handleReset} className="text-slate-400 hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Escala */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              2 · Factor de escala
            </p>
            <div className="flex gap-2">
              {SCALES.map((s) => (
                <button
                  key={s}
                  className={`scale-btn flex-1 ${scale === s ? "active" : ""}`}
                  onClick={() => setScale(s)}
                >
                  {s}×
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              {scale === "2"
                ? "2× usa animevideov3 — ideal para ilustración y gráficos."
                : "4× usa realesrgan-x4plus — máxima calidad para fotografía."}
            </p>
          </div>

          {/* Formato salida */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              3 · Formato de salida
            </p>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  className={`format-btn flex-1 ${format === f ? "active" : ""}`}
                  onClick={() => setFormat(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Botón principal */}
          <button
            className="upscale-btn"
            onClick={handleUpscale}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando con Real-ESRGAN...
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                Escalar imagen
              </>
            )}
          </button>

          {loading && (
            <div className="flex flex-col gap-2">
              <div className="progress-bar-wrap">
                <div className="progress-bar-inner" style={{ width: "100%" }} />
              </div>
              <p className="text-[10px] text-center text-slate-400">
                El proceso puede tardar entre 5 y 60 segundos según el tamaño de la imagen y la GPU.
              </p>
            </div>
          )}
        </div>

        {/* Panel derecho — preview */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {!preview && !result && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 bg-white rounded-2xl border border-dashed border-slate-200 flex items-center justify-center min-h-[380px]"
              >
                <div className="text-center text-slate-300">
                  <ImageUp size={52} strokeWidth={1} className="mx-auto mb-3" />
                  <p className="text-sm font-medium">Sube una imagen para ver la comparación</p>
                </div>
              </motion.div>
            )}

            {(preview || result) && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <div className="preview-grid">
                  {/* Original */}
                  <div className="preview-card">
                    <img src={preview} alt="Original" />
                    <div className="preview-card-footer">
                      <span className="font-semibold text-slate-500">Original</span>
                      <span>{file ? `${(file.size / 1024).toFixed(0)} KB` : ""}</span>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div className="preview-card">
                    {result ? (
                      <>
                        <img src={result.url} alt={`Escalada ${scale}x`} />
                        <div className="preview-card-footer">
                          <span className="font-semibold text-violet-600">Escalada {scale}×</span>
                          <span>{result.size} KB</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center bg-slate-50 min-h-[220px] text-slate-300">
                        <div className="text-center">
                          <ImageUp size={36} strokeWidth={1} className="mx-auto mb-2" />
                          <p className="text-xs">Resultado aparecerá aquí</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón de descarga */}
                {result && (
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Download size={17} />
                    Descargar {result.name}
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
