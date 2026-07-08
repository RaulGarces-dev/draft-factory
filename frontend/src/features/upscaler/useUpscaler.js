import { useState, useCallback, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const INITIAL = { status: 'idle', progress: 0, position: 0, resultUrl: null, resultName: null, error: null };

export default function useUpscaler() {
    const [state, setState] = useState(INITIAL);
    const esRef = useRef(null);

    const patch = useCallback((data) => setState((s) => ({ ...s, ...data })), []);

    const reset = useCallback(() => {
        esRef.current?.close();
        setState(INITIAL);
    }, []);

    const submit = useCallback(async (file, scale, format) => {
        if (!file) return;
        esRef.current?.close();
        patch({ status: 'queued', progress: 0, position: 1, resultUrl: null, error: null });

        try {
            const form = new FormData();
            form.append('image', file);
            form.append('scale', scale);
            form.append('format', format);

            const res = await fetch(`${API}/upscaler/upscale`, { method: 'POST', body: form });
            if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
            const { jobId, wasResized } = await res.json();

            // Informar si la imagen fue pre-reducida por ser muy grande
            if (wasResized) patch({ wasResized: true });

            // Conectar al stream SSE de progreso
            const es = new EventSource(`${API}/upscaler/progress/${jobId}`);
            esRef.current = es;

            es.onmessage = async (e) => {
                const job = JSON.parse(e.data);

                if (job.status === 'done') {
                    es.close();
                    // Bajar resultado como blob para download cross-origin
                    const imgRes = await fetch(`${API}/upscaler/result/${jobId}`);
                    const blob = await imgRes.blob();
                    const ext = format === 'jpeg' ? 'jpg' : format;
                    patch({
                        status: 'done',
                        progress: 100,
                        resultUrl: URL.createObjectURL(blob),
                        resultName: `upscaled_${scale}x.${ext}`,
                    });
                } else if (job.status === 'error') {
                    es.close();
                    patch({ status: 'error', error: job.error });
                } else if (job.status === 'processing') {
                    patch({ status: 'processing', progress: job.progress });
                } else if (job.status === 'queued') {
                    patch({ status: 'queued', position: job.position });
                }
            };

            es.onerror = () => {
                es.close();
                patch({ status: 'error', error: 'Conexion perdida con el servidor.' });
            };
        } catch (err) {
            patch({ status: 'error', error: err.message });
        }
    }, [patch]);

    const download = useCallback(() => {
        if (!state.resultUrl || !state.resultName) return;
        const a = document.createElement('a');
        a.href = state.resultUrl;
        a.download = state.resultName;
        a.click();
    }, [state.resultUrl, state.resultName]);

    return { ...state, submit, reset, download };
}
