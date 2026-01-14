'use client';

import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get('checkout_id');

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 rounded-full bg-green-500/10 p-4">
        <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
      </div>
      <h1 className="mb-2 font-semibold text-2xl">Payment Successful!</h1>
      <p className="mb-6 text-muted-foreground">
        Your subscription has been activated. You now have access to premium
        features.
      </p>
      {checkoutId && (
        <p className="mb-6 font-mono text-muted-foreground text-xs">
          Checkout ID: {checkoutId}
        </p>
      )}
      <Button asChild>
        <Link href="/">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
