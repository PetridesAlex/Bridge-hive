'use client';

import { ImagePlus, Upload } from 'lucide-react';
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

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-2">
        <Label>Location photo</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative flex h-28 w-full shrink-0 overflow-hidden rounded-2xl border border-dashed border-bh-border bg-bh-subtle/50 sm:w-44',
              'transition-colors hover:border-bh-accent-blue hover:bg-bh-accent-blue-soft/40',
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

      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={location?.name ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addressLine1">Address line 1</Label>
        <Input
          id="addressLine1"
          name="addressLine1"
          defaultValue={location?.address_line1 ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addressLine2">Address line 2</Label>
        <Input
          id="addressLine2"
          name="addressLine2"
          defaultValue={location?.address_line2 ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={location?.city ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="postalCode">Postal code</Label>
        <Input
          id="postalCode"
          name="postalCode"
          defaultValue={location?.postal_code ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="countryCode">Country code</Label>
        <Input
          id="countryCode"
          name="countryCode"
          defaultValue={location?.country_code ?? 'CY'}
          maxLength={2}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          defaultValue={location?.timezone ?? 'Europe/Nicosia'}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactName">Contact name</Label>
        <Input
          id="contactName"
          name="contactName"
          defaultValue={location?.contact_name ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input
          id="contactPhone"
          name="contactPhone"
          defaultValue={location?.contact_phone ?? ''}
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={location?.contact_email ?? ''}
        />
      </div>

      {state.error ? (
        <p className="sm:col-span-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy} variant="honey" className="rounded-xl">
          {busy
            ? uploadingImage
              ? 'Uploading photo…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create location'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
