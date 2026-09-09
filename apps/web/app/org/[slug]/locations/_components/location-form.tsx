'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  createLocationAction,
  updateLocationAction,
  type ActionResult,
} from '@/app/actions/locations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tables } from '@bridge-hive/supabase-types';

type Location = Tables<'locations'>;

const initial: ActionResult = {};

export function LocationForm({
  slug,
  location,
  mode,
}: {
  slug: string;
  location?: Location;
  mode: 'create' | 'edit';
}) {
  const action =
    mode === 'create'
      ? createLocationAction.bind(null, slug)
      : updateLocationAction.bind(null, slug, location!.id);

  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) toast.success('Location saved');
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
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
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Create location' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
