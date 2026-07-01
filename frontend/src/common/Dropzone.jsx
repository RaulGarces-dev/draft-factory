import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { File, CheckCircle2, Trash2, Palette, FileSpreadsheet } from 'lucide-react';
import styles from './Dropzone.module.css';

const Dropzone = ({ onFileAccepted, accept, label, file, placeholderText, iconType }) => {
    const onDrop = useCallback((acceptedFiles) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;
        if (onFileAccepted) {
            onFileAccepted(acceptedFiles[0]);
        }
    }, [onFileAccepted]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles: 1,
        multiple: false
    });

    const removeFile = (e) => {
        e.stopPropagation();
        if (onFileAccepted) {
            onFileAccepted(null);
        }
    };

    // Determinar el icono según el tipo
    const renderIcon = () => {
        if (isDragActive) {
            return <File size={36} className={styles.iconActive} />;
        }
        if (iconType === 'svg') {
            return <Palette size={36} className={styles.svgIcon} />;
        }
        if (iconType === 'excel') {
            return <FileSpreadsheet size={36} className={styles.excelIcon} />;
        }
        return <File size={36} className={styles.icon} />;
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.labelHeader}>
                <span className={styles.labelText}>{label}</span>
            </div>
            
            <AnimatePresence mode="wait">
                {file ? (
                    <motion.div
                        key="has-file"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`${styles.dropzone} ${styles.hasFile}`}
                    >
                        <div className={styles.fileInfo}>
                            <div className={styles.iconContainer}>
                                <CheckCircle2 size={24} className={styles.iconSuccess} />
                            </div>
                            <div className={styles.fileDetails}>
                                <p className={styles.fileName}>{file.name}</p>
                                <span className={styles.fileSize}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </span>
                            </div>
                            <motion.button
                                type="button"
                                className={styles.removeBtn}
                                onClick={removeFile}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Remover archivo"
                            >
                                <Trash2 size={16} />
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        {...getRootProps()}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${iconType === 'svg' ? styles.svgDropzone : styles.excelDropzone}`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                        <input {...getInputProps()} />
                        <div className={styles.content}>
                            <motion.div 
                                className={styles.iconWrapper}
                                animate={isDragActive ? { y: -5 } : { y: 0 }}
                            >
                                {renderIcon()}
                            </motion.div>
                            <p className={styles.text}>
                                {isDragActive ? 'Suelta el archivo aquí...' : 'Selecciona o arrastra tu archivo'}
                            </p>
                            <span className={styles.subtext}>
                                {placeholderText || 'Formatos admitidos'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dropzone;
