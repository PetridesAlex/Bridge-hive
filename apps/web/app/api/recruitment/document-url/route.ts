import { NextResponse } from 'next/server';

import { requireOrgMembership } from '@/lib/auth';
import { asUntypedDb } from '@/lib/recruitment-db';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const slug = String(formData.get('slug') ?? '');
    const documentId = String(formData.get('documentId') ?? '');
    const ctx = await requireOrgMembership(slug);
    if (!ctx.capabilities.canViewRecruitmentDocuments) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const supabase = asUntypedDb(await createClient());
    await supabase.rpc('audit_recruitment_document_view', {
      p_document_id: documentId,
      p_organization_id: ctx.org.id,
    });

    const { data: doc, error } = await supabase
      .from('recruitment_documents')
      .select('storage_path')
      .eq('id', documentId)
      .maybeSingle();
    if (error || !doc?.storage_path) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('recruitment-documents')
      .createSignedUrl(doc.storage_path as string, 60);
    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Unable to sign URL' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
