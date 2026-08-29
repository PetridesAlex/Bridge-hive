import React from 'react';
import { Alert } from 'react-native';

import { DocumentCard } from '@/components/documents/DocumentCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useProfileStore } from '@/store/profileStore';

export default function DocumentsScreen() {
  const documents = useProfileStore((s) => s.documents);

  return (
    <AppScreen>
      <ScreenHeader title="My Documents" showBack subtitle="Credentials" />
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          onUpdate={() =>
            Alert.alert(
              'Update Document',
              'Phase 1 placeholder — document upload arrives with Supabase Storage in Phase 2.',
            )
          }
        />
      ))}
    </AppScreen>
  );
}
