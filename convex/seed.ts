/* eslint-disable unicorn/no-array-push-push */
import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';

import type { Id } from './_generated/dataModel';
import type { EntInsertMany } from './shared/types';

import { internal } from './_generated/api';
import { createInternalAction, createInternalMutation } from './functions';
import { getEnv } from './helpers/getEnv';

// Admin configuration - moved inside functions to avoid module-level execution
const getAdminConfig = () => {
  const adminEmail = getEnv().SUPERADMIN[0] || 'admin@gmail.com';

  return { adminEmail };
};

// Seed data - this function will be called with admin config
const getUsersData = (adminConfig: { adminEmail: string }) => [
  {
    id: adminConfig.adminEmail,
    bio: undefined,
    email: adminConfig.adminEmail,
    name: 'Admin',
    image: 'https://avatars.githubusercontent.com/u/1',
  },
  {
    id: 'alice',
    bio: 'Frontend Developer',
    email: 'alice@gmail.com',
    name: 'Alice Johnson',
    image: 'https://avatars.githubusercontent.com/u/2',
  },
  {
    id: 'bob',
    bio: 'Backend Developer',
    email: 'bob@gmail.com',
    name: 'Bob Smith',
    image: 'https://avatars.githubusercontent.com/u/3',
  },
  {
    id: 'carol',
    bio: 'UI/UX Designer',
    email: 'carol@gmail.com',
    name: 'Carol Williams',
    image: 'https://avatars.githubusercontent.com/u/4',
  },
  {
    id: 'dave',
    bio: 'DevOps Engineer',
    email: 'dave@gmail.com',
    name: 'Dave Brown',
    image: undefined,
  },
];

// Main seed function that orchestrates everything
export const seed = createInternalAction()({
  args: {},
  returns: z.null(),
  handler: async (ctx) => {
    console.info('🌱 Starting seeding...');

    try {
      // Step 1: Clean up existing seed data
      await ctx.runMutation(internal.seed.cleanupSeedData, {});

      // Step 2: Seed users
      await ctx.runMutation(internal.seed.seedUsers, {});

      console.info('✅ Seeding finished');
    } catch (error) {
      console.error('❌ Error while seeding:', error);

      throw error;
    }

    return null;
  },
});

// Clean up existing seed data
export const cleanupSeedData = createInternalMutation()({
  args: {},
  returns: z.null(),
  handler: async (ctx) => {
    console.info(
      '🧹 Starting cleanup of seed data (preserving users and sessions)...'
    );


    console.info('🧹 Cleanup finished');

    return null;
  },
});

// Seed users
export const seedUsers = createInternalMutation()({
  args: {},
  returns: z.array(zid('users')),
  handler: async (ctx) => {
    console.info('👤 Creating users...');

    const userIds: Id<'users'>[] = [];
    const adminConfig = getAdminConfig();
    const usersData = getUsersData(adminConfig);

    for (const userData of usersData) {
      // Check if user exists by email
      const existing = await ctx
        .table('users')
        .filter((q) => q.eq(q.field('email'), userData.email))
        .unique();

      if (existing) {
        // Update existing user (preserve session-related fields)
        const updateData: any = {
          name: userData.name,
        };

        if (userData.bio !== undefined) {
          updateData.bio = userData.bio;
        }
        if (userData.image !== undefined) {
          updateData.image = userData.image;
        }

        await ctx.table('users').getX(existing._id).patch(updateData);
        userIds.push(existing._id);
        console.info(`  ✅ Updated user: ${userData.name}`);
      } else {
        // Create new user
        const insertData: any = {
          email: userData.email,
          name: userData.name,
        };

        if (userData.bio !== undefined) {
          insertData.bio = userData.bio;
        }
        if (userData.image !== undefined) {
          insertData.image = userData.image;
        }

        const userId = await ctx.table('users').insert(insertData);
        userIds.push(userId);
        console.info(`  ✅ Created user: ${userData.name}`);
      }
    }

    console.info('👤 Created users');

    return userIds;
  },
});

// Run the seed - this can be called from the Convex dashboard
// npx convex run seed:seed
