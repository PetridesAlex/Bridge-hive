'use client';

import { ArrowRight, Check, ImagePlus, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  createLocationAction,
  setLocationImagePathAction,
  updateLocationAction,
  type ActionResult,
} from '@/app/actions/locations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  processLocationImageFile,
  removeLocationImageObject,
  uploadLocationImage,
} from '@/lib/location-image';
import { cn } from '@/lib/utils';
import type { Tables } from '@bridge-hive/supabase-types';

type Location = Tables<'locations'> & { image_path?: string | null };

const initial: ActionResult = {};

export function LocationForm({
  slug,
  organizationId,
  location,
  mode,
  existingImageUrl,
}: {
  slug: string;
  organizationId: string;
  location?: Location;
  mode: 'create' | 'edit';
  existingImageUrl?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingImageUrl ?? null,
  );
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const action =
    mode === 'create'
      ? createLocationAction.bind(null, slug)
      : updateLocationAction.bind(null, slug, location!.id);

  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (!state.success || !state.locationId) {
      if (state.error) toast.error(state.error);
      return;
    }

    let cancelled = false;

    async function finish() {
      const locationId = state.locationId!;
      if (pendingBlob) {
        setUploadingImage(true);
        let uploadedPath: string | undefined;
        try {
          const upload = await uploadLocationImage({
            organizationId,
            locationId,
            blob: pendingBlob,
          });
          if (upload.error || !upload.path) {
            toast.error(upload.error ?? 'Image upload failed.');
            setUploadingImage(false);
            if (mode === 'create') {
              router.push(`/org/${slug}/locations/${locationId}`);
              router.refresh();
            }
            return;
          }
          uploadedPath = upload.path;
          const pathResult = await setLocationImagePathAction({
            slug,
            locationId,
            path: upload.path,
          });
          if (pathResult.error) {
            await removeLocationImageObject(upload.path);
            toast.error(pathResult.error);
          } else if (location?.image_path && location.image_path !== upload.path) {
            await removeLocationImageObject(location.image_path);
          }
        } catch {
          if (uploadedPath) await removeLocationImageObject(uploadedPath);
          toast.error('Image upload failed.');
        } finally {
          if (!cancelled) setUploadingImage(false);
        }
      }

      if (cancelled) return;
      toast.success(mode === 'create' ? 'Location created' : 'Location saved');
      if (mode === 'create') {
        router.push(`/org/${slug}/locations/${locationId}`);
      }
      router.refresh();
    }

    void finish();
    return () => {
      cancelled = true;
    };
    // Only react to action result — not blob churn mid-upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function onFileChange(file: File | null) {
    setImageError(null);
    if (!file) return;
    const processed = await processLocationImageFile(file);
    if (!processed.ok) {
      setImageError(processed.error);
      return;
    }
    if (previewUrl && previewUrl !== existingImageUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(processed.previewUrl);
    setPendingBlob(processed.blob);
  }

  const busy = pending || uploadingImage;

  const fieldClass =
    'h-11 rounded-xl border-bh-border/80 bg-white shadow-[0_1px_2px_rgba(7,29,48,0.03)] focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';
  const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted';

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-bh-border/70 bg-[#f7fafc]/70 p-4 sm:p-5">
        <Label className={labelClass}>Location photo</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative flex h-32 w-full shrink-0 overflow-hidden rounded-2xl border border-dashed border-bh-border bg-white sm:w-48',
              'shadow-[0_1px_2px_rgba(7,29,48,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-bh-teal/40 hover:shadow-[0_8px_20px_rgba(7,29,48,0.08)] motion-reduce:hover:translate-y-0',
            )}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-bh-text-muted">
                <ImagePlus className="h-6 w-6" aria-hidden />
                <span className="text-xs font-semibold">Add photo</span>
              </span>
            )}
          </button>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <p className="text-sm text-bh-text-secondary">
              Upload a facility photo for cards and listings. JPEG, PNG, or WebP
              up to 10 MB.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                {previewUrl ? 'Change photo' : 'Choose photo'}
              </Button>
              {pendingBlob || (previewUrl && previewUrl !== existingImageUrl) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-bh-text-muted"
                  disabled={busy}
                  onClick={() => {
                    if (previewUrl && previewUrl !== existingImageUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(existingImageUrl ?? null);
                    setPendingBlob(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Reset
                </Button>
              ) : null}
            </div>
            {imageError ? (
              <p className="text-sm text-bh-danger" role="alert">
                {imageError}
              </p>
            ) : null}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name" className={labelClass}>
            Name
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={location?.name ?? ''}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addressLine1" className={labelClass}>
            Address line 1
          </Label>
          <Input
            id="addressLine1"
            name="addressLine1"
            defaultValue={location?.address_line1 ?? ''}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addressLine2" className={labelClass}>
            Address line 2
          </Label>
          <Input
            id="addressLine2"
            name="addressLine2"
            defaultValue={location?.address_line2 ?? ''}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city" className={labelClass}>
            City
          </Label>
          <Input
            id="city"
            name="city"
            defaultValue={location?.city ?? ''}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode" className={labelClass}>
            Postal code
          </Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={location?.postal_code ?? ''}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="countryCode" className={labelClass}>
            Country code
          </Label>
          <Input
            id="countryCode"
            name="countryCode"
            defaultValue={location?.country_code ?? 'CY'}
            maxLength={2}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone" className={labelClass}>
            Timezone
          </Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={location?.timezone ?? 'Europe/Nicosia'}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactName" className={labelClass}>
            Contact name
          </Label>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={location?.contact_name ?? ''}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPhone" className={labelClass}>
            Contact phone
          </Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={location?.contact_phone ?? ''}
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="contactEmail" className={labelClass}>
            Contact email
          </Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={location?.contact_email ?? ''}
            className={fieldClass}
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-bh-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bh-border/60 pt-5">
        <p className="text-xs text-bh-text-muted">
          Changes apply to shift listings and worker-facing location cards.
        </p>
        <Button
          type="submit"
          disabled={busy}
          variant="honey"
          size="lg"
          className="group min-h-11 justify-between gap-3 rounded-xl px-5 shadow-[0_10px_24px_rgba(228,179,52,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(228,179,52,0.38)] active:translate-y-0 active:shadow-[0_6px_16px_rgba(228,179,52,0.22)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {uploadingImage ? 'Uploading photo…' : 'Saving…'}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden />
                {mode === 'create' ? 'Create location' : 'Save changes'}
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
