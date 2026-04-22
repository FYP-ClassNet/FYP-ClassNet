import { useRef, useState, useEffect } from "react";

interface Props {
  onFrame: (canvas: HTMLCanvasElement) => void;
  isStreaming: boolean;
}

type Tool = "pen" | "eraser" | "line" | "rect" | "circle";

export function Whiteboard({ onFrame, isStreaming }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Post frames while streaming
  useEffect(() => {
    if (!isStreaming) return;

    frameIntervalRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) onFrame(canvas);
    }, 150);

    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [isStreaming, onFrame]);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);

    setIsDrawing(true);
    lastPos.current = pos;

    // Save snapshot for shape drawing
    if (tool === "line" || tool === "rect" || tool === "circle") {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);

    ctx.lineWidth = tool === "eraser" ? size * 5 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#1a1a2e" : color;
    ctx.fillStyle = color;

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    } else if (snapshotRef.current) {
      // Restore snapshot before drawing shape
      ctx.putImageData(snapshotRef.current, 0, 0);

      if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === "rect") {
        ctx.beginPath();
        ctx.strokeRect(
          lastPos.current.x,
          lastPos.current.y,
          pos.x - lastPos.current.x,
          pos.y - lastPos.current.y
        );
      } else if (tool === "circle") {
        const rx = Math.abs(pos.x - lastPos.current.x) / 2;
        const ry = Math.abs(pos.y - lastPos.current.y) / 2;
        const cx = lastPos.current.x + (pos.x - lastPos.current.x) / 2;
        const cy = lastPos.current.y + (pos.y - lastPos.current.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const endDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
    snapshotRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current!;
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const colors = ["#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
  const tools: { id: Tool; icon: string; label: string }[] = [
    { id: "pen", icon: "✏️", label: "Pen" },
    { id: "eraser", icon: "⬜", label: "Eraser" },
    { id: "line", icon: "╱", label: "Line" },
    { id: "rect", icon: "▭", label: "Rect" },
    { id: "circle", icon: "○", label: "Circle" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center gap-3">

        {/* Tools */}
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`w-9 h-9 rounded-lg text-sm transition-all ${
                tool === t.id
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-zinc-700" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-all ${
                color === c ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-zinc-700" />

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs">Size</span>
          <input
            type="range"
            min={1}
            max={20}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-20 accent-emerald-500"
          />
          <span className="text-zinc-400 text-xs w-4">{size}</span>
        </div>

        <div className="w-px h-6 bg-zinc-700" />

        {/* Actions */}
        <button
          onClick={clearCanvas}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          Clear
        </button>
        <button
          onClick={saveCanvas}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          Save ↓
        </button>

        {isStreaming && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden border border-zinc-800 cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
    </div>
  );
}