// Fingerprint / face unlock. The PIN always still works as the fallback.
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export async function biometricAvailable() {
  if (Platform.OS === 'web') return { ok: false, label: 'Fingerprint' };
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    return { ok: hardware && enrolled, enrolled, hardware, label: finger ? 'Fingerprint' : face ? 'Face unlock' : 'Biometrics' };
  } catch (e) {
    return { ok: false, label: 'Fingerprint' };
  }
}

export async function biometricUnlock(promptMessage = 'Unlock Ledger') {
  try {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Use PIN', disableDeviceFallback: true });
    return !!res.success;
  } catch (e) {
    return false;
  }
}
