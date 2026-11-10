import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FlipInEasyX } from 'react-native-reanimated';

import type { PlayAction } from '@/api/hooks';
import type { CelebAttr, CelebCell, CelebField, CelebGuess, CelebProfile, CelebStatus, PlayState, PublicQuestion } from '@/api/types';
import { Icon, InlineError, Row, T, useWide, type IconName } from '@/components/ui';
import { CELEB_ATTRS, FIELD_LABEL, fieldsLabel } from '@/lib/celeb';
import { useHaptics } from '@/lib/haptics';
import { searchNames } from '@/lib/search';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export const CELEB_LABEL: Record<CelebAttr, string> = {
  alan: 'Alan',
  tur: 'Tür',
  cinsiyet: 'Cinsiyet',
  dogumYili: 'Doğum yılı',
  dogumYeri: 'Doğum yeri',
  donem: 'Ünlendiği',
  hayatta: 'Hayatta mı',
  basHarf: 'Baş harf',
};

const FIELD_ICON: Record<CelebField, IconName> = {
  muzik: 'music',
  oyunculuk: 'drama',
  spor: 'medal',
  edebiyat: 'book-open',
  televizyon: 'tv',
  internet: 'globe',
};

const FLIP_STAGGER_MS = 80;
/** Öneri listesindeki fotoğraf kutusu (Loldle'daki karakter resmi gibi). */
const SUGGESTION_PHOTO = 56;
/** Yüze yakınlaştırma: bu boydan küçük kutularda daha çok (yüz seçilsin). */
const SMALL_PHOTO_MAX = 72;
const FACE_ZOOM_SMALL = 1.45;
const FACE_ZOOM_LARGE = 1.2;
/** Resmin üstten ne kadar kırpılacağı (kutu boyunun oranı): saç üstündeki boşluk gitsin. */
const FACE_TOP_SHIFT = 0;

/**
 * Hangi ünlü? (Loldle mantığı): ad yaz, listeden seç; her tahminde 8 kutu sırayla döner.
 * Ad yazarken her önerinin fotoğrafı ve tipi (alan, tür) görünür. Gizli ünlü kartı, ipuçları ve "Bildiklerin"
 * satırı yok: kutulardan çıkarılan bilgiler oyuncuya hazır verilmez (oyunu fazla kolaylaştırıyordu).
 */
export function CelebPlay({
  question,
  play,
  act,
  busy,
  error,
}: {
  question: PublicQuestion;
  play: PlayState | undefined;
  act: (a: PlayAction) => void;
  busy: boolean;
  error: unknown;
}) {
  const wide = useWide();
  const state = play?.celeb;
  const guesses = useMemo(() => state?.guesses ?? [], [state?.guesses]);
  const people = question.celeb?.people;
  const max = question.celeb?.maxGuesses ?? state?.maxGuesses ?? 10;
  const finished = !!play?.finished;
  // Ekran açıldığında zaten olan satırlar dönmez; yalnızca bu ziyarette eklenen tahmin döner
  // (oyun durumu ModeGame'de yüklenmeden bu bileşen çizilmez).
  const [initialNames] = useState(() => new Set(guesses.map((g) => g.name)));
  const pick = (name: string) => act({ kind: 'celeb', name });

  const rows = [...guesses].reverse();
  const missed = finished && !play?.solved && state?.answer;
  const byName = useMemo(() => new Map(people?.map((p) => [p.name, p])), [people]);
  const answer = state?.answer ? (byName.get(state.answer.name) ?? null) : null;
  const shownPhotos = [...(answer ? [answer] : []), ...guesses.map((g) => byName.get(g.name))].filter(
    (p, i, all): p is CelebProfile => !!p?.photo && all.findIndex((x) => x?.name === p.name) === i,
  );

  return (
    <View style={{ gap: space.md }}>
      {!finished && (
        <SearchBox
          names={question.celeb?.names ?? []}
          people={people ?? null}
          exclude={guesses.map((g) => g.name)}
          busy={busy}
          left={max - guesses.length}
          onPick={pick}
        />
      )}
      <InlineError error={error} />


      {(guesses.length > 0 || missed) && <Legend />}
      {wide && (guesses.length > 0 || missed) && <HeaderRow />}

      {missed && <GuessRow guess={state.answer!} profile={answer} wide={wide} animate={false} title="Günün ünlüsü" />}
      {rows.map((g) => (
        <GuessRow key={g.name} guess={g} profile={byName.get(g.name) ?? null} wide={wide} animate={!initialNames.has(g.name)} />
      ))}
      {shownPhotos.length > 0 && <PhotoCredits people={shownPhotos} />}
    </View>
  );
}

/**
 * Ünlünün fotoğrafı; fotoğraf yoksa baş harfleri. Commons fotoğrafları çoğunlukla belden yukarı çekildiği için
 * resim kutudan büyük çizilip üst ortaya hizalanır: kutuyu yüz doldurur (küçük kutuda daha çok yakınlaşır).
 * `square`: Loldle'daki karakter kutusu gibi köşeleri yuvarlatılmış kare (öneri listesi ve tahmin satırları).
 */
function Avatar({ profile, name, size, square = false }: { profile: CelebProfile | null; name: string; size: number; square?: boolean }) {
  const c = useColors();
  const photo = profile?.photo;
  const zoom = size <= SMALL_PHOTO_MAX ? FACE_ZOOM_SMALL : FACE_ZOOM_LARGE;
  const drawn = size * zoom;
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('');
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: square ? radius.md : size / 2, borderColor: square ? c.border : c.text, backgroundColor: c.surfaceMuted },
        square && styles.avatarSquare,
      ]}>
      {photo ? (
        <Image
          source={{ uri: photo.url }}
          style={{ position: 'absolute', width: drawn, height: drawn, left: (size - drawn) / 2, top: -size * FACE_TOP_SHIFT }}
          contentFit="cover"
          contentPosition="top"
          transition={200}
          accessibilityLabel={`${name} fotoğrafı`}
        />
      ) : (
        <Text style={[font.title, { color: c.textMuted, fontSize: size * 0.36, lineHeight: size * 0.44 }]}>{initials}</Text>
      )}
    </View>
  );
}

/** Görünen fotoğrafların kaynakları (CC BY/BY-SA lisansları fotoğrafçı ve lisansın yazılmasını ister). */
function PhotoCredits({ people }: { people: CelebProfile[] }) {
  return (
    <T variant="caption" color="textSubtle" style={{ fontSize: 11, lineHeight: 15 }}>
      Fotoğraflar (Wikimedia Commons): {people.map((p) => `${p.name}: ${p.photo!.credit.replace(' · Wikimedia Commons', '')}`).join(' — ')}
    </T>
  );
}

function SearchBox({
  names,
  people,
  exclude,
  busy,
  left,
  onPick,
}: {
  names: string[];
  people: CelebProfile[] | null;
  exclude: string[];
  busy: boolean;
  left: number;
  onPick: (name: string) => void;
}) {
  const c = useColors();
  const buzz = useHaptics();
  const [query, setQuery] = useState('');
  const matches = searchNames(names, query, exclude, 8);
  const profiles = useMemo(() => new Map(people?.map((p) => [p.name, p])), [people]);
  // Önerilerde görünen fotoğrafların kaynağı listenin altında yazılır (CC BY/BY-SA şartı).
  const matchPhotos = matches.map((n) => profiles.get(n)).filter((p): p is CelebProfile => !!p?.photo);
  const pick = (name: string) => {
    if (busy) return;
    buzz('tap');
    setQuery('');
    onPick(name);
  };

  return (
    <View style={{ gap: space.xs }}>
      <View style={[styles.search, { borderColor: c.text, backgroundColor: c.surface }]}>
        <Icon name="search" size={20} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Bir ünlü yaz… (ör. Tarkan)"
          placeholderTextColor={c.textSubtle}
          accessibilityLabel="Ünlü ara"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="go"
          onSubmitEditing={() => matches[0] && pick(matches[0])}
          // RN Web submitBehavior'ı tanımaz; blurOnSubmit olmadan Enter'dan sonra odak kaybolur.
          submitBehavior="submit"
          blurOnSubmit={false}
          style={[styles.input, { color: c.text }]}
        />
        <Text style={[font.caption, { fontFamily: fonts.bold, color: c.textMuted }]} accessibilityLabel={`${left} hak kaldı`}>
          {left} hak
        </Text>
      </View>

      {matches.length > 0 && (
        <Animated.View entering={FadeIn.duration(120)} style={[styles.suggestions, { borderColor: c.border, backgroundColor: c.surface }]}>
          {matches.map((name, i) => {
            const p = profiles.get(name);
            const type = p ? `${p.genre} · ${fieldsLabel(p)}` : null;
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`${name}${type ? `, ${type}` : ''}. Tahmin et`}
                onPress={() => pick(name)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.suggestion,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  (pressed || hovered) && { backgroundColor: c.surfaceMuted },
                ]}>
                <Avatar profile={p ?? null} name={name} size={SUGGESTION_PHOTO} square />
                <Text style={[font.bodyStrong, { color: c.text, flex: 1 }]} numberOfLines={1}>
                  {name}
                </Text>
                {/* Tipi: alanın simgesi, tür ve alan (ör. Pop · Müzik). */}
                {p && (
                  <View style={[styles.type, { backgroundColor: c.surfaceMuted }]}>
                    <Icon name={FIELD_ICON[p.fields[0]]} size={16} />
                    <Text style={[font.caption, { fontFamily: fonts.bold, color: c.text }]} numberOfLines={1}>
                      {type}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </Animated.View>
      )}
      {matchPhotos.length > 0 && <PhotoCredits people={matchPhotos} />}
      {query.trim().length > 1 && matches.length === 0 && (
        <T variant="caption" color="textMuted">
          Listede yok ya da zaten denedin.
        </T>
      )}
    </View>
  );
}

function Legend() {
  const c = useColors();
  const items: [string, string][] = [
    [c.correct, 'Aynı'],
    [c.partial, 'Yakın'],
    [c.close, 'Farklı'],
  ];
  return (
    <Row style={{ gap: space.md, flexWrap: 'wrap' }}>
      {items.map(([color, label]) => (
        <Row key={label} style={{ gap: 6 }}>
          <View style={[styles.legendDot, { backgroundColor: color }]} />
          <T variant="caption" color="textMuted">
            {label}
          </T>
        </Row>
      ))}
      <Row style={{ gap: 4 }}>
        <Icon name="arrow-up" size={14} color={c.textMuted} />
        <T variant="caption" color="textMuted">
          Doğrusu daha büyük / sonra
        </T>
      </Row>
    </Row>
  );
}

/** Geniş ekran: kutuların üstünde sütun başlıkları (gazete tablosu gibi kalın alt çizgi). */
function HeaderRow() {
  const c = useColors();
  return (
    <View style={[styles.wideRow, styles.header, { borderBottomColor: c.text }]}>
      <View style={styles.nameCol}>
        <T variant="label" color="textMuted">
          Ünlü
        </T>
      </View>
      {CELEB_ATTRS.map((a) => (
        <View key={a} style={styles.headerCell}>
          <T variant="label" color="textMuted" center numberOfLines={1}>
            {CELEB_LABEL[a]}
          </T>
        </View>
      ))}
    </View>
  );
}

function GuessRow({
  guess,
  profile,
  wide,
  animate,
  title,
}: {
  guess: CelebGuess;
  profile: CelebProfile | null;
  wide: boolean;
  animate: boolean;
  title?: string;
}) {
  const c = useColors();
  const name = (
    <Row style={[{ gap: space.sm }, wide && styles.nameCol]}>
      <Avatar profile={profile} name={guess.name} size={wide ? 60 : 52} square />
      <View style={{ flex: 1 }}>
        {title && (
          <T variant="label" color="textMuted">
            {title}
          </T>
        )}
        <Text style={[font.title, { fontSize: wide ? 17 : 19, lineHeight: wide ? 21 : 23, color: c.text }]} numberOfLines={2}>
          {guess.name}
        </Text>
        {profile && (
          <T variant="caption" color="textMuted" numberOfLines={1}>
            {profile.genre}
          </T>
        )}
      </View>
    </Row>
  );
  const boxes = guess.cells.map((cell, i) => (
    <Box key={cell.attr} cell={cell} index={i} animate={animate} showLabel={!wide} style={wide ? styles.wideCell : styles.gridCell} />
  ));

  return wide ? (
    <View style={styles.wideRow} accessibilityLabel={rowLabel(guess)}>
      {name}
      {boxes}
    </View>
  ) : (
    <View style={{ gap: space.sm }} accessibilityLabel={rowLabel(guess)}>
      {name}
      <View style={styles.grid}>{boxes}</View>
    </View>
  );
}

const STATUS_WORD: Record<CelebStatus, string> = { correct: 'aynı', partial: 'yakın', wrong: 'farklı' };

function rowLabel(g: CelebGuess): string {
  return `${g.name}: ${g.cells.map((x) => `${CELEB_LABEL[x.attr]} ${x.value}, ${STATUS_WORD[x.status]}`).join('; ')}`;
}

/** Kutunun köşesindeki küçük ikon: alanın simgesi, cinsiyet işareti, konum iğnesi… */
function cellIcon(cell: CelebCell): IconName {
  switch (cell.attr) {
    case 'alan': {
      const first = (Object.keys(FIELD_LABEL) as CelebField[]).find((f) => cell.value.startsWith(FIELD_LABEL[f]));
      return first ? FIELD_ICON[first] : 'star';
    }
    case 'tur':
      return 'pricetag';
    case 'cinsiyet':
      return cell.value === 'Kadın' ? 'venus' : 'mars';
    case 'dogumYili':
      return 'calendar-outline';
    case 'dogumYeri':
      return 'map-pin';
    case 'donem':
      return 'star';
    case 'hayatta':
      return cell.value === 'Hayatta' ? 'heart' : 'heart-off';
    case 'basHarf':
      return 'type';
  }
}

/** Bir kutu: renkli zemin, köşede ikon, değer; yönlü kutularda arkada büyük ok. */
function Box({ cell, index, animate, showLabel, style }: { cell: CelebCell; index: number; animate: boolean; showLabel: boolean; style: object }) {
  const c = useColors();
  const bg = cell.status === 'correct' ? c.correct : cell.status === 'partial' ? c.partial : c.close;
  const [main, ...rest] = cell.value.split(' · ');
  const arrow: IconName | null = cell.arrow ? (cell.attr === 'basHarf' ? (cell.arrow === 'up' ? 'arrow-forward' : 'arrow-back') : `arrow-${cell.arrow}`) : null;

  return (
    <Animated.View
      entering={animate ? FlipInEasyX.delay(index * FLIP_STAGGER_MS).duration(360) : undefined}
      style={[styles.box, { backgroundColor: bg }, style]}>
      {arrow && (
        <View style={styles.arrow} pointerEvents="none">
          <Icon name={arrow} size={46} color={ARROW_ON_BOX} />
        </View>
      )}
      <View style={styles.cornerIcon} pointerEvents="none">
        <Icon name={cellIcon(cell)} size={13} color={LABEL_ON_BOX} />
      </View>
      {showLabel && (
        <Text style={styles.boxLabel} numberOfLines={1}>
          {CELEB_LABEL[cell.attr].toLocaleUpperCase('tr')}
        </Text>
      )}
      <Text style={styles.boxValue} numberOfLines={2} adjustsFontSizeToFit>
        {main}
      </Text>
      {rest.length > 0 && (
        <Text style={styles.boxSub} numberOfLines={1}>
          {rest.join(' · ')}
        </Text>
      )}
    </Animated.View>
  );
}

/** Renkli kutuların üstündeki yazı ve işaretler (yeşil, turuncu, kırmızı zeminde okunur). */
const ON_BOX = '#FFFFFF';
const LABEL_ON_BOX = 'rgba(255,255,255,0.85)';
const ARROW_ON_BOX = 'rgba(255,255,255,0.35)';

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 52 },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, paddingVertical: space.sm, outlineStyle: 'none' } as object,
  suggestions: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: 6, minHeight: 54 },
  type: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 4, maxWidth: '55%' },
  avatar: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarSquare: { borderWidth: 1 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: { flexBasis: '23%', flexGrow: 1, minHeight: 76 },
  wideRow: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  header: { borderBottomWidth: 1.5, paddingBottom: space.xs, alignItems: 'flex-end', marginBottom: -space.xs },
  nameCol: { width: 210, alignItems: 'center' },
  wideCell: { flex: 1, minWidth: 0, minHeight: 76 },
  headerCell: { flex: 1, minWidth: 0 },
  box: { borderRadius: radius.sm, paddingHorizontal: 6, paddingTop: space.md, paddingBottom: space.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  arrow: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  cornerIcon: { position: 'absolute', left: 5, top: 5 },
  boxLabel: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, letterSpacing: 0.6, color: LABEL_ON_BOX, marginBottom: 2 },
  boxValue: { fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 17, color: ON_BOX, textAlign: 'center' },
  boxSub: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: LABEL_ON_BOX, textAlign: 'center' },
});
