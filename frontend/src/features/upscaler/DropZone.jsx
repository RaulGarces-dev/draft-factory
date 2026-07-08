import React, { useState, useCallback } from "react";
import { ImageUp } from "lucide-react";

export default function DropZone({ onFileSelect }) {
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    (file) => {
      if (!file) return;
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        alert("Solo se permiten JPG, PNG o WebP.");
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      processFile(e.dataTransfer.files[0]);
    },
    [processFile]
  );

  return (
    <div
      className={`upscaler-dropzone ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => processFile(e.target.files[0])}
      />
      <ImageUp size={36} strokeWidth={1.4} className="text-violet-400" />
      <div className="text-center pointer-events-none">
        <p className="text-sm font-semibold text-slate-700">
          Arrastra tu imagen aquí
        </p>
        <p className="text-xs text-slate-400 mt-1">
          o haz clic para seleccionarla &mdash; JPG, PNG, WebP hasta 50 MB
        </p>
      </div>
    </div>
  );
}
