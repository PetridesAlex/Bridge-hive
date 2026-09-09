export function PermissionGuard({
  allowed,
  children,
  fallback = null,
}: {
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
