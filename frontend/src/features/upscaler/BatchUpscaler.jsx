import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, UploadCloud, FileArchive, X, CheckCircle, AlertCircle, Loader2, Play, Clock } from 'lucide-react';
import useBatchUpscaler from './useBatchUpscaler';
import './upscaler.css';

const QUALITIES = ['HD', 'FHD', '2K', '4K'];
const FORMATS = ['png', 'jpg', 'webp'];

export default function BatchUpscaler() {
    const { 
        files, setFiles, 
        quality, setQuality, 
        format, setFormat, 
        status, globalProgress, completedCount, 
        fileStatuses, 
        startBatch, reset, downloadZip 
    } = useBatchUpscaler();

    const onDrop = useCallback(acceptedFiles => {
        if (status !== 'idle') return;
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, [status, setFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop, 
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        disabled: status !== 'idle'
    });

    const removeFile = (indexToRemove) => {
        setFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const isProcessing = status === 'processing';
    const isDone = status === 'done';

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shrink-0">
                    <Layers size={24} className="text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold leading-none mb-2">Modo por Lotes (Batch Mode)</h3>
                    <p className="text-sm text-violet-100 leading-relaxed">
                        Sube hasta 100 imágenes simultáneamente. El sistema organizará una cola inteligente que escalará tus fotos en paquetes usando múltiples tarjetas gráficas en paralelo sin saturar tu conexión. Ideal para catálogos, texturas o colecciones de diseño. Al terminar, obtendrás un archivo comprimido .ZIP con todas tus fotos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controles de subida y configuracion */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Archivos</p>
                        
                        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center gap-3 ${isDragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-400 hover:bg-slate-50'} ${status !== 'idle' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                            <input {...getInputProps()} />
                            <UploadCloud size={32} className={isDragActive ? "text-violet-500" : "text-slate-400"} />
                            <div className="text-sm">
                                <span className="font-semibold text-violet-600">Haz clic</span> o arrastra tus imágenes
                            </div>
                            <p className="text-[10px] text-slate-400">PNG, JPG o WEBP</p>
                        </div>

                        {files.length > 0 && status === 'idle' && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-600 mb-2">{files.length} imagen(es) listas</p>
                                <div className="max-h-[150px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                    {files.map((f, i) => (
                                        <div key={`${f.name}-${i}`} className="flex justify-between items-center text-xs py-1.5 px-2 bg-white rounded border border-slate-100">
                                            <span className="truncate flex-1 max-w-[180px]">{f.name}</span>
                                            <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-slate-400 hover:text-red-500 shrink-0">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Calidad Global</p>
                        <div className="flex gap-2">
                            {QUALITIES.map((q) => (
                                <button key={q} disabled={isProcessing} onClick={() => setQuality(q)} className={`scale-btn flex-1 ${quality === q ? 'active' : ''}`}>{q}</button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Formato de Salida</p>
                        <div className="flex gap-2">
                            {FORMATS.map((f) => (
                                <button key={f} disabled={isProcessing} onClick={() => setFormat(f)} className={`format-btn flex-1 ${format === f ? 'active' : ''}`}>{f}</button>
                            ))}
                        </div>
                    </div>

                    {status === 'idle' && files.length > 0 && (
                        <button className="upscale-btn w-full" onClick={startBatch}>
                            <Play size={18} /> Iniciar Procesamiento de Lote
                        </button>
                    )}

                    {status !== 'idle' && (
                        <button className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors" onClick={reset}>
                            Reiniciar / Cancelar
                        </button>
                    )}
                </div>

                {/* Panel de Progreso */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col min-h-[500px]">
                        
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Estado del Lote</h3>
                            <div className="text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                                {completedCount} / {files.length}
                            </div>
                        </div>

                        {files.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                <Layers size={48} strokeWidth={1} className="mb-3" />
                                <p className="text-sm font-medium text-slate-400">Agrega imágenes para comenzar el lote</p>
                            </div>
                        ) : (
                            <>
                                {/* Barra global */}
                                <div className="mb-8">
                                    <div className="flex justify-between text-xs text-slate-500 font-bold mb-2">
                                        <span>Progreso Total</span>
                                        <span>{globalProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full transition-all duration-500" style={{ width: `${globalProgress}%` }}></div>
                                    </div>
                                </div>

                                {/* Lista de archivos individual */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2">
                                    <AnimatePresence>
                                        {files.map((file, i) => {
                                            const fileState = fileStatuses[file.name] || { status: 'pending', progress: 0 };
                                            return (
                                                <motion.div key={file.name + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                                                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    
                                                    <div className="w-8 flex justify-center">
                                                        {fileState.status === 'pending' && <Clock size={16} className="text-slate-400" />}
                                                        {fileState.status === 'uploading' && <UploadCloud size={16} className="text-blue-400 animate-pulse" />}
                                                        {fileState.status === 'processing' && <Loader2 size={16} className="text-violet-500 animate-spin" />}
                                                        {fileState.status === 'done' && <CheckCircle size={16} className="text-emerald-500" />}
                                                        {fileState.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between mb-1">
                                                            <p className="text-xs font-semibold text-slate-700 truncate pr-2">{file.name}</p>
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                {fileState.status === 'pending' && 'En cola'}
                                                                {fileState.status === 'uploading' && 'Subiendo'}
                                                                {fileState.status === 'processing' && 'Mágia IA'}
                                                                {fileState.status === 'done' && 'Listo'}
                                                                {fileState.status === 'error' && 'Error'}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-300 ${fileState.status === 'done' ? 'bg-emerald-500' : fileState.status === 'error' ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${fileState.progress || 0}%` }}></div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}

                        <AnimatePresence>
                            {isDone && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-slate-100">
                                    <button onClick={downloadZip} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base transition-all shadow-lg shadow-emerald-500/30">
                                        <FileArchive size={20} />
                                        Descargar Paquete ZIP ({completedCount} imágenes)
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </div>
            </div>
        </div>
    );
}
