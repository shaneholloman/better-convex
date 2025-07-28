'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCurrentUser } from '@/lib/convex/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/convex/auth-client';
import { usePublicPaginatedQuery, useAuthMutation } from '@/lib/convex/hooks';
import { api } from '@convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';

export default function Home() {
  const user = useCurrentUser();

  // Fetch paginated todos
  const {
    data: todosData,
    hasNextPage,
    isLoading: todosLoading,
    isFetchingNextPage,
    fetchNextPage,
  } = usePublicPaginatedQuery(api.todos.list, {}, { initialNumItems: 10 });

  // Generate sample todos mutation
  const generateSampleTodos = useAuthMutation(api.todos.generateSampleTodos);
  const toggleCompleted = useAuthMutation(api.todos.toggleCompleted);
  const removeTodo = useAuthMutation(api.todos.remove);
  const updateTodo = useAuthMutation(api.todos.update);

  // State for editing
  const [editingId, setEditingId] = useState<Id<'todos'> | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleSignOut = () => {
    signOut();
  };

  const handleGenerateSample = () => {
    toast.promise(generateSampleTodos.mutateAsync({}), {
      loading: 'Generating sample todos...',
      success: (result) => `Created ${result.created} sample todos!`,
      error: (e) => e.data?.message ?? 'Failed to generate sample todos',
    });
  };

  const handleToggleTodo = (todoId: Id<'todos'>) => {
    if (!user?.id) return;
    toggleCompleted.mutate({ id: todoId });
  };

  const handleDeleteTodo = (todoId: Id<'todos'>) => {
    if (!user?.id) return;
    removeTodo.mutate({ id: todoId });
  };

  const handleStartEdit = (todoId: Id<'todos'>, title: string) => {
    if (!user?.id) return;
    setEditingId(todoId);
    setEditingTitle(title);
  };

  const handleTitleChange = (todoId: Id<'todos'>, newTitle: string) => {
    if (!user?.id) return;
    setEditingTitle(newTitle);
    // Save on every change
    updateTodo.mutate({ id: todoId, title: newTitle });
  };

  const handleStopEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <div className="min-h-screen p-8 pb-20 font-sans">
      <main className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
          />

          {user?.id ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Todo List</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse through all todos with pagination
              </p>
            </div>
            {user?.id && (
              <Button
                onClick={handleGenerateSample}
                disabled={generateSampleTodos.isPending}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Sample
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {todosLoading ? (
            // Show skeleton loading state
            Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
              />
            ))
          ) : todosData && todosData.length > 0 ? (
            todosData.map((todo) => (
              <div
                key={todo._id}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <button
                  onClick={() => handleToggleTodo(todo._id)}
                  className="flex-shrink-0 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                  disabled={!user?.id || todo.userId !== user?.id}
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 transition-colors hover:text-green-700" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400 transition-colors hover:text-gray-600" />
                  )}
                </button>

                {editingId === todo._id &&
                user?.id &&
                todo.userId === user.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) =>
                      handleTitleChange(todo._id, e.target.value)
                    }
                    onBlur={handleStopEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault();
                        handleStopEdit();
                      }
                    }}
                    className={`h-5 w-full border-none bg-transparent text-sm outline-none focus:ring-0 focus:outline-none ${
                      todo.completed ? 'text-gray-500 line-through' : ''
                    }`}
                    autoFocus
                  />
                ) : (
                  <p
                    className={`truncate text-sm ${todo.completed ? 'text-gray-500 line-through' : ''} ${
                      user?.id && todo.userId === user.id ? 'cursor-text' : ''
                    }`}
                    onClick={() =>
                      user?.id &&
                      todo.userId === user.id &&
                      handleStartEdit(todo._id, todo.title)
                    }
                  >
                    {todo.title}
                  </p>
                )}

                <div className="flex-1" />

                <div className="flex flex-shrink-0 items-center gap-2">
                  {todo.priority && (
                    <Badge
                      variant={
                        todo.priority === 'high'
                          ? 'destructive'
                          : todo.priority === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                      className="px-1.5 py-0 text-xs"
                    >
                      {todo.priority[0].toUpperCase()}
                    </Badge>
                  )}
                  {todo.dueDate && (
                    <span className="text-xs text-gray-500">
                      {new Date(todo.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {todo.user && (
                    <span className="text-xs text-gray-400">
                      {todo.user.name?.split(' ')[0] ||
                        todo.user.email.split('@')[0]}
                    </span>
                  )}
                  {user?.id && todo.userId === user.id && (
                    <button
                      onClick={() => handleDeleteTodo(todo._id)}
                      className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 focus:opacity-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:hover:bg-red-900/20"
                      aria-label="Delete todo"
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">No todos found</div>
          )}
        </div>

        {hasNextPage && (
          <div className="mt-6 text-center">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
            >
              {isFetchingNextPage ? 'Loading more...' : 'Load more'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
