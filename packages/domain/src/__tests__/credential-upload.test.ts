import {
  CREDENTIAL_FILE_FORMAT_HINT_EN,
  credentialExtensionForMime,
  isConvertibleCredentialMime,
  isUploadableCredentialMime,
  MAX_CREDENTIAL_FILE_BYTES,
  normalizeCredentialMime,
  resolveCredentialUploadMime,
  sanitizeCredentialDisplayName,
  sniffCredentialMimeFromBytes,
  validateCredentialUpload,
} from '../credential-requirements';

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

describe('credential upload normalization', () => {
  it('normalizes MIME aliases and resolves from extension', () => {
    expect(normalizeCredentialMime('image/jpg')).toBe('image/jpeg');
    expect(normalizeCredentialMime('IMAGE/PNG; charset=binary')).toBe('image/png');
    expect(
      resolveCredentialUploadMime({
        mimeType: 'application/octet-stream',
        fileName: 'Licence.PDF',
      }),
    ).toBe('application/pdf');
    expect(
      resolveCredentialUploadMime({
        mimeType: '',
        fileName: 'scan.WEBP',
      }),
    ).toBe('image/webp');
    expect(
      resolveCredentialUploadMime({
        mimeType: 'image/heic',
        fileName: 'IMG_0001.HEIC',
      }),
    ).toBe('image/heic');
  });

  it('maps extensions for uploadable and convertible types', () => {
    expect(credentialExtensionForMime('application/pdf')).toBe('pdf');
    expect(credentialExtensionForMime('image/jpeg')).toBe('jpg');
    expect(credentialExtensionForMime('image/png')).toBe('png');
    expect(credentialExtensionForMime('image/webp')).toBe('webp');
    expect(credentialExtensionForMime('image/heic')).toBe('heic');
    expect(isUploadableCredentialMime('image/webp')).toBe(true);
    expect(isConvertibleCredentialMime('image/heif')).toBe(true);
    expect(isUploadableCredentialMime('image/heic')).toBe(false);
  });

  it('sniffs PDF JPEG PNG WebP and HEIC brands from bytes', () => {
    expect(sniffCredentialMimeFromBytes(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x25, 0x25))).toBe(
      'application/pdf',
    );
    expect(sniffCredentialMimeFromBytes(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe(
      'image/jpeg',
    );
    expect(
      sniffCredentialMimeFromBytes(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0),
      ),
    ).toBe('image/png');

    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffCredentialMimeFromBytes(webp)).toBe('image/webp');

    const heic = new Uint8Array(12);
    heic.set([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
    expect(sniffCredentialMimeFromBytes(heic)).toBe('image/heic');

    expect(sniffCredentialMimeFromBytes(bytes(0, 1, 2, 3))).toBeNull();
  });

  it('validates uploadable types including WebP and rejects junk', () => {
    expect(
      validateCredentialUpload({ mimeType: 'image/webp', sizeBytes: 2048 }).ok,
    ).toBe(true);
    expect(
      validateCredentialUpload({ mimeType: 'image/jpg', sizeBytes: 2048 }).ok,
    ).toBe(true);
    expect(
      validateCredentialUpload({
        mimeType: 'application/octet-stream',
        fileName: 'id.PNG',
        sizeBytes: 100,
      }).ok,
    ).toBe(true);
    expect(
      validateCredentialUpload({ mimeType: 'image/gif', sizeBytes: 100 }).ok,
    ).toBe(false);
    expect(
      validateCredentialUpload({
        mimeType: 'application/pdf',
        sizeBytes: MAX_CREDENTIAL_FILE_BYTES + 1,
      }).ok,
    ).toBe(false);
    expect(
      validateCredentialUpload({ mimeType: 'application/pdf', sizeBytes: 0 }).ok,
    ).toBe(false);
  });

  it('allows HEIC only when conversion is explicitly permitted', () => {
    expect(
      validateCredentialUpload({
        mimeType: 'image/heic',
        sizeBytes: 1000,
        allowConvertible: true,
      }).ok,
    ).toBe(true);
    expect(
      validateCredentialUpload({
        mimeType: 'image/heic',
        sizeBytes: 1000,
      }).ok,
    ).toBe(false);
  });

  it('defers missing size when allowUnknownSize is set', () => {
    expect(
      validateCredentialUpload({
        mimeType: 'application/pdf',
        allowUnknownSize: true,
      }).ok,
    ).toBe(true);
    expect(
      validateCredentialUpload({
        mimeType: 'application/pdf',
      }).ok,
    ).toBe(false);
  });

  it('sanitizes display names without leaking path segments', () => {
    expect(sanitizeCredentialDisplayName('../../tax 123.pdf')).toBe('tax 123.pdf');
    expect(sanitizeCredentialDisplayName('Αδειά Νοσηλευτή.PDF')).toContain('Αδειά');
    expect(CREDENTIAL_FILE_FORMAT_HINT_EN).toContain('10 MB');
  });
});
