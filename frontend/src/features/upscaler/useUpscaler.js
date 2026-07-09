import { useState, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const INITIAL = { status: 'idle', progress: 0, position: 0, resultUrl: null, resultName: null, error: null };

export default function useUpscaler() {
    const [state, setState] = useState(INITIAL);
    const esRef = useRef(null);

    const patch = useCallback((data) => setState((s) => ({ ...s, ...data })), []);

    const reset = useCallback(() => {
        esRef.current?.close();
        setState(INITIAL);
    }, []);

    const submit = useCallback(async (file, quality, format) => {
        if (!file) return;
        esRef.current?.close();
        patch({ status: 'queued', progress: 0, position: 1, resultUrl: null, error: null });

        try {
            const form = new FormData();
            form.append('image', file);
            form.append('quality', quality);
            form.append('format', format);

            const res = await fetch(`${API_URL}/api/upscaler/upscale`, { method: 'POST', body: form });
            
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.indexOf('application/json') === -1) {
                throw new Error(`Error de servidor (HTML). Código: ${res.status}. Posible causa: Nginx o Node.js caído.`);
            }

            if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
            const { jobId } = await res.json();

            // Polling cada 2 segundos en lugar de SSE para evitar timeouts de Nginx
            const poll = setInterval(async () => {
                try {
                    const pollRes = await fetch(`${API_URL}/api/upscaler/progress/${jobId}`);
                    if (!pollRes.ok) return; // Ignorar fallos temporales de red
                    const job = await pollRes.json();

                    if (job.status === 'done') {
                        clearInterval(poll);
                        
                        const imgRes = await fetch(`${API_URL}/api/upscaler/result/${jobId}`);
                        const blob = await imgRes.blob();
                        const ext = format === 'jpeg' ? 'jpg' : format;

                        const inpRes = await fetch(`${API_URL}/api/upscaler/input/${jobId}`);
                        const inpBlob = await inpRes.blob();

                        patch({
                            status: 'done',
                            progress: 100,
                            resultUrl: URL.createObjectURL(blob),
                            inputUrl: URL.createObjectURL(inpBlob),
                            resultName: `upscaled_${quality}.${ext}`,
                        });
                    } else if (job.status === 'error') {
                        clearInterval(poll);
                        patch({ status: 'error', error: job.error });
                    } else if (job.status === 'processing') {
                        patch({ status: 'processing', progress: job.progress });
                    } else if (job.status === 'queued') {
                        patch({ status: 'queued', position: job.position });
                    }
                } catch (e) {
                    console.warn("Fallo temporal de polling:", e);
                    // No cortamos la conexión, reintentará en 2 segundos
                }
            }, 2000);

            // Guardamos el interval en ref para poder cancelarlo en unmont/reset
            esRef.current = { close: () => clearInterval(poll) };

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
