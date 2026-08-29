import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, documentStatusStyles, spacing, typography } from '@/constants/theme';
import type { ProfessionalDocument } from '@/types';
import { formatDate } from '@/utils/format';

type Props = {
  document: ProfessionalDocument;
  onUpdate?: () => void;
};

export function DocumentCard({ document, onUpdate }: Props) {
  const status = documentStatusStyles[document.verificationStatus];
  const expiryText =
    document.verificationStatus === 'EXPIRING_SOON' && document.daysUntilExpiry
      ? `Expires in ${document.daysUntilExpiry} days`
      : `Expires: ${formatDate(document.expiresAt, { weekday: undefined })}`;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.type}>{document.documentType.toUpperCase()}</Text>
        <Badge
          label={status.label.toUpperCase()}
          color={status.fg}
          backgroundColor={status.bg}
          icon={status.icon as 'checkmark-circle'}
        />
      </View>
      <Text style={styles.authority}>{document.issuingAuthority}</Text>
      {document.registrationNumber ? (
        <Text style={styles.reg}>#{document.registrationNumber}</Text>
      ) : null}
      <Text
        style={[
          styles.expiry,
          document.verificationStatus === 'EXPIRING_SOON' && styles.expiryWarn,
          document.verificationStatus === 'EXPIRED' && styles.expiryError,
        ]}
      >
        {expiryText}
      </Text>
      {(document.verificationStatus === 'EXPIRING_SOON' ||
        document.verificationStatus === 'EXPIRED') && (
        <Button
          label="Update Document"
          variant="brand"
          size="sm"
          onPress={onUpdate}
          style={styles.btn}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  type: {
    flex: 1,
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  authority: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  reg: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  expiry: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.text,
    marginTop: spacing.sm,
  },
  expiryWarn: {
    color: colors.navy,
    backgroundColor: colors.yellowLight,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  expiryError: {
    color: colors.error,
  },
  btn: {
    marginTop: spacing.md,
  },
});
