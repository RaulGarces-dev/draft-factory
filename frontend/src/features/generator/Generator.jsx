import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import Dropzone from '../../common/Dropzone';
import Toggle from '../../common/Toggle';
import styles from './Generator.module.css';

const Generator = () => {
    const [svgFiles, setSvgFiles] = useState([]);
    const [excelFile, setExcelFile] = useState(null);
    const [formats, setFormats] = useState({
        pdf: true,
        png: false,
        jpg: false,
        pptx: false
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const handleFormatChange = (format, checked) => {
        setFormats(prev => ({ ...prev, [format]: checked }));
    };

    const handlePreview = async () => {
        if (!svgFiles.length || !excelFile) return;
        setIsPreviewing(true);
        const loadingToast = toast.loading('Generando previsualización...');
        
        try {
            const formData = new FormData();
            svgFiles.forEach(f => formData.append('template', f));
            formData.append('data', excelFile);
            
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/preview`, formData, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
            setPreviewUrl(url);
            setShowPreviewModal(true);
            toast.success('Previsualización lista', { id: loadingToast });
        } catch (error) {
            console.error(error);
            toast.error('Error al generar previsualización', { id: loadingToast });
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleGenerate = async () => {
        if (!svgFiles.length || !excelFile) {
            toast.error('Por favor, selecciona la plantilla SVG y el archivo de datos.');
            return;
        }

        const selectedFormats = Object.keys(formats).filter(k => formats[k]).join(',');
        if (!selectedFormats) {
            toast.error('Selecciona al menos un formato de salida.');
            return;
        }

        setIsGenerating(true);
        const loadingToast = toast.loading('Procesando documentos... Esto puede tomar un momento.');

        try {
            const formData = new FormData();
            svgFiles.forEach(f => formData.append('template', f));
            formData.append('data', excelFile);
            formData.append('formats', selectedFormats);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/generate`, formData, {
                responseType: 'blob',
            });

            const contentType = response.headers['content-type'];
            let filename = 'documentos_generados.zip';
            if (contentType === 'application/pdf') {
                filename = 'Documento_Maestro.pdf';
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success('¡Generación exitosa! Descargando archivo...', { id: loadingToast });
        } catch (error) {
            console.error(error);
            toast.error('Hubo un error al generar los documentos.', { id: loadingToast });
        } finally {
            setIsGenerating(false);
        }
    };

    const isReady = svgFiles.length > 0 && excelFile;
    const isBusy = isGenerating || isPreviewing;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Generador de Documentos</h1>
                <p className={styles.subtitle}>Automatiza la creación de tarjetas corporativas con un solo clic.</p>
            </header>

            <main className={styles.main}>
                <div className={styles.dropzones}>
                    <Dropzone
                        label="Plantilla(s) SVG"
                        accept={{ 'image/svg+xml': ['.svg'] }}
                        files={svgFiles}
                        onFilesAccepted={setSvgFiles}
                        multi={true}
                    />
                    <Dropzone 
                        label="Datos (Excel / CSV)" 
                        accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] }} 
                        file={excelFile} 
                        onFileAccepted={setExcelFile} 
                    />
                </div>

                <div className={styles.configPanel}>
                    <h2 className={styles.sectionTitle}>Formatos de Salida</h2>
                    <div className={styles.toggles}>
                        <Toggle label="Documento PDF (.pdf)" checked={formats.pdf} onChange={(c) => handleFormatChange('pdf', c)} />
                        <Toggle label="Imagen PNG Transparente (.png)" checked={formats.png} onChange={(c) => handleFormatChange('png', c)} />
                        <Toggle label="Imagen JPG (.jpg)" checked={formats.jpg} onChange={(c) => handleFormatChange('jpg', c)} />
                        <Toggle label="Presentación PPTX (.pptx)" checked={formats.pptx} onChange={(c) => handleFormatChange('pptx', c)} />
                    </div>
                </div>

                <div className={styles.buttonGroup}>
                    <motion.button 
                        className={styles.previewBtn}
                        disabled={!isReady || isBusy}
                        onClick={handlePreview}
                        whileHover={isReady && !isBusy ? { scale: 1.01 } : {}}
                        whileTap={isReady && !isBusy ? { scale: 0.99 } : {}}
                    >
                        {isPreviewing ? 'Cargando Previsualización...' : 'Previsualizar Diseño (Fila 1)'}
                    </motion.button>

                    <motion.button 
                        className={styles.generateBtn}
                        disabled={!isReady || isBusy}
                        onClick={handleGenerate}
                        whileHover={isReady && !isBusy ? { scale: 1.02 } : {}}
                        whileTap={isReady && !isBusy ? { scale: 0.98 } : {}}
                    >
                        <Download className={styles.btnIcon} />
                        {isGenerating ? 'Generando Archivos...' : 'Generar y Descargar Lote Completo'}
                    </motion.button>
                </div>
            </main>

            {showPreviewModal && (
                <div className={styles.modalBackdrop} onClick={() => setShowPreviewModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeModalBtn} onClick={() => setShowPreviewModal(false)}>×</button>
                        <h2>Vista Previa del Diseño</h2>
                        {previewUrl && <img src={previewUrl} alt="Preview" className={styles.previewImage} />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Generator;
