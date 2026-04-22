import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

interface Props {
  sessionCode: string;
  lanUrl: string;
}

export function SessionQRCode({ sessionCode, lanUrl }: Props) {
  const [showQR, setShowQR] = useState(false);

  if (!showQR) {
    return (
      <button
        onClick={() => setShowQR(true)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 px-3 rounded-lg transition-colors w-full justify-center"
      >
        <span>📱</span> Show QR Code
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG
          value={lanUrl}
          size={160}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
      <p className="text-zinc-500 text-xs text-center">
        Students scan to join directly
      </p>
      <button
        onClick={() => setShowQR(false)}
        className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
      >
        Hide QR
      </button>
    </div>
  );
}