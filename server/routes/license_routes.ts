import { Router } from 'express';
import { createMachineCode } from '../license/machine_code';
import { verifyLicenseCode } from '../license/license_code';
import { activateLicense, loadLicenseState, resetLicenseState, type LicenseState } from '../license/license_state';

function publicLicenseState(state: LicenseState) {
  const { licenseCode: _licenseCode, ...safeState } = state;
  return safeState;
}

function currentStatus() {
  const machineCode = createMachineCode();
  const state = loadLicenseState();
  const activated = state.activated === true && state.machineCode === machineCode;
  return {
    machineCode,
    activated,
    requiresActivation: !activated,
    state: publicLicenseState({
      ...state,
      activated,
    }),
  };
}

export function mountLicenseRoutes(router: Router) {
  router.get('/license/status', (_req, res) => {
    res.json(currentStatus());
  });

  router.post('/license/activate', (req, res) => {
    const machineCode = createMachineCode();
    const licenseCode = typeof req.body?.licenseCode === 'string' ? req.body.licenseCode.trim() : '';

    if (!licenseCode) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_format',
        error: 'Authorization code is required.',
      });
    }

    const result = verifyLicenseCode(licenseCode, { machineCode });
    if (result.ok === false) {
      return res.status(400).json({
        success: false,
        reason: result.reason,
        error: result.message,
        machineCode,
      });
    }

    const state = activateLicense({
      machineCode,
      licenseCode,
      payload: result.payload,
    });

    res.json({
      success: true,
      machineCode,
      state: publicLicenseState(state),
    });
  });

  router.post('/license/reset', (_req, res) => {
    const state = resetLicenseState();
    res.json({
      success: true,
      ...currentStatus(),
      state: publicLicenseState(state),
    });
  });
}
