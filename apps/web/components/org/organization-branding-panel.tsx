'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';

import {
  setOrganizationLogoPathAction,
  updateOrganizationDisplayNameAction,
} from '@/app/actions/organization-branding';
import { OrgMark } from '@/components/org/org-mark';
import { Button } from '@/components/ui/button';
import {
  clearOrganizationLogoUrlCache,
  processLogoFile,
  removeStorageObject,
  uploadOrganizationLogo,
} from '@/lib/organization-logo';

export function OrganizationBrandingPanel({
  slug,
  organizationId,
  displayName,
  logoPath,
  logoUrl,
  canManage,
}: {
  slug: string;
  organizationId: string;
  displayName: string;
  logoPath: string | null;
  logoUrl: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(displayName);
  const [pending, startTransition] = useTransition();

  async function onFileChange(file: File | null) {
    setError(null);
    setMessage(null);
    if (!file) return;
    const processed = await processLogoFile(file);
    if (!processed.ok) {
      setError(processed.error);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(processed.previewUrl);
    setPendingBlob(processed.blob);
  }

  async function saveLogo() {
    if (!pendingBlob) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    let uploadedPath: string | undefined;
    try {
      const upload = await uploadOrganizationLogo({
        organizationId,
        blob: pendingBlob,
        previousPath: logoPath,
      });
      if (upload.error || !upload.path) {
        setError(upload.error ?? 'Upload failed.');
        return;
      }
      uploadedPath = upload.path;
      const result = await setOrganizationLogoPathAction({
        slug,
        path: upload.path,
      });
      if (result.error) {
        await removeStorageObject(upload.path);
        setError(result.error);
        return;
      }
      if (logoPath && logoPath !== upload.path) {
        await removeStorageObject(logoPath);
      }
      clearOrganizationLogoUrlCache(organizationId);
      setPendingBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setMessage('Logo updated.');
      router.refresh();
    } catch {
      if (uploadedPath) await removeStorageObject(uploadedPath);
      setError('Could not save the logo.');
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    if (!logoPath) return;
    if (!window.confirm('Remove the organization logo? Initials will be shown instead.')) {
      return;
    }
    setUploading(true);
    setError(null);
    const result = await setOrganizationLogoPathAction({ slug, path: null });
    if (result.error) {
      setError(result.error);
      setUploading(false);
      return;
    }
    await removeStorageObject(logoPath);
    clearOrganizationLogoUrlCache(organizationId);
    setMessage('Logo removed.');
    setUploading(false);
    router.refresh();
  }

  function saveDisplayName() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrganizationDisplayNameAction({
        slug,
        displayName: name,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('Display name updated.');
      if (result.displayName) setName(result.displayName);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-bh-border bg-bh-surface p-6 shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <OrgMark
            displayName={name || displayName}
            logoUrl={previewUrl ?? logoUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-bh-text">Organization branding</h3>
            <p className="mt-1 text-sm text-bh-text-secondary">
              Your logo personalizes the organization workspace. It does not change your
              verified legal identity.
            </p>
            <p className="mt-2 text-xs text-bh-text-muted">
              JPEG or PNG · square crop · up to 10 MB source · processed to ~512×512 / 2 MB
            </p>
          </div>
        </div>

        {canManage ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Choose organization logo"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              {logoPath || previewUrl ? 'Change logo' : 'Upload logo'}
            </Button>
            {pendingBlob ? (
              <Button type="button" onClick={saveLogo} disabled={uploading}>
                <Upload className="h-4 w-4" aria-hidden />
                {uploading ? 'Uploading…' : 'Save logo'}
              </Button>
            ) : null}
            {logoPath ? (
              <Button
                type="button"
                variant="ghost"
                onClick={removeLogo}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove logo
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-bh-text-muted">
            Only Organization Admins can upload or remove the logo.
          </p>
        )}
      </div>

      {canManage ? (
        <div className="relative overflow-hidden rounded-2xl border border-bh-sidebar/15 bg-gradient-to-br from-bh-sidebar via-bh-sidebar to-[#0E4A5C] p-6 text-bh-sidebar-text shadow-[0_12px_32px_rgba(7,29,48,0.14)]">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-bh-teal/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-14 left-10 h-32 w-32 rounded-full bg-bh-honey/20 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-honey">
                Workspace identity
              </p>
              <h3 className="mt-1.5 text-xl font-bold tracking-tight text-white">
                Display name
              </h3>
              <p className="mt-2 text-sm leading-6 text-bh-sidebar-text/85">
                Friendly name shown in the sidebar, dashboard greeting, and organization
                switcher. Legal name, URL slug, and organization ID stay unchanged.
              </p>
            </div>

            <div className="relative shrink-0 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-bh-sidebar-muted">
                Live preview
              </p>
              <div className="mt-2 flex items-center gap-3">
                <OrgMark
                  displayName={name.trim() || displayName}
                  logoUrl={previewUrl ?? logoUrl}
                  size="md"
                  className="bg-white/15 ring-white/20"
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-white">
                    {name.trim() || 'Untitled workspace'}
                  </p>
                  <p className="mt-0.5 text-xs text-bh-sidebar-muted">Sidebar · Switcher</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 rounded-2xl border border-white/10 bg-bh-surface/95 p-4 shadow-inner sm:p-5">
            <label className="block space-y-2 text-sm" htmlFor="org-display-name">
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-bh-text">Display name</span>
                <span className="bh-tabular text-xs font-medium text-bh-text-muted">
                  {name.trim().length}/120
                </span>
              </span>
              <input
                id="org-display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="e.g. Nicosia Hospital"
                className="h-12 w-full rounded-xl border border-bh-border bg-bh-subtle/40 px-3.5 text-[15px] font-semibold tracking-tight text-bh-text outline-none transition-[border-color,box-shadow,background-color] placeholder:font-normal placeholder:text-bh-text-muted focus:border-bh-teal focus:bg-bh-surface focus:ring-2 focus:ring-bh-teal/25"
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-bh-text-muted">
                {name.trim() === displayName
                  ? 'No changes to save yet.'
                  : 'Changes apply across the organization workspace.'}
              </p>
              <Button
                type="button"
                onClick={saveDisplayName}
                disabled={pending || !name.trim() || name.trim() === displayName}
                className="min-w-[120px]"
              >
                {pending ? 'Saving…' : 'Save name'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-bh-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-bh-success" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
