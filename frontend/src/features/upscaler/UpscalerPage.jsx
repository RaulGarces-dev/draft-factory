import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUp, Layers, MousePointer2 } from 'lucide-react';
import SingleUpscaler from './SingleUpscaler';
import BatchUpscaler from './BatchUpscaler';

export default function UpscalerPage() {
    const [mode, setMode] = useState('single'); // 'single' | 'batch'

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full pb-10">
            {/* Header and Mode Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
                        <ImageUp size={22} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-800 leading-none mb-1.5 tracking-tight">Vario Upscaler AI</h2>
                        <p className="text-xs font-medium text-slate-400">Escalado neuronal con resolución fotográfica</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-xl self-stretch md:self-auto shrink-0 w-full md:w-auto">
                    <button 
                        onClick={() => setMode('single')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'single' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <MousePointer2 size={16} /> Individual
                    </button>
                    <button 
                        onClick={() => setMode('batch')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'batch' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Layers size={16} /> Por Lotes (BETA)
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {mode === 'single' && (
                    <motion.div key="single" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        <SingleUpscaler />
                    </motion.div>
                )}
                {mode === 'batch' && (
                    <motion.div key="batch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        <BatchUpscaler />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
