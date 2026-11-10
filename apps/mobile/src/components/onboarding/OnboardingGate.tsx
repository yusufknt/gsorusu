/**
 * Tanıtım ekranı (telefon). Web karşılığı OnboardingGate.web.tsx: önce Skia'yı (CanvasKit) yükler.
 * Ayrım sayfa dosyasında değil burada yapılır: rota klasöründeki .web.tsx dosyası Android paketine de
 * giriyor ve web Skia'sı (canvaskit-wasm) orada derlenemiyordu.
 */
export { default } from './Onboarding';
