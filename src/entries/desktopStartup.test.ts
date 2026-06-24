import { describe, expect, it } from 'vitest';
import { getDesktopStartupView } from './desktopStartup';

describe('desktop startup gate', () => {
  it('keeps waiting when license status cannot be read instead of reopening activation', () => {
    expect(getDesktopStartupView({
      shellLoading: false,
      licenseLoading: false,
      setupLoading: false,
      licenseStatus: null,
      setupStatus: { state: { completed: true }, providers: {}, requiresSetup: false },
      licenseError: 'Failed to fetch',
      setupError: '',
    })).toBe('connection-error');
  });

  it('keeps waiting when setup status cannot be read instead of reopening onboarding', () => {
    expect(getDesktopStartupView({
      shellLoading: false,
      licenseLoading: false,
      setupLoading: false,
      licenseStatus: {
        machineCode: 'LUMI-WIN-TEST',
        activated: true,
        requiresActivation: false,
        state: { version: 1, activated: true },
      },
      setupStatus: null,
      licenseError: '',
      setupError: 'Failed to fetch',
    })).toBe('connection-error');
  });

  it('shows activation only when the backend explicitly requires activation', () => {
    expect(getDesktopStartupView({
      shellLoading: false,
      licenseLoading: false,
      setupLoading: false,
      licenseStatus: {
        machineCode: 'LUMI-WIN-TEST',
        activated: false,
        requiresActivation: true,
        state: { version: 1, activated: false },
      },
      setupStatus: { state: { completed: true }, providers: {}, requiresSetup: false },
      licenseError: '',
      setupError: '',
    })).toBe('activation');
  });

  it('shows setup only when activation is complete and setup is explicitly required', () => {
    expect(getDesktopStartupView({
      shellLoading: false,
      licenseLoading: false,
      setupLoading: false,
      licenseStatus: {
        machineCode: 'LUMI-WIN-TEST',
        activated: true,
        requiresActivation: false,
        state: { version: 1, activated: true },
      },
      setupStatus: { state: { completed: false }, providers: {}, requiresSetup: true },
      licenseError: '',
      setupError: '',
    })).toBe('setup');
  });
});
