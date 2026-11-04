import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IS_MOCK } from '@/api/client';
import { useCreateLeague, useJoinLeague, useMe, useUpdateMe } from '@/api/hooks';
import type { League } from '@/api/types';
import { Button, Card, ErrorView, Icon, InlineError, LoadingScreen, Row, Screen, T, useToast } from '@/components/ui';
import { useHaptics } from '@/lib/haptics';
import { LEAGUE, normalizeLeagueCode } from '@/lib/league';
import { font, fonts, minTouch, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const SUGGESTIONS = ['Aile', 'Ofis', 'Okul', 'Arkadaşlar', 'Komşular'];

/**
 * Lig kurma ve koda katılma. Sıralamada ad görüneceği için görünen adı olmayan oyuncudan önce ad
 * istenir (sunucu da `display_name_required` ile zorlar).
 */
export function LeagueForm({ mode, initialCode }: { mode: 'create' | 'join'; initialCode?: string }) {
  const c = useColors();
  const toast = useToast();
  const buzz = useHaptics();
  const me = useMe();
  const updateMe = useUpdateMe();
  const create = useCreateLeague();
  const join = useJoinLeague();
  const [displayName, setDisplayName] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [code, setCode] = useState(initialCode ?? '');
  // Ad kartı, ad kaydedildikten sonra da (lige katılırken) yerinde kalsın; form zıplamasın.
  const [askName, setAskName] = useState<boolean | null>(null);

  if (me.isError) return <ErrorView error={me.error} onRetry={() => void me.refetch()} />;
  if (me.isPending) return <LoadingScreen />;

  const needsName = askName ?? !me.data.displayName;
  const nameOk = !needsName || displayName.trim().length > 0;
  const normalized = normalizeLeagueCode(code);
  const leagueNameOk = leagueName.trim().length >= LEAGUE.nameMin;
  const ready = nameOk && (mode === 'create' ? leagueNameOk : !!normalized);
  const action = mode === 'create' ? create : join;
  const busy = updateMe.isPending || action.isPending;

  const submit = async () => {
    try {
      if (needsName) {
        setAskName(true);
        await updateMe.mutateAsync({ displayName: displayName.trim() });
      }
      const league: League = mode === 'create' ? await create.mutateAsync(leagueName.trim()) : await join.mutateAsync(normalized!);
      buzz('success');
      toast(mode === 'create' ? 'Lig kuruldu 🎉' : `${league.name} ligine katıldın`);
      router.replace(`/leagues/${league.id}`);
    } catch {
      buzz('error');
      // Hata InlineError ile gösterilir.
    }
  };

  const inputStyle = [styles.input, font.body, { color: c.text, borderColor: c.border, backgroundColor: c.surface }];

  return (
    <Screen topInset={false}>
      <T color="textMuted">
        {mode === 'create'
          ? 'Ligi kur, sana verilen kodu arkadaşlarınla paylaş. Kodu bilen herkes katılabilir.'
          : 'Arkadaşının paylaştığı 6 karakterlik kodu yaz.'}
      </T>

      {needsName && (
        <Card style={{ gap: space.sm }}>
          <T variant="bodyStrong">Adın</T>
          <T variant="caption" color="textMuted">
            Ligdeki sıralamada bu ad görünür. Sonra Profil’den değiştirebilirsin.
          </T>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={24}
            placeholder="Ör. Ayşe"
            placeholderTextColor={c.textSubtle}
            accessibilityLabel="Görünen ad"
            autoFocus={mode === 'create' || !!initialCode}
            style={inputStyle}
          />
        </Card>
      )}

      {mode === 'create' ? (
        <Card style={{ gap: space.sm }}>
          <T variant="bodyStrong">Lig adı</T>
          <TextInput
            value={leagueName}
            onChangeText={setLeagueName}
            maxLength={LEAGUE.nameMax}
            placeholder="Ör. Aile"
            placeholderTextColor={c.textSubtle}
            accessibilityLabel="Lig adı"
            autoFocus={!needsName}
            returnKeyType="done"
            onSubmitEditing={() => ready && void submit()}
            style={inputStyle}
          />
          <View style={styles.chips}>
            {SUGGESTIONS.map((s) => {
              const selected = leagueName.trim() === s;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    buzz('select');
                    setLeagueName(s);
                  }}
                  style={[styles.chip, { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accentSoft : c.surface }]}>
                  <Text style={[font.caption, { fontFamily: fonts.extrabold, color: selected ? c.accent : c.text }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : (
        <Card style={{ gap: space.sm }}>
          <T variant="bodyStrong">Lig kodu</T>
          <TextInput
            value={code}
            // Kod alfabesinde Türkçe harf yok; düz büyük harf yeterli ("i" → "I", geçersiz sayılır).
            onChangeText={(t) => setCode(t.toUpperCase())}
            maxLength={9}
            placeholder="K7P 2QX"
            placeholderTextColor={c.textSubtle}
            accessibilityLabel="Lig kodu"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            autoFocus={!needsName && !initialCode}
            returnKeyType="go"
            onSubmitEditing={() => ready && void submit()}
            style={[inputStyle, styles.code, { borderColor: normalized ? c.correct : c.border }]}
          />
          {code.length > 0 && !normalized && (
            <T variant="caption" color="textMuted">
              Kod {LEAGUE.codeLength} karakterden oluşur: harfler ve 2–9 arası rakamlar.
            </T>
          )}
          {IS_MOCK && (
            <Row style={{ gap: space.xs, alignItems: 'flex-start' }}>
              <Icon name="flask-outline" size={14} color={c.textMuted} />
              <T variant="caption" color="textMuted" style={{ flex: 1 }}>
                Test modu: geçerli herhangi bir kod (ör. ABC234) test oyuncularından oluşan bir lig açar.
              </T>
            </Row>
          )}
        </Card>
      )}

      <InlineError error={updateMe.error ?? action.error} />
      <Button
        title={mode === 'create' ? 'Ligi kur' : 'Lige katıl'}
        icon={mode === 'create' ? 'trophy' : 'enter'}
        size="lg"
        disabled={!ready}
        loading={busy}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: minTouch, fontFamily: fonts.semibold },
  code: { fontFamily: fonts.black, fontSize: 26, letterSpacing: 4, textAlign: 'center', minHeight: 60 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1.5, borderRadius: radius.pill, minHeight: 40, paddingHorizontal: space.md, alignItems: 'center', justifyContent: 'center' },
});
