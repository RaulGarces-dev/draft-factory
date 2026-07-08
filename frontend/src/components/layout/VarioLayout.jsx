import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutTemplate, Layers, Wand2, ImageUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VarioLayout({ children }) {
  const location = useLocation();
  const pathname = location.pathname;

  // Comprobar qué ruta está activa
  const isStaticActive = pathname === '/' || pathname === '/servicios/diseno/creador-tarjetas/';
  const isIaActive = pathname.includes('/variantes-ia');
  const isConstructorActive = pathname.includes('/constructor');
  const isUpscalerActive = pathname.includes('/upscaler');

  // Obtener el título dinámico según la página activa
  let title = "Dashboard";
  if (isStaticActive) title = "Generador de Documentos Estáticos";
  if (isIaActive) title = "Generador de Variantes por IA";
  if (isConstructorActive) title = "Constructor Dinámico de Layouts";
  if (isUpscalerActive) title = "Upscaler de Imágenes";

  return (
    <div className="flex h-screen w-full bg-vario-50 dark:bg-vario-900 font-sans overflow-hidden antialiased">

      {/* Sidebar - Vario Suite */}
      <aside className="hidden w-66 flex-col border-r border-slate-100 bg-white dark:bg-vario-800 md:flex shadow-[1px_0_10px_rgba(0,0,0,0.01)] z-20 relative">
        <div className="flex h-16 items-center justify-start gap-3 border-b border-slate-100 px-6">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20"
          >
            <Layers size={16} />
          </motion.div>
          <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
            Vario <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Suite</span>
          </span>
        </div>

        <nav className="flex-1 overflow-auto py-6 px-4 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Módulos de Automatización
          </div>

          {/* Generador Estático */}
          <Link to="/" className="block relative">
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${isStaticActive
                  ? 'bg-violet-50/70 text-violet-600 font-semibold shadow-[0_2px_8px_rgba(109,40,217,0.04)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              {isStaticActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-violet-600 rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <LayoutTemplate size={18} className={isStaticActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <div className="flex flex-col">
                <span className="text-sm">Generador Estático</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 font-normal">Mapeo y exportación directa</span>
              </div>
            </motion.div>
          </Link>

          {/* Variantes IA 
          <Link to="/variantes-ia" className="block relative">
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${
                isIaActive 
                  ? 'bg-violet-50/70 text-violet-600 font-semibold shadow-[0_2px_8px_rgba(109,40,217,0.04)]' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {isIaActive && (
                <motion.div 
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-violet-600 rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <Wand2 size={18} className={isIaActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <div className="flex flex-col">
                <span className="text-sm">Variantes Inteligentes</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 font-normal">Creación guiada con IA</span>
              </div>
            </motion.div>
          </Link>*/}

          {/* Constructor IA 
          <Link to="/constructor" className="block relative">
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${
                isConstructorActive 
                  ? 'bg-violet-50/70 text-violet-600 font-semibold shadow-[0_2px_8px_rgba(109,40,217,0.04)]' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {isConstructorActive && (
                <motion.div 
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-violet-600 rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <Layers size={18} className={isConstructorActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <div className="flex flex-col">
                <span className="text-sm">Constructor Dinámico</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 font-normal">Ensamblado automatizado</span>
              </div>
            </motion.div>
          </Link>*/}

          {/* Upscaler de Imágenes */}
          <Link to="/upscaler" className="block relative">
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${isUpscalerActive
                  ? 'bg-violet-50/70 text-violet-600 font-semibold shadow-[0_2px_8px_rgba(109,40,217,0.04)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              {isUpscalerActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-violet-600 rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <ImageUp size={18} className={isUpscalerActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <div className="flex flex-col">
                <span className="text-sm">Upscaler de Imágenes</span>
                <span className="text-[9px] text-slate-400 font-normal">Escalado local con Real-ESRGAN</span>
              </div>
            </motion.div>
          </Link>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-3">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs shadow-sm">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-800 leading-none">Administrador</span>
              <span className="text-[9px] text-slate-400">Enterprise Tenant</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-100 bg-white dark:bg-vario-800 px-8 z-10">
          <div className="flex flex-col">
            <h1 className="text-md font-semibold text-slate-800 dark:text-white leading-none mb-1">{title}</h1>
            <span className="text-[10px] text-slate-400">Vario Suite v1.0.0 (PMI)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Local DB Connected</span>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <div className="h-2 w-2 rounded-full bg-violet-500"></div>
            </div>
          </div>
        </header>

        {/* Área de Trabajo */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50/50 dark:bg-vario-900">
          <div className="mx-auto max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </main>
    </div>
  );
}
