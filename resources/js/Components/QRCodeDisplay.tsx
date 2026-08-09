import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ url, size = 128 }: { url: string; size?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !url) return;
        QRCode.toCanvas(canvasRef.current, url, {
            width: size,
            margin: 1,
            color: { dark: '#0f0f1a', light: '#ffffff' },
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
            <canvas ref={canvasRef} className="rounded-lg border border-border-subtle" />
            <button
                type="button"
                onClick={download}
                className="text-xs text-text-tertiary hover:text-text-primary underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1"
            >
                Download QR Code
            </button>
        </div>
    );
}
