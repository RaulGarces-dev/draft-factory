import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CONCURRENCY_LIMIT = 3;

export default function useBatchUpscaler() {
    const [files, setFiles] = useState([]);
    const [quality, setQuality] = useState('FHD');
    const [format, setFormat] = useState('jpg');
    const [status, setStatus] = useState('idle'); // idle | processing | done | error
    const [globalProgress, setGlobalProgress] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    
    // Almacenamos el estado individual de cada archivo para la UI
    const [fileStatuses, setFileStatuses] = useState({}); 
    // { [fileName]: { status: 'pending' | 'uploading' | 'processing' | 'done' | 'error', progress: 0, blob: null } }

    const abortControllerRef = useRef(null);
    const activeWorkers = useRef(0);
    const queueIndex = useRef(0);

    const reset = useCallback(() => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setFiles([]);
        setStatus('idle');
        setGlobalProgress(0);
        setCompletedCount(0);
        setFileStatuses({});
        activeWorkers.current = 0;
        queueIndex.current = 0;
    }, []);

    const processNext = async (currentFiles, currentFileStatuses, resolveBatch) => {
        if (abortControllerRef.current?.signal.aborted) return;

        // Si ya terminamos todos
        if (queueIndex.current >= currentFiles.length) {
            if (activeWorkers.current === 0) {
                setStatus('done');
                resolveBatch();
            }
            return;
        }

        // Tomar el siguiente archivo
        const currentIndex = queueIndex.current++;
        const file = currentFiles[currentIndex];
        activeWorkers.current++;

        const updateFileStatus = (statusUpdate) => {
            setFileStatuses(prev => {
                const newState = { ...prev };
                newState[file.name] = { ...newState[file.name], ...statusUpdate };
                return newState;
            });
        };

        try {
            updateFileStatus({ status: 'uploading', progress: 10 });

            const form = new FormData();
            form.append('image', file);
            form.append('quality', quality);
            form.append('format', format);

            const res = await fetch(`${API_URL}/api/upscaler/upscale`, { 
                method: 'POST', 
                body: form,
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { jobId } = await res.json();

            updateFileStatus({ status: 'processing', progress: 20 });

            // Polling
            await new Promise((resolve, reject) => {
                const poll = setInterval(async () => {
                    if (abortControllerRef.current?.signal.aborted) {
                        clearInterval(poll);
                        reject(new Error("Aborted"));
                    }
                    try {
                        const pollRes = await fetch(`${API_URL}/api/upscaler/progress/${jobId}`);
                        if (!pollRes.ok) return;
                        const job = await pollRes.json();

                        if (job.status === 'done') {
                            clearInterval(poll);
                            
                            const imgRes = await fetch(`${API_URL}/api/upscaler/result/${jobId}`);
                            const blob = await imgRes.blob();
                            
                            updateFileStatus({ status: 'done', progress: 100, blob });
                            
                            setCompletedCount(c => {
                                const newC = c + 1;
                                setGlobalProgress(Math.round((newC / currentFiles.length) * 100));
                                return newC;
                            });
                            resolve();
                        } else if (job.status === 'error') {
                            clearInterval(poll);
                            throw new Error(job.error);
                        } else if (job.status === 'processing') {
                            updateFileStatus({ progress: 20 + (job.progress * 0.7) }); // Scale 0-100 to 20-90
                        }
                    } catch (e) {
                        if (e.message !== "Aborted") {
                            clearInterval(poll);
                            reject(e);
                        }
                    }
                }, 2000);
            });

        } catch (error) {
            if (error.message !== "Aborted") {
                updateFileStatus({ status: 'error', error: error.message });
                setCompletedCount(c => {
                    const newC = c + 1;
                    setGlobalProgress(Math.round((newC / currentFiles.length) * 100));
                    return newC;
                });
            }
        } finally {
            activeWorkers.current--;
            // Lanzar el siguiente
            processNext(currentFiles, currentFileStatuses, resolveBatch);
        }
    };

    const startBatch = useCallback(async () => {
        if (files.length === 0) return;
        
        abortControllerRef.current = new AbortController();
        setStatus('processing');
        setGlobalProgress(0);
        setCompletedCount(0);
        queueIndex.current = 0;
        activeWorkers.current = 0;

        // Initialize statuses
        const initialStatuses = {};
        files.forEach(f => {
            initialStatuses[f.name] = { status: 'pending', progress: 0, blob: null };
        });
        setFileStatuses(initialStatuses);

        await new Promise((resolve) => {
            // Iniciar N workers
            for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, files.length); i++) {
                processNext(files, initialStatuses, resolve);
            }
        });

    }, [files, quality, format]);

    const downloadZip = useCallback(async () => {
        const zip = new JSZip();
        let hasFiles = false;

        Object.entries(fileStatuses).forEach(([name, data]) => {
            if (data.status === 'done' && data.blob) {
                const ext = format === 'jpeg' ? 'jpg' : format;
                const newName = name.replace(/\.[^/.]+$/, "") + `_upscaled_${quality}.${ext}`;
                zip.file(newName, data.blob);
                hasFiles = true;
            }
        });

        if (!hasFiles) return;

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Vario_Upscaler_Lote_${quality}.zip`);
    }, [fileStatuses, format, quality]);

    return {
        files, setFiles,
        quality, setQuality,
        format, setFormat,
        status, globalProgress, completedCount,
        fileStatuses,
        startBatch, reset, downloadZip
    };
}
