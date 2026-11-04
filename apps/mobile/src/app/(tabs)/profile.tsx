import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { API_URL, IS_MOCK } from '@/api/client';
import { useMe, useStats, useUpdateMe } from '@/api/hooks';
import {
  Button,
  Card,
  Icon,
  ErrorView,
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
import { trUpper } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { ensureNotificationPermission } from '@/lib/reminders';
import { mockAddLeagueBots, mockReset, mockShiftDays } from '@/mock/server';
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
  const initials = trUpper((me.data.displayName ?? '?').trim().slice(0, 1) || '?');

  return (
    <Screen>
      <Row style={{ gap: space.lg }}>
        <View style={[styles.avatar, { backgroundColor: c.accent }]}>
          {me.data.displayName ? (
            <Text style={[font.headline, { color: '#FFFFFF' }]}>{initials}</Text>
          ) : (
            <Icon name="person" size={30} color="#FFFFFF" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <T variant="headline">{me.data.displayName ?? 'Oyuncu'}</T>
          <T color="textMuted">
            🔥 {stats.data?.currentStreak ?? 0} gün seri · {stats.data?.played ?? 0} oyun
          </T>
        </View>
      </Row>

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
                  style={[styles.hour, { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accentSoft : c.surface }]}>
                  <Text style={[font.bodyStrong, { color: selected ? c.accent : c.text }]}>{String(h).padStart(2, '0')}:00</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

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
        <ToggleRow icon="phone-portrait-outline" title="Titreşim" subtitle="Dokunuşlarda hafif geri bildirim" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
      </Card>

      <SectionTitle>Yardım</SectionTitle>
      <Card>
        <LinkRow icon="help-circle-outline" title="Nasıl oynanır?" onPress={() => router.push('/how-to-play')} />
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <Row style={{ alignItems: 'flex-start', gap: space.md }}>
          <View style={[styles.rowIcon, { backgroundColor: c.surfaceMuted }]}>
            <Text style={{ fontSize: 16 }}>🔒</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="bodyStrong">Gizlilik</T>
            <T variant="caption" color="textMuted">
              Üyelik yok, e-posta toplamıyoruz. Seni yalnızca bu cihaza özel rastgele bir kimlikle tanıyoruz.
            </T>
          </View>
        </Row>
      </Card>

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
  const toast = useToast();
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
                await refresh();
                toast('Test verileri sıfırlandı');
              }}
            />
          </View>
        </Row>
        <Button
          title="Liglerime test oyuncusu ekle"
          icon="people-outline"
          kind="secondary"
          onPress={async () => {
            const added = await mockAddLeagueBots();
            await refresh();
            toast(added > 0 ? `${added} test oyuncusu eklendi` : 'Önce Lig sekmesinden bir lig kur');
          }}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: minTouch, fontFamily: fonts.semibold },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hour: { borderWidth: 1.5, borderRadius: radius.pill, minHeight: 44, minWidth: 76, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
