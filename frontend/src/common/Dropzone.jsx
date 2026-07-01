import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, CheckCircle2, X, GripVertical } from 'lucide-react';
import styles from './Dropzone.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Dropzone con soporte para múltiples archivos (modo multi) o archivo único.
//
// Props:
//   label        - etiqueta del dropzone
//   accept       - objeto de tipos MIME aceptados
//   file         - archivo único (modo normal)
//   files        - array de archivos (modo multi)
//   onFileAccepted  - callback(file) para modo normal
//   onFilesAccepted - callback(files[]) para modo multi
//   multi        - boolean, activa el modo multi-archivo
// ─────────────────────────────────────────────────────────────────────────────
const Dropzone = ({ onFileAccepted, onFilesAccepted, accept, label, file, files, multi = false }) => {
    const onDrop = useCallback((acceptedFiles) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;
        if (multi && onFilesAccepted) {
            // En modo multi: acumular archivos en el orden en que se suben
            onFilesAccepted(prev => {
                const existing = prev || [];
                return [...existing, ...acceptedFiles];
            });
        } else if (onFileAccepted) {
            onFileAccepted(acceptedFiles[0]);
        }
    }, [onFileAccepted, onFilesAccepted, multi]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles: multi ? 20 : 1,
        multiple: multi
    });

    const removeFile = (e, idx) => {
        e.stopPropagation();
        onFilesAccepted(prev => prev.filter((_, i) => i !== idx));
    };

    // ── Modo MULTI: mostrar lista de archivos ──────────────────────────────
    if (multi) {
        const hasFiles = files && files.length > 0;
        return (
            <div className={styles.multiWrapper}>
                <motion.div
                    {...getRootProps()}
                    className={`${styles.dropzone} ${styles.dropzoneCompact} ${isDragActive ? styles.active : ''} ${hasFiles ? styles.hasFile : ''}`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                    <input {...getInputProps()} />
                    <div className={styles.content}>
                        {isDragActive ? (
                            <File size={32} className={styles.iconActive} />
                        ) : (
                            <UploadCloud size={32} className={hasFiles ? styles.iconSuccess : styles.icon} />
                        )}
                        <p className={styles.text}>{label}</p>
                        <span className={styles.subtext}>
                            {hasFiles
                                ? `${files.length} archivo(s) — arrastra más para añadir`
                                : 'Arrastra uno o más archivos SVG (en orden: cara 1, cara 2…)'}
                        </span>
                    </div>
                </motion.div>

                {hasFiles && (
                    <AnimatePresence>
                        <ul className={styles.fileList}>
                            {files.map((f, idx) => (
                                <motion.li
                                    key={`${f.name}-${idx}`}
                                    className={styles.fileItem}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <GripVertical size={14} className={styles.grip} />
                                    <span className={styles.fileNumber}>Cara {idx + 1}</span>
                                    <CheckCircle2 size={14} className={styles.iconSuccess} />
                                    <span className={styles.fileName}>{f.name}</span>
                                    <button
                                        className={styles.removeBtn}
                                        onClick={(e) => removeFile(e, idx)}
                                        title="Eliminar"
                                    >
                                        <X size={14} />
                                    </button>
                                </motion.li>
                            ))}
                        </ul>
                    </AnimatePresence>
                )}
            </div>
        );
    }

    // ── Modo NORMAL: archivo único ─────────────────────────────────────────
    return (
        <motion.div
            {...getRootProps()}
            className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${file ? styles.hasFile : ''}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            <input {...getInputProps()} />

            {file ? (
                <div className={styles.content}>
                    <CheckCircle2 size={40} className={styles.iconSuccess} />
                    <p className={styles.text}>{file.name}</p>
                    <span className={styles.subtext}>Archivo listo. Haz clic para cambiar.</span>
                </div>
            ) : (
                <div className={styles.content}>
                    {isDragActive ? (
                        <File size={40} className={styles.iconActive} />
                    ) : (
                        <UploadCloud size={40} className={styles.icon} />
                    )}
                    <p className={styles.text}>{label}</p>
                    <span className={styles.subtext}>Arrastra el archivo aquí o haz clic</span>
                </div>
            )}
        </motion.div>
    );
};

export default Dropzone;
