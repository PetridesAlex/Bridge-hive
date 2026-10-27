-- Recruitment applicants upload from phones and desktops: allow common photo
-- formats (WebP, HEIC/HEIF from iPhones, GIF, TIFF, BMP) and word-processor
-- files (DOC, DOCX, ODT, RTF) in addition to PDF/JPEG/PNG, so valid uploads are
-- not rejected by the bucket. Keep this list in sync with
-- RECRUITMENT_MIME_TO_EXTENSION in packages/domain/src/recruitment.ts.
-- Executables, scripts, HTML and SVG stay disallowed (files are opened by staff).

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/tiff',
  'image/bmp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf'
]
where id = 'recruitment-documents';
