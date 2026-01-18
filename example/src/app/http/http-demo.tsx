'use client';

import type { Id } from '@convex/dataModel';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useState } from 'react';
import { useCRPC } from '@/lib/convex/crpc';

/**
 * Demo page showcasing useCRPC HTTP patterns with TanStack Query.
 *
 * Demonstrates:
 * - queryOptions for GET requests (health check, list todos)
 * - mutationOptions for POST/PATCH/DELETE requests
 * - Cache invalidation via queryKey
 * - Loading and error states
 * - Form submission patterns
 */
export function HttpDemo() {
  const crpc = useCRPC();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');

  // Todos query options
  const todosQueryOpts = crpc.http.todos.list.queryOptions({ limit: 10 });

  // 1. Health check (GET, public)
  const health = useSuspenseQuery(crpc.http.health.queryOptions({}));

  // 2. List todos (GET, public)
  const todos = useSuspenseQuery(todosQueryOpts);

  // 3. Create todo (POST, auth required)
  const createTodo = useMutation(
    crpc.http.todos.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(crpc.http.todos.list.queryFilter());
        setNewTitle('');
      },
    })
  );

  // 4. Update todo (PATCH, auth required) - toggle completed
  const updateTodo = useMutation(
    crpc.http.todos.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(crpc.http.todos.list.queryFilter());
      },
    })
  );

  // 5. Delete todo (DELETE, auth required)
  const deleteTodo = useMutation(
    crpc.http.todos.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(crpc.http.todos.list.queryFilter());
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTodo.mutate({ title: newTitle.trim() });
  };

  const handleToggle = (id: Id<'todos'>, completed: boolean) => {
    updateTodo.mutate({ id, completed: !completed });
  };

  const handleDelete = (id: Id<'todos'>) => {
    deleteTodo.mutate({ id });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-8 font-bold text-2xl">HTTP cRPC Demo</h1>

      {/* Health Check Section */}
      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-3 font-semibold text-lg">Health Check (GET)</h2>
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            Status:{' '}
            <span className="font-medium text-foreground">
              {health.data.status}
            </span>
          </span>
          <span className="text-muted-foreground">
            Timestamp:{' '}
            <span className="font-mono text-foreground">
              {health.data.timestamp}
            </span>
          </span>
        </div>
      </section>

      {/* Create Todo Form */}
      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-3 font-semibold text-lg">Create Todo (POST)</h2>
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            className="flex-1 rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={createTodo.isPending}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter todo title..."
            type="text"
            value={newTitle}
          />
          <button
            className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground text-sm disabled:opacity-50"
            disabled={createTodo.isPending || !newTitle.trim()}
            type="submit"
          >
            {createTodo.isPending ? 'Creating...' : 'Add Todo'}
          </button>
        </form>
        {createTodo.error && (
          <p className="mt-2 text-destructive text-sm">
            Error: {createTodo.error.message}
          </p>
        )}
      </section>

      {/* Todos List */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold text-lg">
          Todo List (GET + PATCH + DELETE)
        </h2>
        {todos.data.length === 0 ? (
          <p className="text-muted-foreground">
            No todos yet. Create one above!
          </p>
        ) : (
          <ul className="space-y-2">
            {todos.data.map((todo) => (
              <li
                className="flex items-center gap-3 rounded border px-3 py-2"
                key={todo._id}
              >
                <button
                  aria-label={
                    todo.completed ? 'Mark incomplete' : 'Mark complete'
                  }
                  className="size-5 rounded border text-xs disabled:opacity-50"
                  disabled={
                    updateTodo.isPending &&
                    updateTodo.variables?.id === todo._id
                  }
                  onClick={() => handleToggle(todo._id, todo.completed)}
                  type="button"
                >
                  {todo.completed && '✓'}
                </button>
                <span
                  className={`flex-1 ${todo.completed ? 'text-muted-foreground line-through' : ''}`}
                >
                  {todo.title}
                </span>
                {todo.description && (
                  <span className="text-muted-foreground text-sm">
                    {todo.description}
                  </span>
                )}
                <button
                  aria-label="Delete todo"
                  className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                  disabled={
                    deleteTodo.isPending &&
                    deleteTodo.variables?.id === todo._id
                  }
                  onClick={() => handleDelete(todo._id)}
                  type="button"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Code Examples */}
      <section className="mt-8 rounded-lg border p-4">
        <h2 className="mb-3 font-semibold text-lg">Code Examples</h2>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
          {`// Hook setup
const crpc = useCRPC();
const queryClient = useQueryClient();

// GET requests → useSuspenseQuery (data is always defined)
const health = useSuspenseQuery(crpc.http.health.queryOptions({}));
const todos = useSuspenseQuery(crpc.http.todos.list.queryOptions({ limit: 10 }));

// POST/PATCH/DELETE → mutationOptions
const createTodo = useMutation({
  ...crpc.http.todos.create.mutationOptions(),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: crpc.http.todos.list.queryKey(),
    });
  },
});

// Trigger mutation
createTodo.mutate({ title: 'New Todo' });`}
        </pre>
      </section>
    </div>
  );
}
