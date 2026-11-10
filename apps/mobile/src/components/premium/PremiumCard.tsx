import { View } from 'react-native';

import { useCancelPremium, usePremium, usePurchasePremium } from '@/api/hooks';
import { Button, Card, Icon, InlineError, Row, T, useToast, type IconName } from '@/components/ui';
import { formatDay, istanbulDay } from '@/lib/format';
import { PREMIUM } from '@/lib/premium';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Premium'un içeriği; plan ekranında ve tekliflerde aynı satırlar. */
export function PremiumPerks({ muted = false }: { muted?: boolean }) {
  const c = useColors();
  const icons: IconName[] = ['scale', 'sparkles'];
  return (
    <View style={{ gap: space.sm }}>
      {PREMIUM.perks.map((perk, i) => (
        <Row key={perk} style={{ gap: space.sm, alignItems: 'flex-start' }}>
          <Icon name={icons[i] ?? 'checkmark-circle'} size={18} color={muted ? c.textMuted : c.text} />
          <T style={{ flex: 1 }} color={muted ? 'textMuted' : 'text'}>
            {perk}
          </T>
        </Row>
      ))}
    </View>
  );
}

/** Mağaza kuralları gereği satın alma düğmesinin altında yenileme ve iptal bilgisi. */
export function PremiumFinePrint() {
  return (
    <T variant="caption" color="textSubtle" center>
      Abonelik her ay {PREMIUM.price} ile yenilenir; Profil’den istediğin zaman iptal edebilirsin. Test sürümü: ödeme alınmaz.
    </T>
  );
}

/**
 * Premium teklifi ya da durumu. Abone değilse içerik + satın alma; aboneyse yenilenme tarihi ve iptal.
 * `reason`: teklifin neden gösterildiği (ör. sınırsız modun kilidi).
 */
export function PremiumCard({ reason }: { reason?: string }) {
  const c = useColors();
  const toast = useToast();
  const premium = usePremium();
  const purchase = usePurchasePremium();
  const cancel = useCancelPremium();
  const p = premium.data;
  if (!p) return null;

  if (p.active) {
    const until = p.renewsAt ? formatDay(istanbulDay(Date.parse(p.renewsAt))) : '';
    return (
      <Card style={{ gap: space.md }}>
        <Row style={{ gap: space.sm }}>
          <Icon name="sparkles" size={20} color={c.accent} />
          <T variant="bodyStrong" style={{ flex: 1 }}>
            Premium aktif
          </T>
        </Row>
        <PremiumPerks muted />
        <T variant="caption" color="textMuted">
          {p.autoRenew ? `${until} tarihinde ${p.price} ile yenilenir.` : `İptal edildi; ${until} tarihine kadar sürer.`}
        </T>
        {p.autoRenew && (
          <Button
            title="Aboneliği iptal et"
            kind="ghost"
            loading={cancel.isPending}
            onPress={() => cancel.mutate(undefined, { onSuccess: () => toast('Abonelik iptal edildi; dönem sonuna kadar sürer') })}
          />
        )}
        <InlineError error={cancel.error} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Row style={{ gap: space.sm }}>
          <Icon name="sparkles" size={20} color={c.accent} />
          <T variant="title">Premium</T>
        </Row>
        <T color="textMuted">{reason ?? `Aylık ${PREMIUM.price}`}</T>
      </View>
      <PremiumPerks />
      <Button
        title={`Premium’u başlat · ${PREMIUM.price}/${PREMIUM.periodLabel}`}
        icon="sparkles"
        size="lg"
        loading={purchase.isPending}
        onPress={() => purchase.mutate(undefined, { onSuccess: () => toast('Premium açıldı!') })}
      />
      <PremiumFinePrint />
      <InlineError error={purchase.error} />
    </Card>
  );
}
