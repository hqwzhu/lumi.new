# Windows License Activation Design

## Goal

Add a Windows MVP activation gate for Lumi OS so a license code generated for one machine code only activates that machine.

## Scope

- Windows desktop package only.
- First launch shows a machine code and asks for a license code before the existing setup wizard.
- Activation is stored locally under the Lumi OS data directory.
- License verification runs locally and does not require users to log in or call a remote server.
- The admin website generator must generate the same signed license format.

## Architecture

Lumi OS uses an offline signed license model:

1. The backend computes a stable machine code from Windows system identifiers.
2. The admin generator signs a payload containing the machine code and license metadata.
3. The app verifies the signature with a public key embedded in Lumi OS.
4. The app stores the activated license in `license.json`.

The private signing key must stay outside the shipped application and GitHub repository. The shipped app contains only the public verification key.

## User Flow

1. User installs and opens Lumi OS.
2. The app checks `/api/license/status`.
3. If inactive, the app displays:
   - machine code
   - copy button
   - license code input
   - short activation instructions
4. User sends the machine code to the operator or enters it into the admin generator.
5. User enters the generated license code.
6. If valid, Lumi OS continues to the existing API setup wizard or main app.

## Backend Components

- `server/license/machine_code.ts`: build and normalize machine codes.
- `server/license/license_code.ts`: parse and verify signed license codes.
- `server/license/license_state.ts`: persist activation state.
- `server/routes/license_routes.ts`: expose status and activation endpoints.
- `server/runtime/routes.ts`: mount license routes.

## Frontend Components

- `src/license/licenseApi.ts`: call license endpoints.
- `src/license/LicenseActivation.tsx`: activation screen.
- `src/entries/desktop.tsx`: gate app startup before setup onboarding.

## License Format

License code format:

```text
LUMI1-<base64url-json-payload>.<base64url-ed25519-signature>
```

Payload fields:

- `v`: `1`
- `product`: `lumi-os`
- `machineCode`: machine code shown by Lumi OS
- `licenseId`: operator-visible license identifier
- `issuedAt`: ISO timestamp
- `expiresAt`: optional ISO timestamp
- `edition`: optional edition, defaults to `windows`

## Errors

- Invalid code format: ask user to paste the full authorization code.
- Signature mismatch: code is not issued by the Lumi OS license authority.
- Machine mismatch: code belongs to a different computer.
- Expired license: ask user to request a new code.

## Validation

- Unit tests for machine-code normalization and license verification.
- Route tests for status, invalid activation, valid activation, and machine mismatch.
- Frontend type check through `npm run lint`.
- Full Windows package build through `npm run release:windows`.
