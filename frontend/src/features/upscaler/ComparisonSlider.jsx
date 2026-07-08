import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ComparisonSlider — overlay arrastrable entre imagen original y escalada.
 * Props: before (src original), after (src resultado), scale (string "2"|"4")
 */
export default function ComparisonSlider({ before, after, scale }) {
    const [pos, setPos] = useState(50);
    const containerRef = useRef(null);
    const dragging = useRef(false);

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
            className="comparison-root"
            onMouseMove={(e) => { if (dragging.current) move(e.clientX); }}
            onTouchMove={(e) => move(e.touches[0].clientX)}
        >
            {/* Imagen de resultado (fondo completo) */}
            <img src={after} alt="Escalada" className="comparison-img" draggable={false} />

            {/* Imagen original — recortada por width */}
            <div className="comparison-before-layer" style={{ width: `${pos}%` }}>
                <img src={before} alt="Original" className="comparison-img" draggable={false} />
            </div>

            {/* Handle arrastrable */}
            <div
                className="comparison-handle"
                style={{ left: `${pos}%` }}
                onMouseDown={() => { dragging.current = true; }}
                onTouchStart={() => { dragging.current = true; }}
            >
                <div className="comparison-line" />
                <div className="comparison-knob">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 18l-6-6 6-6" /><path d="M15 6l6 6-6 6" />
                    </svg>
                </div>
            </div>

            {/* Labels */}
            <span className="comparison-label left">Original</span>
            <span className="comparison-label right">Escalada {scale}×</span>
        </div>
    );
}
