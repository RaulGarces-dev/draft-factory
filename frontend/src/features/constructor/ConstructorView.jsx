import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Dropzone from '../../common/Dropzone';
import axios from 'axios';

export default function ConstructorView() {
  const [configFile, setConfigFile] = useState(null);
  const [dataFile, setDataFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Analizando ADN de la marca...",
    "IA redactando copies y ensamblando diseño...",
    "Renderizando píxeles...",
    "Empaquetando lote final..."
  ];

  const handleGenerate = async () => {
    if (!configFile || !dataFile) {
      toast.warning('Por favor sube ambos archivos (Configurador y Datos).');
      return;
    }

    setIsGenerating(true);
    setCurrentStep(0);
    
    // Simulate steps progress for UI (since backend doesn't stream SSE yet)
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 4000);

    try {
      const formData = new FormData();
      formData.append('configurador', configFile);
      formData.append('datos', dataFile);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.post(`${API_URL}/api/constructor/generate-batch`, formData, {
        responseType: 'blob'
      });

      clearInterval(stepInterval);
      setCurrentStep(3); // Make sure it reaches the end

      // Forzar descarga ZIP
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Banners_${date}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('¡Generación exitosa! Lote descargado.');
    } catch (error) {
      clearInterval(stepInterval);
      console.error(error);
      let msg = 'Hubo un error al generar los documentos.';
      
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.error) msg = json.error;
        } catch (e) {
          // ignore parsing error
        }
      } else if (error.response?.data?.error) {
        msg = error.response.data.error;
      }
      
      toast.error(msg);
    } finally {
      setIsGenerating(false);
      setCurrentStep(0);
    }
  };

  const isReady = configFile && dataFile;

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
      <header className="mb-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-4"
        >
          <Sparkles size={14} />
          Motor Generativo Integrado
        </motion.div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Constructor de Campañas</h2>
        <p className="text-slate-500 text-md max-w-2xl leading-relaxed">
          Sube tus reglas de marca y tu matriz de datos. La IA ensamblará, redactará y renderizará el lote completo automáticamente.
        </p>
      </header>

      <div className="flex gap-8 flex-1">
        {/* Left Col: Uploads */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-premium border border-gray-100">
            <h3 className="text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">CONFIGURADOR (.XLSX)</h3>
            <Dropzone
              label="Reglas de Marca"
              accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
              file={configFile}
              onFileAccepted={setConfigFile}
              placeholderText="Arrastra el Excel de reglas (Sector, Tono, Estilo)"
              iconType="excel"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-premium border border-gray-100">
            <h3 className="text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">DATOS (.XLSX)</h3>
            <Dropzone
              label="Matriz de Datos (Lote)"
              accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
              file={dataFile}
              onFileAccepted={setDataFile}
              placeholderText="Arrastra el Excel de datos (Máximo 50 filas)"
              iconType="excel"
            />
          </div>
        </div>

        {/* Right Col: Actions & Status */}
        <div className="flex-1">
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl shadow-[#2A5757]/5 border border-gray-100 h-full flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* Background decoration */}
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-orange-50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-petrol/5 rounded-full blur-3xl opacity-60"></div>

            <AnimatePresence mode="wait">
              {!isGenerating ? (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center z-10 w-full"
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-petrol mb-2 text-center">Listo para ensamblar</h3>
                  <p className="text-gray-400 text-center mb-8 text-sm">
                    {isReady ? 'Todos los archivos listos.' : 'Esperando archivos de entrada...'}
                  </p>
                  
                  <motion.button
                    disabled={!isReady}
                    onClick={handleGenerate}
                    whileHover={isReady ? { scale: 1.02, boxShadow: '0 10px 25px -5px rgba(224, 146, 43, 0.4)' } : {}}
                    whileTap={isReady ? { scale: 0.97 } : {}}
                    className={`w-full max-w-xs py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-md ${
                      isReady 
                        ? 'bg-[#E0922B] hover:bg-[#E0922B]/90 text-white cursor-pointer' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles size={20} />
                    <span>Generar con IA</span>
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div 
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col w-full z-10 px-8"
                >
                  <div className="text-center mb-10">
                    <Loader2 className="animate-spin text-orange-garza mx-auto mb-4" size={48} />
                    <h3 className="text-2xl font-bold text-petrol">Motor Operando</h3>
                    <p className="text-gray-500 mt-2">Por favor no cierres esta ventana.</p>
                  </div>

                  <div className="space-y-6">
                    {steps.map((step, index) => {
                      const isPast = index < currentStep;
                      const isCurrent = index === currentStep;
                      
                      return (
                        <div key={index} className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                            isPast ? 'bg-green-500 text-white' : 
                            isCurrent ? 'bg-orange-garza text-white shadow-lg' : 
                            'bg-gray-100 text-gray-300'
                          }`}>
                            {isPast ? <CheckCircle2 size={16} /> : <span className="text-sm font-bold">{index + 1}</span>}
                          </div>
                          <span className={`font-medium transition-colors duration-500 ${
                            isCurrent ? 'text-petrol' : 
                            isPast ? 'text-gray-500' : 'text-gray-300'
                          }`}>
                            {step}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
