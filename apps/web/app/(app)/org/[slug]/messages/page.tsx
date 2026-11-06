import { canOrgStaffMessage } from '@bridge-hive/domain';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { OrgMessagesWorkspace } from '@/components/org/org-messages-workspace';
import { PageHeader } from '@/components/org/page-header';
import { requireOrgMembership } from '@/lib/auth';
import { orgMessagesCopy } from '@/lib/org-messages-i18n';

export default async function OrgMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const ctx = await requireOrgMembership(slug);
  const copy = orgMessagesCopy('en');

  if (!ctx.capabilities.canOperate) {
    return (
      <EmptyState title={copy.notOperational} description={copy.notOperational} />
    );
  }

  if (
    !canOrgStaffMessage({
      canOperate: ctx.capabilities.canOperate,
      canManageShifts: ctx.capabilities.canManageShifts,
      canReviewTimesheets: ctx.capabilities.canReviewTimesheets,
    })
  ) {
    redirect(`/org/${slug}/dashboard`);
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <OrgMessagesWorkspace
        organizationId={ctx.org.id}
        currentUserId={ctx.user.id}
        locale="en"
        initialConversationId={query.conversation ?? null}
      />
    </div>
  );
}
