import React, { useState, useRef } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  Sparkles,
  Scissors,
  Smartphone,
  Printer,
} from 'lucide-react';
import { DetailedSalonData } from '../../mock/salonDirectoryData';
import { toPersianDigits } from '../../utils/formatters';

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
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard?.writeText(`${shareData.text}\n${salonUrl}`);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    // Generate an image from the SVG element
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
        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 500, 500);

        // Download link
        const a = document.createElement('a');
        a.download = `QR-${salon.slug || 'salon'}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Generate a deterministic visual QR pattern based on the salon slug
  const qrGridSize = 25;
  const generateQrMatrix = () => {
    const matrix: boolean[][] = Array.from({ length: qrGridSize }, () =>
      Array(qrGridSize).fill(false)
    );

    // Helper: Finder patterns (7x7 corner blocks)
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

    // 3 Finder patterns
    drawFinder(0, 0); // Top-left
    drawFinder(qrGridSize - 7, 0); // Top-right
    drawFinder(0, qrGridSize - 7); // Bottom-left

    // Timing patterns
    for (let i = 8; i < qrGridSize - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Deterministic data fill based on slug
    const str = `${salon.slug || 'gisara'}-nobatara-booking-link`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < qrGridSize; r++) {
      for (let c = 0; c < qrGridSize; c++) {
        // Skip finder zones
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= qrGridSize - 8;
        const inBL = r >= qrGridSize - 8 && c < 8;
        // Leave center 5x5 clear for logo
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-3xl shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-[#E7ECF5]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#344258]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">کد QR اختصاصی سالن</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9AAAC2]">
                اشتراک‌گذاری مستقیم صفحه رزرو با مراجعین
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18243A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          {/* Salon mini branding */}
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              {salon.name}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-[#9AAAC2] mt-0.5 block">
              اسکن کنید و مستقیماً نوبت بگیرید
            </span>
          </div>

          {/* QR Code Container */}
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-inner inline-block mx-auto relative group"
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

            {/* Central Badge Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                <Scissors className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Short URL Box */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] text-xs">
            <span className="font-mono text-slate-700 dark:text-[#9AAAC2] font-semibold truncate ltr text-left pl-2">
              nobatara.ir/{salon.slug || 'gisara'}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold transition-all shrink-0 cursor-pointer text-[11px]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی لینک</span>
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleDownloadQr}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#344258] hover:bg-slate-50 dark:hover:bg-[#18243A] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>دانلود بارکد چاپ</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#344258] hover:bg-slate-50 dark:hover:bg-[#18243A] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{shareFeedback ? 'متن کپی شد' : 'اشتراک در پیام‌رسان'}</span>
            </button>
          </div>

          {/* Tips footer */}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
            💡 این بارکد را می‌توانید چاپ کرده و روی آینه‌ها، کارت ویزیت یا استند پذیرش سالن قرار دهید تا مشتریان بدون معطلی نوبت بگیرند.
          </p>
        </div>
      </div>
    </div>
  );
};
