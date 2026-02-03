import {
  boolean,
  convexTable,
  id,
  integer,
  relations,
  text,
} from 'better-convex/orm';
import { type Equal, Expect } from './utils';

// Test schema following Drizzle pattern with builders
export const users = convexTable('users', {
  name: text().notNull(),
  email: text().notNull(),
  age: integer(),
  cityId: id('cities').notNull(),
  homeCityId: id('cities'),
});

type UsersTableName = typeof users._.name;
Expect<Equal<UsersTableName, 'users'>>;

export const usersRelations = relations(users, ({ one, many }) => ({
  city: one(cities, {
    fields: [users.cityId],
    references: [cities._id],
    relationName: 'UsersInCity',
  }),
  homeCity: one(cities, {
    fields: [users.homeCityId],
    references: [cities._id],
  }),
  posts: many(posts),
  comments: many(comments),
}));

type UsersRelationKeys = keyof (typeof usersRelations)['_config'];
type ExpectedUsersRelationKeys = 'city' | 'homeCity' | 'posts' | 'comments';
Expect<Equal<UsersRelationKeys, ExpectedUsersRelationKeys>>;

type UsersRelationsTableName = typeof usersRelations._tableName;
Expect<Equal<UsersRelationsTableName, 'users'>>;

type UsersRelationsIsRelations =
  typeof usersRelations extends import('better-convex/orm').Relations<any, any>
    ? true
    : false;
Expect<Equal<UsersRelationsIsRelations, true>>;

export const cities = convexTable('cities', {
  name: text().notNull(),
});

export const citiesRelations = relations(cities, ({ many }) => ({
  users: many(users, { relationName: 'UsersInCity' }),
}));

export const posts = convexTable('posts', {
  title: text().notNull(),
  content: text().notNull(),
  authorId: id('users'),
  published: boolean(),
});

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users._id] }),
  comments: many(comments),
}));

export const comments = convexTable('comments', {
  postId: id('posts').notNull(),
  authorId: id('users'),
  text: text().notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts._id] }),
  author: one(users, { fields: [comments.authorId], references: [users._id] }),
}));

export const books = convexTable('books', {
  name: text().notNull(),
});

export const booksRelations = relations(books, ({ many }) => ({
  authors: many(bookAuthors),
}));

export const bookAuthors = convexTable('bookAuthors', {
  bookId: id('books').notNull(),
  authorId: id('users').notNull(),
  role: text().notNull(),
});

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, { fields: [bookAuthors.bookId], references: [books._id] }),
  author: one(users, {
    fields: [bookAuthors.authorId],
    references: [users._id],
  }),
}));

// Self-referential relations
export const node = convexTable('node', {
  parentId: id('node'),
  leftId: id('node'),
  rightId: id('node'),
});

export const nodeRelations = relations(node, ({ one }) => ({
  parent: one(node, { fields: [node.parentId], references: [node._id] }),
  left: one(node, { fields: [node.leftId], references: [node._id] }),
  right: one(node, { fields: [node.rightId], references: [node._id] }),
}));

// Relation typing guards (table name enforcement)
export const invalidRelations = relations(users, ({ one }) => ({
  badFields: one(cities, {
    // @ts-expect-error - fields must come from source table (users)
    fields: [cities.name],
    references: [cities._id],
  }),
  badReferences: one(cities, {
    fields: [users.cityId],
    // @ts-expect-error - references must come from target table (cities)
    references: [users._id],
  }),
}));
