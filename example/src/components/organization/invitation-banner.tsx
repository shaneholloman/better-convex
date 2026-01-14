'use client';

import type { Id } from '@convex/dataModel';
import { useMutation } from '@tanstack/react-query';
import { Check, Mail, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCRPC } from '@/lib/convex/crpc';

type InvitationBannerProps = {
  invitation: {
    id: Id<'invitation'>;
    expiresAt: number;
    inviterName: string;
    organizationName: string;
    organizationSlug: string;
    role: string;
  };
};

export function InvitationBanner({ invitation }: InvitationBannerProps) {
  const router = useRouter();
  const crpc = useCRPC();

  // Lazy state initialization - only runs once on mount
  const [now] = useState(() => Date.now());

  const acceptInvitation = useMutation(
    crpc.organization.acceptInvitation.mutationOptions({
      meta: { errorMessage: 'Failed to accept invitation' },
      onSuccess: () => {
        toast.success(`Welcome to ${invitation.organizationName}!`);
        router.refresh();
      },
    })
  );

  const rejectInvitation = useMutation(
    crpc.organization.rejectInvitation.mutationOptions({
      meta: { errorMessage: 'Failed to decline invitation' },
      onSuccess: () => {
        toast.success('Invitation declined');
        router.push('/');
      },
    })
  );

  const isExpired = invitation.expiresAt < now;

  if (isExpired) {
    return (
      <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Invitation Expired</p>
            <p className="text-muted-foreground text-sm">
              This invitation has expired. Please contact the organization owner
              for a new invitation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-primary/50 bg-primary/10 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Mail className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            You've been invited to join {invitation.organizationName}
          </p>
          <p className="text-muted-foreground text-sm">
            {invitation.inviterName
              ? `${invitation.inviterName} invited you as ${invitation.role}`
              : `Invited as ${invitation.role}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={rejectInvitation.isPending || acceptInvitation.isPending}
            onClick={() =>
              rejectInvitation.mutate({ invitationId: invitation.id })
            }
            size="sm"
            variant="outline"
          >
            <X className="mr-1 h-4 w-4" />
            Decline
          </Button>
          <Button
            disabled={acceptInvitation.isPending || rejectInvitation.isPending}
            onClick={() =>
              acceptInvitation.mutate({ invitationId: invitation.id })
            }
            size="sm"
          >
            <Check className="mr-1 h-4 w-4" />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
