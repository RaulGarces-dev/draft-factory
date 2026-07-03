import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Download, Eye, Sparkles, Image as ImageIcon, ChevronLeft, 
    ChevronRight, FileText, Plus, Trash2, CheckCircle2, 
    AlertCircle, Upload, Edit3, Wand2 
} from 'lucide-react';
import Dropzone from '../../common/Dropzone';
import styles from './GeneratorIa.module.css';

const GeneratorIa = () => {
    // Archivos cargados
    const [svgFile, setSvgFile] = useState(null);
    const [referenceFile, setReferenceFile] = useState(null);
    const [uploadedImages, setUploadedImages] = useState([]); // archivos locales de imágenes

    // Estados de configuración e IA
    const [variables, setVariables] = useState([]); // variables detectadas en el SVG
    const [aiPrompt, setAiPrompt] = useState('');
    const [rawText, setRawText] = useState('');
    const [outputFormat, setOutputFormat] = useState('pdf'); // 'pdf' o 'jpg'
    
    // Tabla interactiva de variantes
    const [tableRows, setTableRows] = useState([]); // [{ tipo_equipo: 'Minisplit', logo: 'mirage.png', ... }]
    
    // Vista previa y paginación
    const [currentRowIndex, setCurrentRowIndex] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Al cambiar el SVG, extraer sus variables automáticamente
    useEffect(() => {
        if (!svgFile) {
            setVariables([]);
            setTableRows([]);
            setPreviewUrl(null);
            return;
        }
        extractSvgVariables(svgFile);
    }, [svgFile]);

    // Limpiar vista previa al cambiar de datos
    useEffect(() => {
        setPreviewUrl(null);
    }, [tableRows]);

    // Extraer variables del SVG llamando al backend
    const extractSvgVariables = async (file) => {
        const formData = new FormData();
        formData.append('template', file);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/extract-variables`, formData);
            if (response.data && response.data.variables) {
                setVariables(response.data.variables);
                toast.success(`Se detectaron ${response.data.variables.length} variables en la plantilla.`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al analizar las variables del SVG.');
        }
    };

    // Autocompletar datos con Gemini
    const handleAiFill = async () => {
        if (!svgFile) {
            toast.warning('Primero sube una plantilla SVG para extraer las variables.');
            return;
        }
        if (variables.length === 0) {
            toast.warning('No se encontraron variables en el SVG.');
            return;
        }
        if (!referenceFile && !rawText.trim()) {
            toast.warning('Proporciona información de referencia (sube un archivo o pega el texto).');
            return;
        }

        setIsAiLoading(true);
        const loadToast = toast.loading('Gemini está analizando y rellenando los datos...');

        try {
            const formData = new FormData();
            if (referenceFile) {
                formData.append('data', referenceFile);
            }
            formData.append('variables', JSON.stringify(variables));
            formData.append('prompt', aiPrompt);
            formData.append('rawText', rawText);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/generate-ai-rows`, formData);
            
            if (response.data && response.data.rows) {
                setTableRows(response.data.rows);
                setCurrentRowIndex(0);
                toast.success(`¡Listo! Se generaron ${response.data.rows.length} variantes.`, { id: loadToast });
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Error al procesar con IA.', { id: loadToast });
        } finally {
            setIsAiLoading(false);
        }
    };

    // Manejar subida masiva de imágenes de producto/logos
    const handleImagesAccepted = (files) => {
        const fileList = Array.from(files);
        setUploadedImages(prev => {
            const existingNames = prev.map(f => f.name.toLowerCase());
            const newFiles = fileList.filter(f => !existingNames.includes(f.name.toLowerCase()));
            return [...prev, ...newFiles];
        });
        toast.success(`Añadidas ${fileList.length} imágenes para vinculación automática.`);
    };

    // Verificar si un nombre de archivo está en el lote de imágenes subidas
    const checkImageLinked = (val) => {
        if (!val || typeof val !== 'string') return false;
        const cleanVal = val.toLowerCase().trim();
        return uploadedImages.some(img => {
            const imgName = img.name.toLowerCase().trim();
            if (imgName === cleanVal) return true;
            const dotIdx = imgName.lastIndexOf('.');
            const nameWithoutExt = dotIdx !== -1 ? imgName.substring(0, dotIdx) : imgName;
            return nameWithoutExt === cleanVal;
        });
    };

    // Edición de celdas de la tabla
    const handleCellChange = (rowIndex, columnKey, value) => {
        setTableRows(prev => {
            const updated = [...prev];
            updated[rowIndex] = { ...updated[rowIndex], [columnKey]: value };
            return updated;
        });
    };

    // Agregar fila vacía
    const handleAddRow = () => {
        const newRow = {};
        variables.forEach(v => {
            newRow[v] = '';
        });
        setTableRows(prev => [...prev, newRow]);
        toast.success('Nueva fila vacía añadida.');
    };

    // Eliminar fila
    const handleDeleteRow = (idx) => {
        setTableRows(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            if (currentRowIndex >= updated.length && updated.length > 0) {
                setCurrentRowIndex(updated.length - 1);
            }
            return updated;
        });
    };

    // Previsualización de una fila específica
    const handlePreview = async (indexToPreview = currentRowIndex) => {
        if (!svgFile || tableRows.length === 0) {
            toast.warning('Por favor, selecciona la plantilla SVG y genera/carga datos.');
            return;
        }
        setIsPreviewing(true);

        try {
            const formData = new FormData();
            formData.append('template', svgFile);
            formData.append('rows', JSON.stringify(tableRows));
            formData.append('rowIndex', indexToPreview.toString());

            uploadedImages.forEach(img => {
                formData.append('images', img);
            });

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/preview`, formData, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
            setPreviewUrl(url);
            setCurrentRowIndex(indexToPreview);
        } catch (error) {
            console.error(error);
            toast.error('Error al generar la previsualización');
        } finally {
            setIsPreviewing(false);
        }
    };

    // Generación del lote final
    const handleGenerate = async () => {
        if (!svgFile || tableRows.length === 0) {
            toast.warning('Selecciona la plantilla SVG y carga datos antes de generar.');
            return;
        }

        setIsGenerating(true);
        const loadingToast = toast.loading('Procesando lote de documentos...');

        try {
            const formData = new FormData();
            formData.append('template', svgFile);
            formData.append('rows', JSON.stringify(tableRows));
            formData.append('formats', outputFormat);

            uploadedImages.forEach(img => {
                formData.append('images', img);
            });

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(`${API_URL}/api/generator/generate`, formData, {
                responseType: 'blob',
            });

            let filename = outputFormat === 'pdf' ? 'Documentos_Maestros.pdf' : 'documentos_generados.zip';

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

    return (
        <div className={styles.appContainer}>
            <div className={styles.gridContainer}>
                {/* Panel de Configuración Izquierdo */}
                <div className={styles.leftColumn}>
                    <header className={styles.header}>
                        <div className={styles.badge}>
                            <Sparkles size={12} className={styles.badgeIcon} />
                            <span>Variantes IA V2</span>
                        </div>
                        <h1 className={styles.title}>Variantes IA</h1>
                        <p className={styles.subtitle}>Genera variantes masivas autocompletadas por IA a partir de tu SVG.</p>
                    </header>

                    {/* Paso 1: SVG Template */}
                    <div className={styles.panel}>
                        <Dropzone
                            label="1. Plantilla SVG (.svg)"
                            accept={{ 'image/svg+xml': ['.svg'] }}
                            file={svgFile}
                            onFileAccepted={setSvgFile}
                            placeholderText="Arrastra el diseño SVG con variables {{...}}"
                            iconType="svg"
                        />
                        {variables.length > 0 && (
                            <div className={styles.variablesBadgeContainer}>
                                <span className={styles.variablesLabel}>Variables detectadas:</span>
                                <div className={styles.badgeList}>
                                    {variables.map(v => (
                                        <span key={v} className={styles.variableBadge}>{v}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Paso 2: Datos de Origen */}
                    <div className={styles.panel}>
                        <h2 className={styles.sectionTitle}>2. Carga y Autocompletado de Datos</h2>
                        <div className={styles.tabContent}>
                            <div className={styles.formGroup}>
                                <label className={styles.fieldLabel}>Información de referencia (Ficha, Lista de precios, etc.)</label>
                                <Dropzone
                                    accept={{
                                        'text/plain': ['.txt'],
                                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                                        'text/csv': ['.csv'],
                                        'application/pdf': ['.pdf'],
                                        'image/*': ['.png', '.jpg', '.jpeg']
                                    }}
                                    file={referenceFile}
                                    onFileAccepted={setReferenceFile}
                                    placeholderText="Sube lista de precios o ficha (.pdf, .xlsx, img)"
                                    iconType="excel"
                                />
                                <span className={styles.orText}>o pega la información técnica aquí abajo:</span>
                                <textarea 
                                    className={styles.textareaInput}
                                    placeholder="Pega textos descriptivos, especificaciones, etc..."
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.fieldLabel}>Instrucciones para la IA (Prompt)</label>
                                <textarea 
                                    className={styles.textareaInput}
                                    placeholder="Ej: Genera variantes para Mirage de 110v y 220v. Crea copies persuasivos cortos sobre el ahorro energético y el calor de verano."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <button 
                                className={styles.aiGenerateBtn}
                                onClick={handleAiFill}
                                disabled={isAiLoading || !svgFile}
                            >
                                <Sparkles size={16} />
                                <span>{isAiLoading ? 'Procesando con IA...' : 'Generar Datos con IA'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Paso 3: Lote de Imágenes */}
                    <div className={styles.panel}>
                        <h2 className={styles.sectionTitle}>3. Lote de Imágenes (Logos y Fotos)</h2>
                        <div className={styles.imageDropzoneWrapper}>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                id="batch-images" 
                                className={styles.hiddenFileInput}
                                onChange={(e) => handleImagesAccepted(e.target.files)}
                            />
                            <label htmlFor="batch-images" className={styles.imageDropzoneLabel}>
                                <Upload size={24} className={styles.uploadIcon} />
                                <span>Haz clic para seleccionar o arrastra tus imágenes aquí</span>
                                <span className={styles.helpText}>Soporta .png, .jpg, .jpeg, .svg</span>
                            </label>
                        </div>
                        {uploadedImages.length > 0 && (
                            <div className={styles.uploadedImagesCountPanel}>
                                <div className={styles.uploadedHeader}>
                                    <span className={styles.uploadedCountText}>{uploadedImages.length} imágenes cargadas</span>
                                    <button 
                                        className={styles.clearImagesBtn}
                                        onClick={() => { setUploadedImages([]); toast.success('Lote de imágenes limpiado.'); }}
                                    >
                                        Limpiar lote
                                    </button>
                                </div>
                                <div className={styles.imagesMiniList}>
                                    {uploadedImages.slice(0, 10).map((img, i) => (
                                        <span key={i} className={styles.imageMiniBadge} title={img.name}>
                                            {img.name}
                                        </span>
                                    ))}
                                    {uploadedImages.length > 10 && (
                                        <span className={styles.imageMiniMore}>+{uploadedImages.length - 10} más</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Formato de Salida y Generación Principal */}
                    <div className={styles.panel}>
                        <h2 className={styles.sectionTitle}>Formato de Salida</h2>
                        <div className={styles.segmentedControl}>
                            <button
                                type="button"
                                className={`${styles.segmentBtn} ${outputFormat === 'pdf' ? styles.activeSegment : ''}`}
                                onClick={() => setOutputFormat('pdf')}
                                disabled={isGenerating || isPreviewing}
                            >
                                {outputFormat === 'pdf' && (
                                    <motion.div
                                        layoutId="active-pill-ia"
                                        className={styles.activePill}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className={styles.segmentContent}>
                                    <FileText size={16} />
                                    <span>PDF Maestro (.pdf)</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                className={`${styles.segmentBtn} ${outputFormat === 'jpg' ? styles.activeSegment : ''}`}
                                onClick={() => setOutputFormat('jpg')}
                                disabled={isGenerating || isPreviewing}
                            >
                                {outputFormat === 'jpg' && (
                                    <motion.div
                                        layoutId="active-pill-ia"
                                        className={styles.activePill}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className={styles.segmentContent}>
                                    <ImageIcon size={16} />
                                    <span>Imágenes ZIP (.jpg)</span>
                                </span>
                            </button>
                        </div>

                        <motion.button
                            className={styles.generateBtn}
                            disabled={tableRows.length === 0 || isGenerating || isPreviewing}
                            onClick={handleGenerate}
                            whileHover={tableRows.length > 0 && !isGenerating ? { scale: 1.01 } : {}}
                            whileTap={tableRows.length > 0 && !isGenerating ? { scale: 0.96 } : {}}
                        >
                            <Download size={18} />
                            <span>{isGenerating ? 'Generando Lote...' : `Generar ${tableRows.length} Tarjetas`}</span>
                        </motion.button>
                    </div>
                </div>

                {/* Columna Derecha: Vista Previa y Tabla de Variantes */}
                <div className={styles.rightColumn}>
                    {/* Tarjeta de Vista Previa */}
                    <div className={styles.previewPanel}>
                        <div className={styles.previewHeader}>
                            <h2 className={styles.previewTitle}>
                                {tableRows.length > 0 ? `Vista Previa — Variante ${currentRowIndex + 1} de ${tableRows.length}` : 'Vista Previa'}
                            </h2>
                            {previewUrl && (
                                <a
                                    href={previewUrl}
                                    download={`tarjeta_variante_${currentRowIndex + 1}.png`}
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
                                        </div>
                                        <p className={styles.shimmerText}>Renderizando tarjeta {currentRowIndex + 1}...</p>
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
                                        <h3>Sin previsualización</h3>
                                        <p>Genera datos con la IA o escribe en la tabla, luego presiona el icono del ojo en la fila para ver los resultados.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Tabla Interactiva de Variantes (Ancha) */}
                    <div className={styles.tablePanel}>
                        <div className={styles.tableHeaderSection}>
                            <h2 className={styles.sectionTitle}>Edición de Datos de Variantes</h2>
                            <button className={styles.addRowBtn} onClick={handleAddRow} disabled={variables.length === 0}>
                                <Plus size={16} />
                                <span>Añadir Fila</span>
                            </button>
                        </div>

                        {tableRows.length === 0 ? (
                            <div className={styles.emptyTablePlaceholder}>
                                <Edit3 size={32} className={styles.emptyTableIcon} />
                                <p>La tabla está vacía. Genera datos con la IA a partir de tus fichas/precios para editarlos aquí.</p>
                            </div>
                        ) : (
                            <div className={styles.tableResponsiveWrapper}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '80px' }}>Acciones</th>
                                            {variables.map(col => (
                                                <th key={col}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row, rIdx) => (
                                            <tr key={rIdx} className={rIdx === currentRowIndex ? styles.selectedRow : ''}>
                                                <td className={styles.actionCell}>
                                                    <button 
                                                        className={styles.rowPreviewBtn} 
                                                        onClick={() => handlePreview(rIdx)}
                                                        title="Ver Vista Previa de esta fila"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button 
                                                        className={styles.rowDeleteBtn} 
                                                        onClick={() => handleDeleteRow(rIdx)}
                                                        title="Eliminar fila"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                                {variables.map(col => {
                                                    const isImageCol = col.toLowerCase().includes('logo') || 
                                                                     col.toLowerCase().includes('imagen') || 
                                                                     col.toLowerCase().includes('foto') ||
                                                                     col.toLowerCase().includes('img');
                                                    const val = row[col] || '';
                                                    const isLinked = isImageCol && val && checkImageLinked(val);

                                                    return (
                                                        <td key={col} className={styles.editableCell}>
                                                            <div className={styles.cellInputContainer}>
                                                                <input 
                                                                    type="text" 
                                                                    className={styles.cellInput}
                                                                    value={val}
                                                                    onChange={(e) => handleCellChange(rIdx, col, e.target.value)}
                                                                />
                                                                {isImageCol && val && (
                                                                    <span 
                                                                        className={`${styles.linkBadge} ${isLinked ? styles.badgeLinked : styles.badgeUnlinked}`}
                                                                        title={isLinked ? 'Imagen vinculada correctamente' : 'Archivo de imagen no encontrado en el lote'}
                                                                    >
                                                                        {isLinked ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneratorIa;
