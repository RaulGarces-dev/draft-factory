import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Eye, Sparkles, Image as ImageIcon, ChevronLeft, ChevronRight, FileText, Image as ImageIconBtn } from 'lucide-react';
import Dropzone from '../../common/Dropzone';
import styles from './Generator.module.css';

const Generator = () => {
    const [svgFile, setSvgFile] = useState(null);
    const [excelFile, setExcelFile] = useState(null);
    const [outputFormat, setOutputFormat] = useState('pdf'); // 'pdf' o 'jpg'
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    // Paginación / Slider de previsualización
    const [currentRowIndex, setCurrentRowIndex] = useState(0);
    const [totalRows, setTotalRows] = useState(0);

    // Resetear estados al cambiar archivos
    useEffect(() => {
        setPreviewUrl(null);
        setCurrentRowIndex(0);
        setTotalRows(0);
    }, [svgFile, excelFile]);

    const handlePreview = async (indexToPreview = currentRowIndex) => {
        if (!svgFile || !excelFile) {
            toast.warning('Por favor, selecciona la plantilla SVG y el archivo de datos.');
            return;
        }
        setIsPreviewing(true);

        try {
            const formData = new FormData();
            formData.append('template', svgFile);
            formData.append('data', excelFile);
            formData.append('rowIndex', indexToPreview.toString());

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/preview`, formData, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
            setPreviewUrl(url);

            // Obtener el número total de filas del encabezado expuesto
            const totalRowsHeader = response.headers['x-total-rows'];
            if (totalRowsHeader) {
                setTotalRows(parseInt(totalRowsHeader, 10));
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al generar la previsualización');
        } finally {
            setIsPreviewing(false);
        }
    };

    // Navegar y auto-cargar
    const navigateToRow = (newIndex) => {
        if (newIndex < 0 || newIndex >= totalRows) return;
        setCurrentRowIndex(newIndex);
        handlePreview(newIndex);
    };

    const handleSliderChange = (e) => {
        const val = parseInt(e.target.value, 10);
        setCurrentRowIndex(val);
    };

    const handleSliderRelease = () => {
        handlePreview(currentRowIndex);
    };

    const handleGenerate = async () => {
        if (!svgFile || !excelFile) {
            toast.warning('Selecciona la plantilla SVG y el archivo de datos.');
            return;
        }

        setIsGenerating(true);
        const loadingToast = toast.loading('Procesando lote de documentos...');

        try {
            const formData = new FormData();
            formData.append('template', svgFile);
            formData.append('data', excelFile);
            formData.append('formats', outputFormat);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/generate`, formData, {
                responseType: 'blob',
            });

            let filename = outputFormat === 'pdf' ? 'Documento_Maestro.pdf' : 'documentos_generados.zip';

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

    const isReady = svgFile && excelFile;
    const isBusy = isGenerating || isPreviewing;

    return (
        <div className={styles.appContainer}>
            <div className={styles.gridContainer}>
                {/* Columna Izquierda: Configuración y Controles */}
                <div className={styles.leftColumn}>
                    <header className={styles.header}>
                        <div className={styles.badge}>
                            <Sparkles size={12} className={styles.badgeIcon} />
                            <span>Diseño Premium V2</span>
                        </div>
                        <h1 className={styles.title}>Creador de variantes</h1>
                        <p className={styles.subtitle}>Carga un diseño plantilla SVG y tus datos Excel para generar credenciales corporativas.</p>
                    </header>

                    <div className={styles.panel}>
                        <div className={styles.dropzoneSection}>
                            <Dropzone
                                label="1. Diseño plantilla(.svg)"
                                accept={{ 'image/svg+xml': ['.svg'] }}
                                file={svgFile}
                                onFileAccepted={setSvgFile}
                                placeholderText="Arrastra el editable SVG con {{variables}}"
                                iconType="svg"
                            />
                            <Dropzone
                                label="2. Datos (Excel / CSV)"
                                accept={{
                                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                                    'text/csv': ['.csv']
                                }}
                                file={excelFile}
                                onFileAccepted={setExcelFile}
                                placeholderText="Sube la planilla con las columnas de datos"
                                iconType="excel"
                            />
                        </div>

                        <div className={styles.configSection}>
                            <h2 className={styles.sectionTitle}>Formato de Salida</h2>

                            {/* Segmented Control estilo iOS */}
                            <div className={styles.segmentedControl}>
                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${outputFormat === 'pdf' ? styles.activeSegment : ''}`}
                                    onClick={() => setOutputFormat('pdf')}
                                    disabled={isBusy}
                                >
                                    {outputFormat === 'pdf' && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className={styles.activePill}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <span className={styles.segmentContent}>
                                        <FileText size={16} />
                                        <span>Documento PDF (.pdf)</span>
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.segmentBtn} ${outputFormat === 'jpg' ? styles.activeSegment : ''}`}
                                    onClick={() => setOutputFormat('jpg')}
                                    disabled={isBusy}
                                >
                                    {outputFormat === 'jpg' && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className={styles.activePill}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <span className={styles.segmentContent}>
                                        <ImageIconBtn size={16} />
                                        <span>Imagen JPG (.jpg)</span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className={styles.actionsArea}>
                            <motion.button
                                className={styles.previewBtn}
                                disabled={!isReady || isBusy}
                                onClick={() => handlePreview(currentRowIndex)}
                                whileHover={isReady && !isBusy ? { scale: 1.01, backgroundColor: 'rgba(0, 113, 227, 0.05)' } : {}}
                                whileTap={isReady && !isBusy ? { scale: 0.96 } : {}}
                            >
                                <Eye size={18} />
                                <span>Ver Vista Previa</span>
                            </motion.button>

                            <motion.button
                                className={styles.generateBtn}
                                disabled={!isReady || isBusy}
                                onClick={handleGenerate}
                                whileHover={isReady && !isBusy ? { scale: 1.01 } : {}}
                                whileTap={isReady && !isBusy ? { scale: 0.96 } : {}}
                            >
                                <Download size={18} />
                                <span>{isGenerating ? 'Generando Lote...' : 'Generar y Descargar Lote'}</span>
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Vista Previa y visualizador */}
                <div className={styles.rightColumn}>
                    <div className={styles.previewPanel}>
                        <div className={styles.previewHeader}>
                            <h2 className={styles.previewTitle}>
                                {totalRows > 0 ? `Vista Previa — Registro ${currentRowIndex + 1} de ${totalRows}` : 'Vista Previa'}
                            </h2>
                            {previewUrl && (
                                <a
                                    href={previewUrl}
                                    download={`tarjeta_registro_${currentRowIndex + 1}.png`}
                                    className={styles.downloadPreviewBtn}
                                    title="Descargar esta vista previa"
                                >
                                    <Download size={16} />
                                </a>
                            )}
                        </div>

                        <div className={styles.previewBody}>
                            <AnimatePresence mode="wait">
                                {isPreviewing && (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={styles.shimmerContainer}
                                    >
                                        <div className={styles.shimmerCard}>
                                            <div className={styles.shimmerLine} />
                                            <div className={styles.shimmerCircle} />
                                            <div className={styles.shimmerBlock} />
                                            <div className={styles.shimmerLineShort} />
                                        </div>
                                        <p className={styles.shimmerText}>Procesando fila {currentRowIndex + 1}...</p>
                                    </motion.div>
                                )}

                                {!isPreviewing && previewUrl && (
                                    <motion.div
                                        key="preview-image"
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                        className={styles.imageContainer}
                                    >
                                        <img src={previewUrl} alt="Vista previa de tarjeta" className={styles.previewImage} />
                                    </motion.div>
                                )}

                                {!isPreviewing && !previewUrl && (
                                    <motion.div
                                        key="placeholder"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={styles.placeholderContainer}
                                    >
                                        <div className={styles.placeholderVisual}>
                                            <ImageIcon size={48} className={styles.placeholderIcon} />
                                        </div>
                                        <h3>Sin vista previa</h3>
                                        <p>Selecciona tu SVG y archivo de datos, luego haz clic en "Ver Vista Previa" para ver la tarjeta renderizada aquí.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Slider / Carousel de navegación */}
                        {totalRows > 1 && previewUrl && (
                            <div className={styles.previewFooter}>
                                <button
                                    className={styles.navBtn}
                                    disabled={currentRowIndex === 0 || isBusy}
                                    onClick={() => navigateToRow(currentRowIndex - 1)}
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className={styles.sliderWrapper}>
                                    <input
                                        type="range"
                                        min="0"
                                        max={totalRows - 1}
                                        value={currentRowIndex}
                                        onChange={handleSliderChange}
                                        onMouseUp={handleSliderRelease}
                                        onTouchEnd={handleSliderRelease}
                                        className={styles.rangeSlider}
                                        disabled={isBusy}
                                    />
                                    <span className={styles.sliderLabel}>Registro {currentRowIndex + 1}</span>
                                </div>

                                <button
                                    className={styles.navBtn}
                                    disabled={currentRowIndex === totalRows - 1 || isBusy}
                                    onClick={() => navigateToRow(currentRowIndex + 1)}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Generator;
