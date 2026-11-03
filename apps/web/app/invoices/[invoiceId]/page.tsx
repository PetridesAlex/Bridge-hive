'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/**
 * Stripe Checkout success/cancel lands here (HTTPS), then we deep-link into
 * the worker app. Invoice paid status is never set from this page — only the
 * signed Stripe webhook may mark invoices paid.
 */
function InvoiceCheckoutReturnInner() {
  const params = useParams<{ invoiceId: string }>();
  const searchParams = useSearchParams();
  const invoiceId = typeof params.invoiceId === 'string' ? params.invoiceId : '';
  const paymentStatus = searchParams.get('payment_status') ?? 'pending';

  const deepLink = useMemo(() => {
    if (!invoiceId) return 'bridgehive://(tabs)/invoices';
    const q = new URLSearchParams({ payment_status: paymentStatus });
    return `bridgehive://invoices/${encodeURIComponent(invoiceId)}?${q.toString()}`;
  }, [invoiceId, paymentStatus]);

  useEffect(() => {
    if (!invoiceId) return;
    window.location.replace(deepLink);
  }, [deepLink, invoiceId]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        background: '#071A2F',
        color: '#F5F7FA',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
        Returning to Bridge Hive
      </h1>
      <p style={{ maxWidth: 420, lineHeight: 1.5, opacity: 0.9, margin: 0 }}>
        Payment confirmation is pending. This page never marks an invoice paid —
        status updates after Stripe confirms the payment.
      </p>
      <a
        href={deepLink}
        style={{
          marginTop: 8,
          color: '#5EEAD4',
          fontWeight: 600,
          textDecoration: 'underline',
        }}
      >
        Open Bridge Hive app
      </a>
    </main>
  );
}

export default function InvoiceCheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#071A2F',
            color: '#F5F7FA',
          }}
        >
          Returning to Bridge Hive…
        </main>
      }
    >
      <InvoiceCheckoutReturnInner />
    </Suspense>
  );
}
