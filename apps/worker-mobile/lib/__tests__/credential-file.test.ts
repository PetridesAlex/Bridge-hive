jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import {
  classifyCredentialUploadError,
} from '@/lib/credential-file';
import {
  credentialExtensionForMime,
  resolveCredentialUploadMime,
  sniffCredentialMimeFromBytes,
  validateCredentialUpload,
} from '@bridge-hive/domain';

describe('credential-file failure classification', () => {
  it('maps common failures without exposing internals', () => {
    expect(classifyCredentialUploadError('File must be 10 MB or smaller.').code).toBe(
      'too_large',
    );
    expect(classifyCredentialUploadError('Photo library permission is required.').code).toBe(
      'permission',
    );
    expect(classifyCredentialUploadError('Network request timed out').code).toBe('offline');
    expect(classifyCredentialUploadError('You must be signed in.').code).toBe('session');
    expect(
      classifyCredentialUploadError('Could not convert that HEIC photo').code,
    ).toBe('conversion_failed');
    expect(classifyCredentialUploadError('Could not read the selected file.').code).toBe(
      'unreadable',
    );
    expect(
      classifyCredentialUploadError(
        'Unsupported file type. Use PDF, JPEG, PNG, or WebP.',
      ).code,
    ).toBe('unsupported_type');
  });
});

describe('credential upload boundary contracts', () => {
  it('keeps final upload validation aligned with Storage allowlist', () => {
    for (const mime of [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ] as const) {
      expect(validateCredentialUpload({ mimeType: mime, sizeBytes: 512 }).ok).toBe(true);
      expect(credentialExtensionForMime(mime).length).toBeGreaterThan(0);
    }
    expect(
      validateCredentialUpload({ mimeType: 'image/heic', sizeBytes: 512 }).ok,
    ).toBe(false);
    expect(
      validateCredentialUpload({
        mimeType: 'image/heic',
        sizeBytes: 512,
        allowConvertible: true,
      }).ok,
    ).toBe(true);
  });

  it('resolves uppercase extensions and aliases', () => {
    expect(
      resolveCredentialUploadMime({
        mimeType: 'application/octet-stream',
        fileName: 'Card.JPEG',
      }),
    ).toBe('image/jpeg');
    expect(
      resolveCredentialUploadMime({
        mimeType: 'image/jpg',
        fileName: 'x.bin',
      }),
    ).toBe('image/jpeg');
  });

  it('rejects executable-like signatures as unknown sniff', () => {
    const mz = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniffCredentialMimeFromBytes(mz)).toBeNull();
  });
});
