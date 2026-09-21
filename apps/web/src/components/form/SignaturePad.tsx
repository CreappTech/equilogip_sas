"use client";

import { useCallback, useEffect, useRef } from "react";

interface SignaturePadProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
  height?: number;
}

const TRAZO_COLOR = "#1f2937";

/**
 * Pad de firma digital sobre canvas nativo (sin dependencias, decisión de
 * diseño confirmada). Emite un data URL PNG cada vez que se termina un trazo
 * o se limpia. La firma se sube al bucket privado `dotacion-evidencias`
 * recién al registrar la entrega (agrupación en el submit del formulario).
 */
export default function SignaturePad({
  value,
  onChange,
  disabled = false,
  height = 180,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const ultimoTrazo = useRef<string | null>(null);
  const haInicializado = useRef(false);

  const getContexto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  };

  const dimensionar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = TRAZO_COLOR;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    haInicializado.current = true;

    // Repintar el trazo previo (compatible con resize/responsive).
    if (ultimoTrazo.current) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, img.width, img.height);
      img.src = ultimoTrazo.current;
    }
  }, [height]);

  useEffect(() => {
    dimensionar();
    const observer = new ResizeObserver(() => dimensionar());
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [dimensionar]);

  const getPosicion = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = getContexto();
    const pos = getPosicion(event);
    if (!canvas || !ctx || !pos) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    dibujando.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + 0.01, pos.y + 0.01);
    ctx.stroke();
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = getContexto();
    const pos = getPosicion(event);
    if (!ctx || !pos) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function finalizarTrazo() {
    if (!dibujando.current) return;
    dibujando.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !haInicializado.current) return;
    const dataUrl = canvas.toDataURL("image/png");
    ultimoTrazo.current = dataUrl;
    onChange?.(dataUrl);
  }

  function limpiar() {
    const ctx = getContexto();
    if (!ctx || !canvasRef.current) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ultimoTrazo.current = null;
    onChange?.(null);
  }

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-lg border ${
          disabled
            ? "cursor-not-allowed border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
            : "border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
        }`}
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ height }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finalizarTrazo}
          onPointerCancel={finalizarTrazo}
          onPointerLeave={finalizarTrazo}
          aria-label="Pad de firma del receptor"
        />
        {!value && (
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-gray-400">
            Firma aquí con el dedo o el mouse
          </p>
        )}
      </div>
      {!disabled && (
        <div className="mt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={limpiar}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}