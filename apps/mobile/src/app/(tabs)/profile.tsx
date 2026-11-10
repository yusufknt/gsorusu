import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAds } from '@/ads/AdsProvider';
import { AD_RULES } from '@/ads/config';
import { recentAdEvents, subscribeAdEvents } from '@/ads/events';
import { installDayNo, rollover } from '@/ads/policy';
import { API_URL, IS_MOCK, serverNow } from '@/api/client';
import { useMe, useStats, useUpdateMe } from '@/api/hooks';
import { AccountCard } from '@/components/account/AccountCard';
import { Columns } from '@/components/layout/Columns';
import { PageHero } from '@/components/layout/PageHero';
import { PremiumCard } from '@/components/premium/PremiumCard';
import {
  Button,
  Card,
  ErrorView,
  Icon,
  InlineError,
  LinkRow,
  LoadingScreen,
  Row,
  Screen,
  SectionTitle,
  Segmented,
  T,
  ToggleRow,
  useToast,
} from '@/components/ui';
import { istanbulDay } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { ensureNotificationPermission } from '@/lib/reminders';
import { mockCompletePuzzle, mockReset, mockShiftDays } from '@/mock/server';
import { useSettings, type ThemePref } from '@/settings/settings';
import { font, fonts, minTouch, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const HOURS = [7, 8, 9, 10, 12, 18, 20, 21];

export default function ProfileScreen() {
  const c = useColors();
  const me = useMe();
  const stats = useStats();
  const update = useUpdateMe();
  const toast = useToast();
  const buzz = useHaptics();
  const { settings, update: updateSettings } = useSettings();
  // Düzenlenmemişse sunucudaki ad gösterilir; kaydedince taslak temizlenir.
  const [draft, setDraft] = useState<string | null>(null);

  if (me.isError) return <ErrorView error={me.error} onRetry={() => void me.refetch()} />;
  if (me.isPending) return <LoadingScreen />;

  const name = draft ?? me.data.displayName ?? '';
  const nameChanged = name.trim() !== (me.data.displayName ?? '');
  const displayName = me.data.displayName;

  return (
    <Screen width="wide">
      <PageHero
        eyebrow="Profil"
        title={displayName ?? 'Oyuncu'}
        subtitle={`${stats.data?.currentStreak ?? 0} gün seri · ${stats.data?.played ?? 0} oyun`}
        mood="wave"
        say={displayName ? `Selam ${displayName}!` : 'Adını yaz, sana öyle seslenelim.'}
      />

      <Columns
        main={
          <>
            <SectionTitle>Hesap</SectionTitle>
            <AccountCard me={me.data} />

            <SectionTitle>Profil</SectionTitle>
            <Card>
              <T variant="bodyStrong">Görünen ad</T>
              <TextInput
                value={name}
                onChangeText={setDraft}
                maxLength={24}
                placeholder="Adın (isteğe bağlı)"
                placeholderTextColor={c.textSubtle}
                accessibilityLabel="Görünen ad"
                style={[styles.input, font.body, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
              />
              {nameChanged && (
                <Button
                  title="Kaydet"
                  icon="checkmark"
                  loading={update.isPending}
                  onPress={() =>
                    update.mutate(
                      { displayName: name.trim() },
                      {
                        onSuccess: () => {
                          setDraft(null);
                          toast('Kaydedildi');
                        },
                      },
                    )
                  }
                />
              )}
              <InlineError error={update.error} />
            </Card>

            <SectionTitle>Hatırlatma</SectionTitle>
            <Card>
              <ToggleRow
                icon="notifications-outline"
                title="Günlük hatırlatma"
                subtitle="Seri tehlikedeyse 21:00’de bir kez daha"
                value={settings.reminders}
                onChange={async (v) => {
                  if (v && !(await ensureNotificationPermission())) {
                    toast('Bildirim izni verilmedi');
                    return;
                  }
                  updateSettings({ reminders: v });
                }}
              />
              {settings.reminders && (
                <View style={styles.hours}>
                  {HOURS.map((h) => {
                    const selected = me.data.notifyHour === h;
                    return (
                      <Pressable
                        key={h}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          buzz('select');
                          update.mutate({ notifyHour: h });
                        }}
                        style={[styles.hour, { borderColor: selected ? c.text : c.border, backgroundColor: selected ? c.text : c.surface }]}>
                        <Text style={[font.bodyStrong, { color: selected ? c.background : c.text }]}>{String(h).padStart(2, '0')}:00</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Card>
          </>
        }
        side={
          <>
            <SectionTitle>Görünüm</SectionTitle>
            <Card>
              <Segmented<ThemePref>
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
                options={[
                  { value: 'system', label: 'Sistem' },
                  { value: 'light', label: 'Açık' },
                  { value: 'dark', label: 'Koyu' },
                ]}
              />
              <ToggleRow
                icon="phone-portrait-outline"
                title="Titreşim"
                subtitle="Dokunuşlarda hafif geri bildirim"
                value={settings.haptics}
                onChange={(haptics) => updateSettings({ haptics })}
              />
            </Card>

            <SectionTitle>Premium</SectionTitle>
            <PremiumCard />

            <SectionTitle>Yardım</SectionTitle>
            <Card>
              <LinkRow icon="help-circle-outline" title="Nasıl oynanır?" onPress={() => router.push('/how-to-play')} />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Row style={{ alignItems: 'flex-start', gap: space.md }}>
                <View style={[styles.rowIcon, { backgroundColor: c.surfaceMuted }]}>
                  <Icon name="lock-closed" size={16} color={c.textMuted} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="bodyStrong">Gizlilik</T>
                  <T variant="caption" color="textMuted">
                    Misafir oynarsan seni yalnızca bu cihaza özel rastgele bir kimlikle tanırız. Google ile giriş yaparsan
                    yalnızca adını ve e-postanı, hesabını tanımak için saklarız.
                  </T>
                </View>
              </Row>
            </Card>
          </>
        }
      />

      {IS_MOCK && <DevTools />}

      <T variant="caption" color="textSubtle" center>
        Günün Sorusu ? · sürüm {Constants.expoConfig?.version ?? '—'}
        {IS_MOCK ? ' · test verisi' : __DEV__ ? ` · ${API_URL}` : ''}
      </T>
    </Screen>
  );
}

/** Yalnızca test modunda: günü ileri al (seri ve arşivi denemek için) ve verileri sıfırla. */
function DevTools() {
  const qc = useQueryClient();
  const { update } = useSettings();
  const toast = useToast();
  const ads = useAds();
  const refresh = () => qc.invalidateQueries();
  return (
    <>
      <SectionTitle>Test araçları</SectionTitle>
      <Card tone="muted">
        <T variant="caption" color="textMuted">
          Uygulama şu an kendi içindeki test verisiyle çalışıyor. Bu araçlar yalnızca bu modda görünür.
        </T>
        <Row>
          <View style={{ flex: 1 }}>
            <Button
              title="Bir gün ileri"
              icon="play-forward"
              kind="secondary"
              onPress={async () => {
                await mockShiftDays(1);
                await refresh();
                toast('Saat 1 gün ileri alındı');
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Sıfırla"
              icon="trash-outline"
              kind="secondary"
              onPress={async () => {
                await mockReset();
                ads.dev.reset();
                await refresh();
                toast('Test verileri sıfırlandı');
              }}
            />
          </View>
        </Row>
        <Button title="Tanıtımı yeniden göster" icon="sparkles-outline" kind="secondary" onPress={() => update({ onboarded: false })} />
        <Button
          title="Koleksiyona yapboz ekle"
          icon="extension-puzzle"
          kind="secondary"
          onPress={async () => {
            await mockCompletePuzzle();
            await refresh();
            toast('Sıradaki resim koleksiyona eklendi');
          }}
        />
      </Card>
      <AdDevTools />
    </>
  );
}

const EVENT_LABEL = { ad_shown: 'gösterildi', ad_rewarded: 'ödül verildi', ad_skipped: 'yarıda kapatıldı', ad_failed: 'yüklenemedi', ad_blocked: 'engellendi' } as const;

/** Reklam sayaçları ve son olaylar; geçiş reklamlarını denemek için reklamsız dönemi atlama. */
function AdDevTools() {
  const c = useColors();
  const ads = useAds();
  const toast = useToast();
  const events = useSyncExternalStore(subscribeAdEvents, recentAdEvents).slice(0, 6);
  const today = istanbulDay(serverNow());
  const l = ads.ledger ? rollover(ads.ledger, today) : null;

  return (
    <>
      <SectionTitle>Reklam testi</SectionTitle>
      <Card tone="muted">
        <T variant="caption" color="textMuted">
          Expo Go’da AdMob çalışmadığı için reklamlar “test reklamı” ekranıyla gösterilir. İlk {AD_RULES.graceDays} gün geçiş reklamı çıkmaz.
        </T>
        {l && (
          <T variant="bodyStrong">
            Kurulumun {installDayNo(l, today)}. günü · bugün {l.shown.length}/{AD_RULES.interstitialDailyCap} geçiş reklamı · {l.tabSwitches} sekme geçişi
          </T>
        )}
        <Row>
          <View style={{ flex: 1 }}>
            <Button
              title="İlk 2 günü atla"
              icon="flash-outline"
              kind="secondary"
              onPress={() => {
                ads.dev.skipGracePeriod();
                toast('Kurulum 3. güne alındı');
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Sayaçları sıfırla"
              icon="refresh"
              kind="secondary"
              onPress={() => {
                ads.dev.reset();
                toast('Reklam sayaçları sıfırlandı');
              }}
            />
          </View>
        </Row>
        {events.length > 0 && (
          <View style={{ gap: 2 }}>
            {events.map((e, i) => (
              <Text key={`${e.at}-${i}`} style={[font.caption, { color: e.type === 'ad_blocked' ? c.textSubtle : c.textMuted }]}>
                {new Date(e.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {e.placement} {EVENT_LABEL[e.type]}
                {e.reason ? ` (${e.reason})` : ''}
              </Text>
            ))}
          </View>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: minTouch, fontFamily: fonts.semibold },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hour: { borderWidth: 1.5, borderRadius: radius.pill, minHeight: 44, minWidth: 76, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
