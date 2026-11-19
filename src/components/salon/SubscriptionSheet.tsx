import React from 'react';
import { Check } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { GATEWAYS, GatewayId, PLANS, PlanId } from './plans';
import { formatNumber } from '../../utils/formatters';

interface SubscriptionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode: boolean;
  plan: PlanId;
  onPlanChange: (p: PlanId) => void;
  gateway: GatewayId;
  onGatewayChange: (g: GatewayId) => void;
  isProcessing: boolean;
  paymentEnabled: boolean;
  onPay: () => void;
}

export const SubscriptionSheet: React.FC<SubscriptionSheetProps> = ({
  isOpen,
  onClose,
  isDemoMode,
  plan,
  onPlanChange,
  gateway,
  onGatewayChange,
  isProcessing,
  paymentEnabled,
  onPay,
}) => (
  <Sheet
    isOpen={isOpen}
    onClose={onClose}
    title="تمدید یا ارتقای اشتراک"
    description={
      isDemoMode
        ? 'در نسخه دمو پرداخت شبیه‌سازی می‌شود و تراکنش واقعی انجام نمی‌شود.'
        : paymentEnabled
          ? 'پرداخت امن از طریق درگاه زرین‌پال؛ فعال‌سازی اشتراک فقط پس از تأیید تراکنش انجام می‌شود.'
          : 'درگاه پرداخت هنوز در تنظیمات سرور فعال نشده است؛ پرداخت واقعی در دسترس نیست.'
    }
    footer={
      <Button size="lg" className="w-full" isLoading={isProcessing} disabled={!isDemoMode && !paymentEnabled} onClick={onPay}>
        {`پرداخت ${formatNumber(PLANS[plan].price)} تومان`}
      </Button>
    }
  >
    <div role="radiogroup" aria-label="پلن اشتراک" className="space-y-2">
      {Object.values(PLANS).map((p) => {
        const selected = p.id === plan;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPlanChange(p.id)}
            className={`w-full text-start flex items-center gap-3 rounded-xl border p-3.5 transition-colors cursor-pointer ${
              selected
                ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
            }`}
          >
            <span
              className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center ${
                selected
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-surface)]'
                  : 'border-[var(--border-strong)]'
              }`}
            >
              {selected && <Check className="w-3 h-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--text-primary)]">{p.offer}</span>
              <span className="block text-[13px] text-[var(--text-secondary)] mt-0.5">{p.features}</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-[var(--text-primary)]">
              {money(p.price)}
              <span className="text-[11px] text-[var(--text-muted)] ms-1">تومان</span>
            </span>
          </button>
        );
      })}
    </div>

    <h3 className="mt-5 mb-2 text-sm font-medium text-[var(--text-primary)]">درگاه پرداخت</h3>
    <div role="radiogroup" aria-label="درگاه پرداخت" className="grid grid-cols-3 gap-2">
      {GATEWAYS.map((g) => (
        <button
          key={g.id}
          type="button"
          role="radio"
          aria-checked={gateway === g.id}
          onClick={() => onGatewayChange(g.id)}
          className={`h-10 rounded-xl border text-sm transition-colors cursor-pointer ${
            gateway === g.id
              ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
              : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
          }`}
        >
          {g.name}
        </button>
      ))}
    </div>
  </Sheet>
);
