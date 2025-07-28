import { z } from 'zod';
import { zid } from 'convex-helpers/server/zod';

import type { Id } from './_generated/dataModel';
import { createPublicPaginatedQuery, createAuthMutation, createPublicQuery, createPublicMutation } from './functions';

// List todos with pagination
export const list = createPublicPaginatedQuery()({
  args: {
    userId: zid('users').optional(),
    completed: z.boolean().optional(),
  },
  handler: async (ctx, args) => {
    // Start with the appropriate query based on user filter
    const baseQuery = args.userId 
      ? ctx.table('todos', 'by_user', (q) => q.eq('userId', args.userId!))
      : ctx.table('todos');
    
    // Apply completed filter if specified
    const filteredQuery = args.completed !== undefined 
      ? baseQuery.filter((q) => q.eq(q.field('completed'), args.completed))
      : baseQuery;
    
    // Paginate results ordered by creation time (newest first)
    return await filteredQuery
      .order('desc')
      .paginate(args.paginationOpts)
      .map(async (todo) => ({
        ...todo.doc(),
        user: await ctx.table('users').get(todo.userId),
      }));
  },
});

// Get a single todo
export const get = createPublicQuery()({
  args: {
    id: zid('todos'),
  },
  returns: z.object({
    _id: zid('todos'),
    _creationTime: z.number(),
    title: z.string(),
    description: z.string().optional(),
    completed: z.boolean(),
    userId: zid('users'),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueDate: z.number().optional(),
    user: z.object({
      _id: zid('users'),
      name: z.string().optional(),
      email: z.string(),
      image: z.string().optional(),
    }).nullable(),
  }).nullable(),
  handler: async (ctx, args) => {
    const todo = await ctx.table('todos').get(args.id);
    if (!todo) return null;
    
    const user = await ctx.table('users').get(todo.userId);
    return {
      ...todo.doc(),
      user: user ? {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
      } : null,
    };
  },
});

// Toggle todo completion
export const toggleCompleted = createAuthMutation()({
  args: {
    id: zid('todos'),
  },
  returns: z.null(),
  handler: async (ctx, args) => {
    const todo = await ctx.table('todos').getX(args.id);
    
    // Check if user owns this todo
    if (todo.userId !== ctx.userId) {
      throw new Error('Unauthorized');
    }
    
    await ctx.table('todos').getX(args.id).patch({
      completed: !todo.completed,
    });
    
    return null;
  },
});

// Create a new todo
export const create = createAuthMutation()({
  args: {
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueDate: z.number().optional(),
  },
  returns: zid('todos'),
  handler: async (ctx, args) => {
    return await ctx.table('todos').insert({
      title: args.title,
      description: args.description,
      completed: false,
      userId: ctx.userId,
      priority: args.priority,
      dueDate: args.dueDate,
    });
  },
});

// Update a todo
export const update = createAuthMutation()({
  args: {
    id: zid('todos'),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
    dueDate: z.number().nullable().optional(),
  },
  returns: z.null(),
  handler: async (ctx, args) => {
    const todo = await ctx.table('todos').getX(args.id);
    
    // Check if user owns this todo
    if (todo.userId !== ctx.userId) {
      throw new Error('Unauthorized');
    }
    
    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description || undefined;
    if (args.priority !== undefined) updateData.priority = args.priority || undefined;
    if (args.dueDate !== undefined) updateData.dueDate = args.dueDate || undefined;
    
    if (Object.keys(updateData).length > 0) {
      await ctx.table('todos').getX(args.id).patch(updateData);
    }
    
    return null;
  },
});

// Delete a todo
export const remove = createAuthMutation()({
  args: {
    id: zid('todos'),
  },
  returns: z.null(),
  handler: async (ctx, args) => {
    const todo = await ctx.table('todos').getX(args.id);
    
    // Check if user owns this todo
    if (todo.userId !== ctx.userId) {
      throw new Error('Unauthorized');
    }
    
    await ctx.table('todos').getX(args.id).delete();
    
    return null;
  },
});

// Generate sample todos data
const getTodosData = (userIds: Id<'users'>[]) => {
  const todos: Array<{
    title: string;
    description?: string;
    completed: boolean;
    userId: Id<'users'>;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: number;
  }> = [];
  const priorities = ['low', 'medium', 'high'] as const;
  const todoTemplates = [
    'Complete project documentation',
    'Review pull request',
    'Fix bug in authentication',
    'Update dependencies',
    'Write unit tests',
    'Refactor legacy code',
    'Optimize database queries',
    'Implement new feature',
    'Design API endpoints',
    'Deploy to staging',
    'Meeting with team',
    'Code review session',
    'Update README file',
    'Fix responsive design issues',
    'Add error handling',
    'Improve performance',
    'Setup CI/CD pipeline',
    'Migrate to new framework',
    'Create user documentation',
    'Security audit',
  ];

  // Generate 100 todos
  for (let i = 0; i < 100; i++) {
    const template = todoTemplates[i % todoTemplates.length];
    const userIndex = i % userIds.length;
    const priorityIndex = i % priorities.length;

    todos.push({
      title: `${template} #${i + 1}`,
      description:
        i % 3 === 0
          ? `Additional details for todo #${i + 1}. This task requires careful attention and should be completed soon.`
          : undefined,
      completed: i % 5 === 0, // 20% completed
      userId: userIds[userIndex],
      priority: priorities[priorityIndex],
      dueDate: i % 4 === 0 ? Date.now() + 86400000 * (i % 30) : undefined, // 25% have due dates
    });
  }

  return todos;
};

// Generate sample todos (auth mutation - only for current user)
export const generateSampleTodos = createAuthMutation()({
  args: {},
  returns: z.object({
    created: z.number(),
  }),
  handler: async (ctx) => {
    // Generate todos only for the current user
    const userId = ctx.userId;
    const todosData = getTodosData([userId]);

    // Insert todos in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < todosData.length; i += batchSize) {
      const batch = todosData.slice(i, i + batchSize);
      await ctx.table('todos').insertMany(batch);
    }

    return { created: todosData.length };
  },
});