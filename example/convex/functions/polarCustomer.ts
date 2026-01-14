import '../lib/polar-polyfills';

import { CRPCError } from 'better-convex/server';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';
import { privateAction, privateMutation } from '../lib/crpc';
import { getPolarClient } from '../lib/polar-client';

// Create Polar customer (called from user.onCreate trigger)
export const createCustomer = privateAction
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      userId: zid('user'),
    })
  )
  .output(z.null())
  .action(async ({ input: args }) => {
    const polar = getPolarClient();

    try {
      await polar.customers.create({
        email: args.email,
        externalId: args.userId, // IMPORTANT: Use userId as externalId
        name: args.name,
      });
    } catch (error) {
      // Don't fail signup if Polar customer creation fails
      console.error('Failed to create Polar customer:', error);
    }

    return null;
  });

// Link Polar customer ID to user (called from webhook)
export const updateUserPolarCustomerId = privateMutation
  .input(
    z.object({
      customerId: z.string(),
      userId: zid('user'),
    })
  )
  .output(z.null())
  .mutation(async ({ ctx, input: args }) => {
    const user = await ctx.table('user').getX(args.userId);

    // Check for duplicate customer IDs
    const existingUser = await ctx
      .table('user')
      .get('customerId', args.customerId);

    if (existingUser && existingUser._id !== args.userId) {
      throw new CRPCError({
        code: 'CONFLICT',
        message: `Another user already has Polar customer ID ${args.customerId}`,
      });
    }

    await user.patch({ customerId: args.customerId });
    return null;
  });
