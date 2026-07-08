import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ComparisonSlider — overlay arrastrable entre imagen original y escalada.
 * Utiliza clip-path para revelar la imagen escalada debajo de la original de forma precisa.
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
            className="cs-root"
            onMouseMove={(e) => { if (dragging.current) move(e.clientX); }}
            onTouchMove={(e) => { e.preventDefault(); move(e.touches[0].clientX); }}
        >
            {/* AFTER — imagen escalada (fondo) */}
            <img src={after} alt="Escalada" className="cs-img cs-img-after" draggable={false} />

            {/* BEFORE — imagen original (superpuesta y recortada con clip-path) */}
            <img
                src={before}
                alt="Original"
                className="cs-img cs-img-before"
                draggable={false}
                style={{ clipPath: `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)` }}
            />

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

