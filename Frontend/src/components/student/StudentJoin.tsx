import { useState } from "react";

interface Props {
  onJoin: (sessionCode: string, name: string, rollNumber: string) => void;
  error: string | null;
  isLoading: boolean;
}

export function StudentJoin({ onJoin, error, isLoading }: Props) {
  const [sessionCode, setSessionCode] = useState("");
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.trim() && name.trim() && rollNumber.trim()) {
      onJoin(sessionCode.trim().toUpperCase(), name.trim(), rollNumber.trim());
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-white text-2xl font-bold text-center">ClassNet</h1>
          <p className="text-zinc-500 text-sm text-center mt-1">Join your class</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. F22BINFT1M01103"
              className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm">Session Code</label>
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm tracking-widest uppercase focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim() || !rollNumber.trim() || !sessionCode.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {isLoading ? "Joining..." : "Join Class"}
          </button>
        </form>
      </div>
    </div>
  );
}