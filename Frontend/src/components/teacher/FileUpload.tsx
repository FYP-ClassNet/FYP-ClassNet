import { useState } from "react";

interface UploadedFile {
  fileId: string;
  originalName: string;
  fileUrl: string;
  category: string;
  sizeBytes: number;
}

interface Props {
  sessionId: string;
  files: UploadedFile[];
  onFileUploaded: (file: UploadedFile) => void;
  onFileDeleted: (fileId: string) => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function categoryIcon(category: string) {
  if (category === "pdf") return "📄";
  if (category === "image") return "🖼️";
  if (category === "video") return "🎥";
  if (category === "document") return "📝";
  return "📎";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ sessionId, files, onFileUploaded, onFileDeleted }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/files/${sessionId}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      onFileUploaded(data);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    await fetch(`${BACKEND_URL}/api/files/${sessionId}/${fileId}`, {
      method: "DELETE",
    });
    onFileDeleted(fileId);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">File Sharing</h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            {files.length} file{files.length !== 1 ? "s" : ""} shared
          </p>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Drop zone */}
        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-700 hover:border-zinc-600"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-3xl">📁</span>
              <p className="text-zinc-500 text-sm">Drag & drop or</p>
              <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                Browse File
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="flex flex-col divide-y divide-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
            {files.map((file) => (
              <div key={file.fileId} className="flex items-center justify-between px-4 py-3.5 bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-zinc-700 rounded-xl flex items-center justify-center text-lg">
                    {categoryIcon(file.category)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium truncate max-w-56">{file.originalName}</p>
                    <p className="text-zinc-500 text-xs">{formatSize(file.sizeBytes)}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteFile(file.fileId)}
                  className="text-red-400 hover:text-white text-xs bg-red-500/10 hover:bg-red-500 px-2.5 py-1 rounded-lg transition-all"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}