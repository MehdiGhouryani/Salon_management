import React, { useEffect, useState } from 'react';
import { Copy, Check, QrCode } from 'lucide-react';
import { DetailedSalonData } from '../../mock/salonDirectoryData';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SafeImage } from '../ui/SafeImage';
import { PageTitle } from './PageTitle';
import { SettingsSection } from './SettingsSection';

interface Preset {
  id: string;
  name: string;
  url: string;
}

interface ShowcaseTabProps {
  salon: DetailedSalonData;
  presets: Preset[];
  copied: boolean;
  onCopyLink: () => void;
  onOpenQr: () => void;
  onSelectBanner: (url: string) => void;
  onSaveCustomBanner: (url: string) => void;
  onSaveDetails: (v: { tagline: string; workingHours: string; address: string }) => void;
}

export const ShowcaseTab: React.FC<ShowcaseTabProps> = ({
  salon,
  presets,
  copied,
  onCopyLink,
  onOpenQr,
  onSelectBanner,
  onSaveCustomBanner,
  onSaveDetails,
}) => {
  const [tagline, setTagline] = useState(salon.tagline);
  const [hours, setHours] = useState(salon.workingHours);
  const [address, setAddress] = useState(salon.address);
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    setTagline(salon.tagline);
    setHours(salon.workingHours);
    setAddress(salon.address);
  }, [salon.id, salon.tagline, salon.workingHours, salon.address]);

  const dirty =
    tagline !== salon.tagline || hours !== salon.workingHours || address !== salon.address;

  return (
    <div>
      <PageTitle title="ویترین سایت" sub="صفحه‌ای که مشتری‌ها قبل از گرفتن نوبت می‌بینند." />

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-5">
        <SettingsSection title="لینک سالن" description="مشتری‌ها از این آدرس نوبت می‌گیرند.">
          <div className="flex flex-wrap items-center gap-2">
            <div
              dir="ltr"
              className="flex-1 min-w-[12rem] h-10 px-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subsurface)] text-sm text-[var(--text-primary)] flex items-center tabular-nums truncate"
            >
              nobatara.ir/{salon.slug}
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={onCopyLink}
              leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'کپی شد' : 'کپی لینک'}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onOpenQr}
              leftIcon={<QrCode className="w-4 h-4" />}
            >
              کد QR
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          title="تصویر هدر"
          description="با انتخاب، بلافاصله روی وب‌سایت اعمال می‌شود."
        >
          <SafeImage
            src={salon.bannerImage}
            alt="پیش‌نمایش تصویر هدر"
            className="w-full aspect-[16/6] rounded-xl object-cover border border-[var(--border-default)]"
          />
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((p) => {
              const selected = salon.bannerImage === p.url;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectBanner(p.url)}
                  aria-pressed={selected}
                  className={`text-start rounded-xl border p-1.5 transition-colors cursor-pointer ${
                    selected
                      ? 'border-[var(--text-primary)]'
                      : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <SafeImage
                    src={p.url}
                    alt=""
                    className="w-full aspect-[16/8] rounded-lg object-cover"
                  />
                  <span className="block text-xs text-[var(--text-secondary)] mt-1.5 px-0.5 truncate">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="یا آدرس تصویر دلخواه"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                dir="ltr"
                placeholder="https://"
                inputMode="url"
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              disabled={!customUrl.trim()}
              onClick={() => {
                onSaveCustomBanner(customUrl);
                setCustomUrl('');
              }}
            >
              اعمال
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="مشخصات صفحه" description="این متن‌ها در وب‌سایت سالن نمایش داده می‌شوند.">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveDetails({ tagline, workingHours: hours, address });
            }}
          >
            <Input label="شعار سالن" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            <Input label="ساعات کاری" value={hours} onChange={(e) => setHours(e.target.value)} />
            <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Button type="submit" size="md" disabled={!dirty}>
              ذخیره تغییرات
            </Button>
          </form>
        </SettingsSection>
      </div>
    </div>
  );
};
