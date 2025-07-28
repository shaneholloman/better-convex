import { defineEnt, defineEntSchema, getEntDefinitions } from 'convex-ents';
import { v } from 'convex/values';

const schema = defineEntSchema(
  {
    // --------------------
    // Core User & Session Models
    // --------------------
    users: defineEnt({
      // Profile fields
      name: v.optional(v.string()),
      bio: v.optional(v.string()),
      image: v.optional(v.string()),

      role: v.optional(v.string()),

      // Timestamps
      deletedAt: v.optional(v.number()),
    })
      .field('emailVerified', v.boolean(), { default: false })
      .field('email', v.string(), { unique: true }),

    // --------------------
    // Todo Model
    // --------------------
    todos: defineEnt({
      title: v.string(),
      description: v.optional(v.string()),
      completed: v.boolean(),
      userId: v.id('users'),
      priority: v.optional(v.union(v.literal('low'), v.literal('medium'), v.literal('high'))),
      dueDate: v.optional(v.number()),
    })
      .index('by_user', ['userId'])
      .index('by_user_completed', ['userId', 'completed'])
      .index('by_completed', ['completed']),
  },
  {
    schemaValidation: true,
  }
);

export default schema;

// Export ent definitions for use throughout the app
export const entDefinitions = getEntDefinitions(schema);
