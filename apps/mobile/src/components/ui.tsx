import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { pct, trUpper } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { font, fonts, minTouch, radius, shadow, space, type ThemeColors } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
type Variant = keyof typeof font;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}

export function T({
  variant = 'body',
  color,
  center,
  style,
  children,
  ...rest
}: TextProps & { variant?: Variant; color?: keyof ThemeColors; center?: boolean }) {
  const c = useColors();
  // Etiketler Türkçe büyük harfe çevrilir: "senin" → "SENİN" (textTransform "SENIN" yapardı).
  const content = variant === 'label' && typeof children === 'string' ? trUpper(children) : children;
  return (
    <Text style={[font[variant], { color: c[color ?? 'text'] }, center && { textAlign: 'center' }, style]} {...rest}>
      {content}
    </Text>
  );
}

/** Kaydırılabilir ekran; sekmeli ekranlarda üst güvenli alanı kendisi bırakır. */
export function Screen({
  children,
  topInset = true,
  refreshControl,
  contentStyle,
  scrollRef,
}: {
  children: ReactNode;
  topInset?: boolean;
  refreshControl?: ComponentProps<typeof ScrollView>['refreshControl'];
  contentStyle?: StyleProp<ViewStyle>;
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.screen, { paddingTop: (topInset ? insets.top : 0) + space.lg }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}>
        {children}
      </ScrollView>
      {/* Kaydırılan içerik durum çubuğunun altına girmesin. */}
      {topInset && <View pointerEvents="none" style={[styles.statusBar, { height: insets.top, backgroundColor: c.background }]} />}
    </View>
  );
}

export function Card({
  children,
  style,
  tone,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'muted' | 'plain';
  padded?: boolean;
}) {
  const c = useColors();
  const muted = tone === 'muted';
  return (
    <View
      style={[
        styles.card,
        padded && { padding: space.lg },
        muted ? { backgroundColor: c.surfaceMuted } : { backgroundColor: c.surface, ...shadow(c.shadow, 1) },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Basınca hafifçe küçülen, titreşimli dokunma alanı. */
export function PressableScale({
  children,
  style,
  containerStyle,
  haptic = 'tap',
  dimWhenDisabled = true,
  onPress,
  disabled,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Dış dokunma alanının yerleşimi (ör. flex: 1, yüzde genişlik); görünüm `style` ile verilir. */
  containerStyle?: StyleProp<ViewStyle>;
  haptic?: 'tap' | 'select' | null;
  /** false: devre dışıyken soluklaşmaz (ör. sonuç gösterilirken kartlar). */
  dimWhenDisabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const buzz = useHaptics();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      {...rest}
      style={containerStyle}
      disabled={disabled}
      onPressIn={() => scale.set(withSpring(0.96, { damping: 18, stiffness: 400 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 14, stiffness: 300 }))}
      onPress={(e) => {
        if (haptic) buzz(haptic);
        onPress?.(e);
      }}>
      <Animated.View style={[style, animated, disabled && dimWhenDisabled && { opacity: 0.45 }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  size = 'md',
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  size?: 'md' | 'lg';
  accessibilityHint?: string;
}) {
  const c = useColors();
  const fg = kind === 'primary' ? c.textOnAccent : kind === 'ghost' ? c.accent : c.text;
  const bg: ViewStyle =
    kind === 'primary'
      ? { backgroundColor: c.accent, ...shadow(c.accent, 2) }
      : kind === 'secondary'
        ? { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1.5 }
        : { backgroundColor: 'transparent' };
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, size === 'lg' && styles.buttonLg, bg]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'lg' ? 22 : 19} color={fg} />}
          <Text style={[font.bodyStrong, size === 'lg' && { fontSize: 18 }, { color: fg }]}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

export function Chip({ label, icon, color, bg }: { label: string; icon?: IconName; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={14} color={color} />}
      <Text style={[font.caption, { fontFamily: fonts.extrabold, color }]}>{label}</Text>
    </View>
  );
}

/** Seçilebilir büyük şık (bilgi, anket, Hangisi daha…?). */
export function Choice({
  label,
  onPress,
  selected,
  disabled,
  tone,
  leading,
  trailing,
  accent,
}: {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  tone?: 'correct' | 'wrong' | 'dim';
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Seçili hâlin rengi (varsayılan: marka turuncusu; ör. ankette format moru). */
  accent?: { color: string; soft: string };
}) {
  const c = useColors();
  const sel = accent ?? { color: c.accent, soft: c.accentSoft };
  const bg = tone === 'correct' ? c.correctSoft : tone === 'wrong' ? c.closeSoft : selected ? sel.soft : c.surface;
  const border = tone === 'correct' ? c.correct : tone === 'wrong' ? c.close : selected ? sel.color : c.border;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      dimWhenDisabled={!tone}
      haptic="select"
      onPress={onPress}
      style={[styles.choice, { backgroundColor: bg, borderColor: border, opacity: tone === 'dim' ? 0.55 : 1 }]}>
      {leading}
      <Text style={[font.bodyStrong, { flex: 1, color: c.text }]}>{label}</Text>
      {trailing}
    </PressableScale>
  );
}

export function Row({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm }, style]} {...rest}>
      {children}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <T variant="label" color="textMuted">
        {children}
      </T>
      {action}
    </Row>
  );
}

/** Yanıp sönen yer tutucu (yükleniyor). */
export function Skeleton({ height, width = '100%', style }: { height: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.set(withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1));
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[{ height, width, borderRadius: radius.md, backgroundColor: c.surfaceMuted }, animated, style]} />;
}

export function LoadingScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, padding: space.lg, paddingTop: insets.top + space.lg, gap: space.lg }}>
      <Skeleton height={150} style={{ borderRadius: radius.xl }} />
      <Skeleton height={28} width="80%" />
      <Skeleton height={64} />
      <Skeleton height={64} />
      <Skeleton height={64} />
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.accent} />
    </View>
  );
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Bir şeyler ters gitti. Lütfen biraz sonra tekrar dene.';
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.background, gap: space.lg }]}>
      <View style={[styles.errorIcon, { backgroundColor: c.surfaceMuted }]}>
        <Icon name="cloud-offline-outline" size={34} color={c.textMuted} />
      </View>
      <T variant="bodyStrong" center>
        {messageOf(error)}
      </T>
      {onRetry && <Button title="Tekrar dene" icon="refresh" kind="secondary" onPress={onRetry} />}
    </View>
  );
}

/** İşlem hatasını satır içinde gösterir (ör. "İpucu 3. tahminden sonra açılır."). */
export function InlineError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Animated.View entering={FadeInDown.duration(200)}>
      <T variant="caption" color="danger" accessibilityLiveRegion="polite">
        {messageOf(error)}
      </T>
    </Animated.View>
  );
}

/** Yatay yüzde çubuğu; açılırken soldan dolar. */
export function Bar({ label, value, highlight, color, delay = 0 }: { label: string; value: number; highlight?: boolean; color?: string; delay?: number }) {
  const c = useColors();
  const width = useSharedValue(0);
  useEffect(() => {
    width.set(withDelay(delay, withTiming(Math.min(100, Math.max(0, value)), { duration: 700 })));
  }, [value, delay, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  const tint = color ?? (highlight ? c.accent : c.textSubtle);
  return (
    <View style={{ gap: space.xs }} accessible accessibilityLabel={`${label}: yüzde ${value}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant={highlight ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
          {label}
          {highlight ? '  ✓' : ''}
        </T>
        <T variant="bodyStrong" style={{ color: highlight ? tint : c.textMuted }}>
          {pct(value)}
        </T>
      </Row>
      <View style={[styles.barTrack, { backgroundColor: c.surfaceMuted }]}>
        <Animated.View style={[styles.barFill, { backgroundColor: tint }, fill]} />
      </View>
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const c = useColors();
  const buzz = useHaptics();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceMuted }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              buzz('select');
              onChange(o.value);
            }}
            style={[styles.segment, selected && { backgroundColor: c.surface, ...shadow(c.shadow, 1) }]}>
            <T variant="bodyStrong" color={selected ? 'text' : 'textMuted'} style={{ fontSize: 14 }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useColors();
  return (
    <Row style={{ minHeight: minTouch, gap: space.md }}>
      <View style={[styles.rowIcon, { backgroundColor: c.surfaceMuted }]}>
        <Icon name={icon} size={18} color={c.text} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{title}</T>
        {subtitle && (
          <T variant="caption" color="textMuted">
            {subtitle}
          </T>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.accent, false: c.border }}
        thumbColor="#FFFFFF"
        accessibilityLabel={title}
      />
    </Row>
  );
}

export function LinkRow({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale haptic="select" onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={{ minHeight: minTouch, justifyContent: 'center' }}>
      <Row style={{ gap: space.md }}>
        <View style={[styles.rowIcon, { backgroundColor: c.surfaceMuted }]}>
          <Icon name={icon} size={18} color={c.text} />
        </View>
        <T variant="bodyStrong" style={{ flex: 1 }}>
          {title}
        </T>
        <Icon name="chevron-forward" size={18} color={c.textSubtle} />
      </Row>
    </PressableScale>
  );
}

// --- Bildirim baloncuğu (ör. "Kopyalandı") ---

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(m);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          exiting={FadeOutUp.duration(180)}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.toast, { top: insets.top + space.sm, backgroundColor: c.text, ...shadow(c.shadow, 3) }]}>
          <Icon name="checkmark-circle" size={18} color={c.background} />
          <Text style={[font.bodyStrong, { color: c.background }]}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: space.lg, paddingBottom: space.xxxl * 2, gap: space.lg },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.94 },
  card: { borderRadius: radius.lg, gap: space.md },
  button: {
    minHeight: minTouch + 4,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  buttonLg: { minHeight: 60 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  choice: {
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  errorIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  barTrack: { height: 12, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
  },
});
