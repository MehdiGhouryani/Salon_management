import React, { useState, useRef } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Download,
  Share2,
  Scissors,
} from 'lucide-react';
import { DetailedSalonData } from '../../mock/salonDirectoryData';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SalonQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: DetailedSalonData;
}

export const SalonQrModal: React.FC<SalonQrModalProps> = ({
  isOpen,
  onClose,
  salon,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const salonUrl = `https://nobatara.ir/${salon.slug || 'gisara'}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(salonUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    const shareData = {
      title: `رزرو آنلاین نوبت در ${salon.name}`,
      text: `سلام! برای مشاهده خدمات، لیست قیمت‌ها و رزرو سریع نوبت در ${salon.name} روی لینک زیر کلیک کنید:`,
      url: salonUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard?.writeText(`${shareData.text}\n${salonUrl}`);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    const svgElement = document.getElementById('salon-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 500, 500);

        const a = document.createElement('a');
        a.download = `QR-${salon.slug || 'salon'}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const qrGridSize = 25;
  const generateQrMatrix = () => {
    const matrix: boolean[][] = Array.from({ length: qrGridSize }, () =>
      Array(qrGridSize).fill(false)
    );

    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(qrGridSize - 7, 0);
    drawFinder(0, qrGridSize - 7);

    for (let i = 8; i < qrGridSize - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    const str = `${salon.slug || 'gisara'}-nobatara-booking-link`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < qrGridSize; r++) {
      for (let c = 0; c < qrGridSize; c++) {
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= qrGridSize - 8;
        const inBL = r >= qrGridSize - 8 && c < 8;
        const inCenter =
          r >= Math.floor(qrGridSize / 2) - 2 &&
          r <= Math.floor(qrGridSize / 2) + 2 &&
          c >= Math.floor(qrGridSize / 2) - 2 &&
          c <= Math.floor(qrGridSize / 2) + 2;

        if (!inTL && !inTR && !inBL && !inCenter) {
          const pseudoRand = Math.abs(Math.sin((r * qrGridSize + c) * hash + 77));
          matrix[r][c] = pseudoRand > 0.46;
        }
      }
    }

    return matrix;
  };

  const matrix = generateQrMatrix();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="کد QR اختصاصی سالن"
      description="اشتراک‌گذاری مستقیم صفحه رزرو با مراجعین"
      icon={<QrCode className="w-4 h-4 text-[var(--brand-primary)]" />}
      size="sm"
    >
      <div className="space-y-4 text-center">
        <div>
          <span className="text-xs font-bold text-[var(--text-primary)] block">
            {salon.name}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
            اسکن کنید و مستقیماً نوبت بگیرید
          </span>
        </div>

        <div
          ref={qrRef}
          className="p-4 bg-white rounded-2xl border-2 border-[var(--border-subtle)] shadow-inner inline-block mx-auto relative"
        >
          <svg
            id="salon-qr-svg"
            viewBox={`0 0 ${qrGridSize} ${qrGridSize}`}
            className="w-48 h-48 sm:w-52 sm:h-52"
            shapeRendering="crispEdges"
          >
            {matrix.map((row, r) =>
              row.map((active, c) =>
                active ? (
                  <rect
                    key={`${r}-${c}`}
                    x={c}
                    y={r}
                    width={1}
                    height={1}
                    fill="#0F172A"
                  />
                ) : null
              )
            )}
          </svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-md border-2 border-white">
              <Scissors className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-subsurface)] border border-[var(--border-subtle)] text-xs">
          <span className="font-mono text-[var(--text-primary)] font-semibold truncate ltr text-left pl-2">
            nobatara.ir/{salon.slug || 'gisara'}
          </span>
          <Button
            variant="primary"
            size="xs"
            onClick={handleCopyLink}
            leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'کپی شد!' : 'کپی لینک'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadQr}
            leftIcon={<Download className="w-3.5 h-3.5 text-[var(--brand-primary)]" />}
          >
            دانلود بارکد چاپ
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            leftIcon={<Share2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />}
          >
            {shareFeedback ? 'متن کپی شد' : 'اشتراک‌گذاری'}
          </Button>
        </div>

        <p className="text-[10px] text-[var(--text-muted)] leading-normal">
          💡 این بارکد را می‌توانید چاپ کرده و روی آینه‌ها، کارت ویزیت یا استند پذیرش سالن قرار دهید تا مشتریان بدون معطلی نوبت بگیرند.
        </p>
      </div>
    </Modal>
  );
};
