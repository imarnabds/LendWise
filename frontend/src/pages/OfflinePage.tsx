import React, { useEffect, useRef } from 'react';
import { LOGO_BASE64 } from './logoBase64';

export const OfflinePage: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = LOGO_BASE64;

        let progress = 0;
        let fade = 1;
        let phase = 'loading';
        let animFrameId: number;

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            const animate = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const eased = 1 - Math.pow(1 - progress, 3);

                ctx.save();
                ctx.globalAlpha = fade;
                ctx.beginPath();
                ctx.rect(0, 0, canvas.width * eased, canvas.height);
                ctx.clip();
                ctx.drawImage(img, 0, 0);
                ctx.restore();

                if (phase === 'loading') {
                    progress += 0.002;
                    if (progress >= 1) phase = 'fade';
                } else if (phase === 'fade') {
                    fade -= 0.02;
                    if (fade <= 0) {
                        progress = 0;
                        fade = 1;
                        phase = 'loading';
                    }
                }

                animFrameId = requestAnimationFrame(animate);
            };

            animate();
        };

        return () => cancelAnimationFrame(animFrameId);
    }, []);

    // Typing + dots effect
    useEffect(() => {
        const baseText = 'Preparing your experience';
        const el = document.getElementById('offline-text');
        if (!el) return;

        let index = 0;
        let dotTimer: ReturnType<typeof setInterval>;

        const typeEffect = () => {
            if (index < baseText.length) {
                el.textContent += baseText[index];
                index++;
                setTimeout(typeEffect, 90);
            } else {
                let dotCount = 0;
                dotTimer = setInterval(() => {
                    dotCount = (dotCount + 1) % 4;
                    el.textContent = baseText + '.'.repeat(dotCount);
                }, 400);
            }
        };

        typeEffect();
        return () => clearInterval(dotTimer);
    }, []);

    return (
        <div style={{
            margin: 0,
            background: 'black',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            overflow: 'hidden',
            fontFamily: 'Arial, sans-serif',
        }}>
            <canvas
                ref={canvasRef}
                style={{ width: 100, height: 'auto' }}
            />
            <div
                id="offline-text"
                style={{
                    marginTop: 20,
                    fontSize: 16,
                    color: '#39ff14',
                    opacity: 0.9,
                    letterSpacing: '0.5px',
                    minHeight: 20,
                }}
            />
        </div>
    );
};
