import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, LayoutTemplate, Layers } from 'lucide-react';
import './constructor.css'; // Tailwind inyectado aquí

export default function LayoutConstructor({ children }) {

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar Minimalista */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm z-10 relative">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-petrol flex items-center justify-center text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <h1 className="text-xl font-bold text-petrol tracking-tight">Jaime asistent</h1>
          </div>
          <p className="text-xs text-gray-400 font-medium tracking-wider uppercase ml-11">Document Generator</p>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <LayoutTemplate size={18} />
            <span className="text-sm font-medium">Generador Estático</span>
          </a>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-orange-50 text-orange-garza relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-garza rounded-r-full"></div>
            <Layers size={18} className="relative z-10" />
            <span className="text-sm font-semibold relative z-10">Constructor IA</span>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">U</div>
            <span>Admin (Mock)</span>
          </div>
        </div>
      </aside>

      {/* Área Principal con Gradiente */}
      <main
        className="flex-1 relative overflow-y-auto"
        style={{ background: 'radial-gradient(circle at top right, #f3f4f6, #ffffff)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
