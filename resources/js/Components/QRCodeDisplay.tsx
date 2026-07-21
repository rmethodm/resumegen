import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ url, size = 128 }: { url: string; size?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !url) return;
        QRCode.toCanvas(canvasRef.current, url, {
            width: size,
            margin: 1,
            color: { dark: '#111827', light: '#ffffff' },
        });
    }, [url, size]);

    const download = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = 'resume-qr-code.png';
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <canvas ref={canvasRef} className="rounded-lg border border-[#e8edf5]" />
            <button
                type="button"
                onClick={download}
                className="text-xs text-[#94a3b8] hover:text-[#111827] underline"
            >
                Download QR Code
            </button>
        </div>
    );
}
