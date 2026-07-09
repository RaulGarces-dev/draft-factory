import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ImageUp, ArrowRight, X, ImageIcon, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DropZone from './DropZone';
import ComparisonSlider from './ComparisonSlider';
import useUpscaler from './useUpscaler';

const QUALITIES = ['HD', 'FHD', '2K', '4K'];
const FORMATS = ['png', 'jpg', 'webp'];

const QUALITY_DESC = {
    'HD': 'Resolución de 1280px. Procesamiento rápido.',
    'FHD': 'Resolución de 1920px. Estándar web.',
    '2K': 'Resolución de 2560px. Alta nitidez.',
    '4K': 'Resolución de 3840px. Máxima calidad fotográfica.'
};

const ENGAGING_MESSAGES = [
    "Analizando estructura de píxeles...",
    "Aplicando redes neuronales profundas...",
    "Reconstruyendo detalles fotográficos...",
    "Eliminando ruido y artefactos de compresión...",
    "Afinando la nitidez final...",
    "Optimizando paleta de colores...",
    "Mejorando texturas en alta resolución..."
];

function useEngagingMessage(isProcessing) {
    const [index, setIndex] = React.useState(0);
    React.useEffect(() => {
        if (!isProcessing) {
            setIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setIndex((i) => (i + 1) % ENGAGING_MESSAGES.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [isProcessing]);
    return ENGAGING_MESSAGES[index];
}

export default function SingleUpscaler() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [quality, setQuality] = useState('FHD');
    const [format, setFormat] = useState('png');

    const { status, progress, position, resultUrl, inputUrl, resultName, error, submit, reset, download } = useUpscaler();
    
    const busy = status === 'queued' || status === 'processing';
    const engagingMsg = useEngagingMessage(status === 'processing');

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
            await submit(file, quality, format);
        } catch {
            toast.error('Error al iniciar el proceso.');
        }
    }

    React.useEffect(() => {
        if (status === 'done') toast.success(`Imagen escalada a ${quality} lista para descargar`);
        if (status === 'error' && error) toast.error(error);
    }, [status, quality, error]);

    const estimatedMins = Math.ceil((position / 10) * 0.75) || 1;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">2 · Calidad de salida</p>
                    <div className="flex gap-2">
                        {QUALITIES.map((q) => (
                            <button key={q} disabled={busy} onClick={() => setQuality(q)} className={`scale-btn flex-1 ${quality === q ? 'active' : ''}`}>{q}</button>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400">{QUALITY_DESC[quality]}</p>
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
                    {busy ? <><Loader2 size={18} className="animate-spin" />Procesando...</> : <><ArrowRight size={18} />Escalar imagen a {quality}</>}
                </button>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
                <AnimatePresence mode="wait">
                    {status === 'queued' && (
                        <motion.div key="queued" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center gap-4 min-h-[380px] text-center">
                            <Clock size={40} className="text-violet-400 animate-pulse mb-2" />
                            <h3 className="text-lg font-bold text-slate-800 leading-tight">Eres la petición número #{position}</h3>
                            <p className="text-sm text-slate-500 font-medium bg-slate-100 py-1.5 px-4 rounded-full">
                                Tiempo estimado de espera: ~{estimatedMins} minuto{estimatedMins !== 1 ? 's' : ''}
                            </p>
                            <div className="mt-4 max-w-sm mx-auto p-4 bg-violet-50 rounded-xl border border-violet-100">
                                <p className="text-xs text-violet-700 font-medium leading-relaxed">
                                    Tu paciencia ayuda a mantener este software libre y gratuito para toda la comunidad de diseñadores. ¡Gracias por esperar!
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {status === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center gap-5 min-h-[380px]">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center pulse-glow scanner-container">
                                <ImageUp size={28} className="text-white relative z-10" />
                            </div>
                            <div className="w-full max-w-xs flex flex-col gap-2">
                                <div className="flex justify-between text-xs text-slate-500 font-medium">
                                    <AnimatePresence mode="wait">
                                        <motion.span key={engagingMsg} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="truncate">
                                            {engagingMsg}
                                        </motion.span>
                                    </AnimatePresence>
                                    <span className="text-violet-600 font-bold ml-2">{Math.round(progress)}%</span>
                                </div>
                                <div className="progress-bar-wrap">
                                    <div className="progress-bar-inner" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-[10px] text-center text-slate-400 mt-1">Generando resolución {quality} con Real-ESRGAN</p>
                            </div>
                        </motion.div>
                    )}

                    {status === 'done' && inputUrl && resultUrl && (
                        <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                            <ComparisonSlider before={inputUrl} after={resultUrl} scale={quality} />
                            <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                onClick={download}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-md shadow-emerald-500/20">
                                <Download size={17} />
                                Descargar {resultName}
                            </motion.button>
                        </motion.div>
                    )}

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
    );
}
