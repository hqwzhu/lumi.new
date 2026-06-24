import type { LicenseStatus } from '../license/licenseApi';
import type { SetupStatus } from '../setup/setupApi';

export type DesktopStartupView = 'loading' | 'connection-error' | 'activation' | 'setup' | 'app';

export interface DesktopStartupState {
  shellLoading: boolean;
  licenseLoading: boolean;
  setupLoading: boolean;
  licenseStatus: LicenseStatus | null;
  setupStatus: SetupStatus | null;
  licenseError: string;
  setupError: string;
}

export function getDesktopStartupView(state: DesktopStartupState): DesktopStartupView {
  if (state.shellLoading || state.licenseLoading || state.setupLoading) return 'loading';
  if (state.licenseError || state.setupError || !state.licenseStatus || !state.setupStatus) {
    return 'connection-error';
  }
  if (state.licenseStatus.requiresActivation === true) return 'activation';
  if (state.setupStatus.requiresSetup === true) return 'setup';
  return 'app';
}
