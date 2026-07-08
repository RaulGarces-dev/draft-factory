import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ImageUp, ArrowRight, X, ImageIcon, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DropZone from './DropZone';
import ComparisonSlider from './ComparisonSlider';
import useUpscaler from './useUpscaler';
import './upscaler.css';

const SCALES = ['2', '4'];
const FORMATS = ['png', 'jpg', 'webp'];

export default function UpscalerPage() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [scale, setScale] = useState('4');
    const [format, setFormat] = useState('png');

    const { status, progress, position, resultUrl, resultName, error, submit, reset, download } = useUpscaler();

    function handleFile(f) {
        setFile(f);
        setPreview(null);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(f);
        reset();
    }

    function handleReset() { setFile(null); setPreview(null); reset(); }

    async function handleSubmit() {
        if (!file) return;
        try {
            await submit(file, scale, format);
        } catch {
            toast.error('Error al iniciar el proceso.');
        }
    }

    // Notificacion toast cuando termina
    React.useEffect(() => {
        if (status === 'done') toast.success(`Imagen escalada ${scale}× lista para descargar`);
        if (status === 'error' && error) toast.error(error);
    }, [status]);

    const busy = status === 'queued' || status === 'processing';

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20">
                    <ImageUp size={22} className="text-white" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-800 leading-none mb-1">Upscaler de Imagenes</h2>
                    <p className="text-xs text-slate-400">Escalado local 2x / 4x con Real-ESRGAN — sin datos enviados a servidores externos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel de controles */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">1 · Imagen de entrada</p>
                        {!file ? (
                            <DropZone onFileSelect={handleFile} />
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-violet-50/60 rounded-xl border border-violet-100">
                                <ImageIcon size={20} className="text-violet-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                                    <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(0)} KB · {file.type.split('/')[1].toUpperCase()}</p>
                                </div>
                                <button onClick={handleReset} disabled={busy} className="text-slate-400 hover:text-red-400 transition-colors disabled:opacity-30">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">2 · Factor de escala</p>
                        <div className="flex gap-2">
                            {SCALES.map((s) => (
                                <button key={s} disabled={busy} onClick={() => setScale(s)} className={`scale-btn flex-1 ${scale === s ? 'active' : ''}`}>{s}×</button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400">{scale === '2' ? '2× usa animevideov3 — ideal para ilustracion y graficos.' : '4× usa realesrgan-x4plus — maxima calidad para fotografia.'}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">3 · Formato de salida</p>
                        <div className="flex gap-2">
                            {FORMATS.map((f) => (
                                <button key={f} disabled={busy} onClick={() => setFormat(f)} className={`format-btn flex-1 ${format === f ? 'active' : ''}`}>{f}</button>
                            ))}
                        </div>
                    </div>

                    <button className="upscale-btn" onClick={handleSubmit} disabled={!file || busy}>
                        {busy ? <><Loader2 size={18} className="animate-spin" />Procesando...</> : <><ArrowRight size={18} />Escalar imagen</>}
                    </button>
                </div>

                {/* Panel de resultado */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <AnimatePresence mode="wait">
                        {/* Estado: Cola */}
                        {status === 'queued' && (
                            <motion.div key="queued" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center gap-4 min-h-[380px]">
                                <Clock size={40} className="text-violet-400 animate-pulse" />
                                <p className="text-sm font-bold text-slate-700">En cola — posicion #{position}</p>
                                <p className="text-xs text-slate-400">Esperando turno de procesamiento...</p>
                            </motion.div>
                        )}

                        {/* Estado: Procesando */}
                        {status === 'processing' && (
                            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center gap-5 min-h-[380px]">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-pulse">
                                    <ImageUp size={28} className="text-white" />
                                </div>
                                <div className="w-full max-w-xs flex flex-col gap-2">
                                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                                        <span>Procesando con Real-ESRGAN...</span>
                                        <span className="text-violet-600 font-bold">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="progress-bar-wrap">
                                        <div className="progress-bar-inner" style={{ width: `${progress}%`, animation: 'none' }} />
                                    </div>
                                    <p className="text-[10px] text-center text-slate-400 mt-1">Usando modelo realesrgan-x{scale}plus · GPU Vulkan</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Estado: Listo — Slider comparacion */}
                        {status === 'done' && preview && resultUrl && (
                            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                                <ComparisonSlider before={preview} after={resultUrl} scale={scale} />
                                <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                    onClick={download}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-md shadow-emerald-500/20">
                                    <Download size={17} />
                                    Descargar {resultName}
                                </motion.button>
                            </motion.div>
                        )}

                        {/* Estado: Idle / vacio */}
                        {(status === 'idle' || status === 'error') && (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 bg-white rounded-2xl border border-dashed border-slate-200 flex items-center justify-center min-h-[380px]">
                                <div className="text-center text-slate-300">
                                    <ImageUp size={52} strokeWidth={1} className="mx-auto mb-3" />
                                    <p className="text-sm font-medium">Sube una imagen para ver la comparacion</p>
                                    {status === 'error' && <p className="text-xs text-red-400 mt-2">{error}</p>}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
