'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';

import { createOrganizationWithAdminInviteAction } from '@/app/actions/admin-organizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganizationWithAdminInviteAction,
    {},
  );
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  useEffect(() => {
    if (state.success && state.data) {
      const data = state.data as { raw_token: string };
      setInvitationToken(data.raw_token);
    }
  }, [state]);

  if (invitationToken) {
    const invitationUrl = `${window.location.origin}/organization-invitations/accept?token=${invitationToken}`;
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-medium text-green-900">
              Organization created successfully!
            </p>
            <p className="mt-1 text-sm text-green-700">
              The admin invitation has been generated. Copy the link below for local
              development testing.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Local development invitation link (shown once)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invitationUrl}
                readOnly
                className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(invitationUrl);
                }}
              >
                Copy
              </Button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              In production, this link would be sent via email.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/organizations">Back to organizations</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Legal name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="legalName"
                required
                maxLength={200}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Nicosia General Hospital Ltd"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Display name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="displayName"
                required
                maxLength={200}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Nicosia General Hospital"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Slug <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="slug"
                required
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                minLength={2}
                maxLength={64}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                placeholder="nicosia-general"
              />
              <p className="mt-1 text-xs text-slate-500">
                Lowercase, numbers, hyphens only
              </p>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Organization type <span className="text-red-500">*</span>
              </span>
              <select
                name="organizationType"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="">Select type</option>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="nursing_home">Nursing home</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Timezone <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="timezone"
                defaultValue="Europe/Nicosia"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Country code <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="countryCode"
                defaultValue="CY"
                required
                maxLength={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Address line 1
              </span>
              <input
                type="text"
                name="addressLine1"
                maxLength={200}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Address line 2
              </span>
              <input
                type="text"
                name="addressLine2"
                maxLength={200}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">City</span>
              <input
                type="text"
                name="city"
                maxLength={120}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Postal code
              </span>
              <input
                type="text"
                name="postalCode"
                maxLength={32}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Tax/VAT number
              </span>
              <input
                type="text"
                name="taxVat"
                maxLength={64}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Billing email
              </span>
              <input
                type="email"
                name="billingEmail"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Contact phone
            </span>
            <input
              type="text"
              name="contactPhone"
              maxLength={40}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="border-t border-slate-200 pt-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Admin email <span className="text-red-500">*</span>
              </span>
              <input
                type="email"
                name="adminEmail"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="admin@example.com"
              />
              <p className="mt-1 text-xs text-slate-500">
                Invitation will be generated for this email address
              </p>
            </label>
          </div>

          {state.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {state.error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create organization'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/organizations">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
