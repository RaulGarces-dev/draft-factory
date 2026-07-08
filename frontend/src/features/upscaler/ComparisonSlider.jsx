import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ComparisonSlider — overlay arrastrable entre imagen original y escalada.
 * Ambas imagenes ocupan el 100% del contenedor; el clip revela la "before" a la izquierda.
 */
export default function ComparisonSlider({ before, after, scale }) {
    const [pos, setPos] = useState(50);
    const containerRef = useRef(null);
    const [containerW, setContainerW] = useState(0);
    const dragging = useRef(false);

    // Observar el ancho real del contenedor para el fix del before-img
    useEffect(() => {
        const ro = new ResizeObserver(([entry]) => {
            setContainerW(entry.contentRect.width);
        });
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const move = useCallback((clientX) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPos(Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 1), 99));
    }, []);

    useEffect(() => {
        const onUp = () => { dragging.current = false; };
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="cs-root"
            onMouseMove={(e) => { if (dragging.current) move(e.clientX); }}
            onTouchMove={(e) => { e.preventDefault(); move(e.touches[0].clientX); }}
        >
            {/* AFTER — imagen escalada (fondo completo) */}
            <img src={after} alt="Escalada" className="cs-img" draggable={false} />

            {/* BEFORE — imagen original: clip por width, img forzada al ancho del contenedor */}
            <div className="cs-before-clip" style={{ width: `${pos}%` }}>
                <img
                    src={before}
                    alt="Original"
                    className="cs-img"
                    draggable={false}
                    style={{ width: containerW > 0 ? `${containerW}px` : '100%' }}
                />
            </div>

            {/* Handle */}
            <div
                className="cs-handle"
                style={{ left: `${pos}%` }}
                onMouseDown={() => { dragging.current = true; }}
                onTouchStart={() => { dragging.current = true; }}
            >
                <div className="cs-line" />
                <div className="cs-knob">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 18l-6-6 6-6" /><path d="M15 6l6 6-6 6" />
                    </svg>
                </div>
            </div>

            {/* Labels */}
            <span className="cs-label cs-label-left">Original</span>
            <span className="cs-label cs-label-right">Escalada {scale}×</span>
        </div>
    );
}
