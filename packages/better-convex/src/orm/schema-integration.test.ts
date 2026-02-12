import { convexTable, defineSchema, text } from './index';

test('convexTable works with defineSchema()', () => {
  const users = convexTable('users', {
    name: text().notNull(),
    email: text().notNull(),
  });

  const posts = convexTable('posts', {
    title: text().notNull(),
    content: text().notNull(),
  });

  // Should not throw
  const schema = defineSchema({
    users,
    posts,
  });

  expect(schema).toBeDefined();
  expect(schema.tables).toHaveProperty('users');
  expect(schema.tables).toHaveProperty('posts');
});

test('convexTable validator is compatible with Convex schema', () => {
  const users = convexTable('users', {
    name: text().notNull(),
    email: text().notNull(),
  });

  // Should have validator property
  expect(users.validator).toBeDefined();
  expect(users.tableName).toBe('users');
});

test.each(['id', '_id', '_creationTime'])(
  'convexTable rejects reserved column name: %s',
  (columnName) => {
    expect(() =>
      convexTable('users', {
        [columnName]: text().notNull(),
      } as Record<string, ReturnType<typeof text>>)
    ).toThrow(/reserved/i);
  }
);
