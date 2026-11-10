import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import { LoadingScreen } from '@/components/ui';

/**
 * Web'de Skia, CanvasKit (WASM) yüklenmeden çalışmaz: tanıtım ayrı bir parçada yüklenir ve
 * CanvasKit, paketle aynı sürümde CDN'den gelir (public/ klasörüne 7 MB'lık dosya koymamak için).
 * @shopify/react-native-skia yükseltilirse sürüm node_modules/canvaskit-wasm/package.json ile eşleşmeli.
 */
const CANVASKIT = 'https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.41.0/bin/full/';

export default function OnboardingGate() {
  return (
    <WithSkiaWeb
      getComponent={() => import('@/components/onboarding/Onboarding')}
      fallback={<LoadingScreen />}
      opts={{ locateFile: (file: string) => `${CANVASKIT}${file}` }}
    />
  );
}
