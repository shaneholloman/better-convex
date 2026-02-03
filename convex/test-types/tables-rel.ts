import {
  boolean,
  convexTable,
  defineRelations,
  id,
  integer,
  text,
} from 'better-convex/orm';
import { type Equal, Expect } from './utils';

// Test schema following Drizzle v1 relations patterns
export const users = convexTable('users', {
  name: text().notNull(),
  email: text().notNull(),
  age: integer(),
  cityId: id('cities').notNull(),
  homeCityId: id('cities'),
});

type UsersTableName = typeof users._.name;
Expect<Equal<UsersTableName, 'users'>>;

export const cities = convexTable('cities', {
  name: text().notNull(),
});

export const posts = convexTable('posts', {
  title: text().notNull(),
  content: text().notNull(),
  authorId: id('users'),
  published: boolean(),
});

export const comments = convexTable('comments', {
  postId: id('posts').notNull(),
  authorId: id('users'),
  text: text().notNull(),
});

export const books = convexTable('books', {
  name: text().notNull(),
});

export const bookAuthors = convexTable('bookAuthors', {
  bookId: id('books').notNull(),
  authorId: id('users').notNull(),
  role: text().notNull(),
});

// Self-referential relations
export const node = convexTable('node', {
  parentId: id('node'),
  leftId: id('node'),
  rightId: id('node'),
});

export const relations = defineRelations(
  {
    users,
    cities,
    posts,
    comments,
    books,
    bookAuthors,
    node,
  },
  (r) => ({
    users: {
      city: r.one.cities({
        from: r.users.cityId,
        to: r.cities._id,
        alias: 'UsersInCity',
      }),
      homeCity: r.one.cities({
        from: r.users.homeCityId,
        to: r.cities._id,
      }),
      posts: r.many.posts({
        from: r.users._id,
        to: r.posts.authorId,
      }),
      comments: r.many.comments({
        from: r.users._id,
        to: r.comments.authorId,
      }),
    },
    cities: {
      users: r.many.users({
        from: r.cities._id,
        to: r.users.cityId,
        alias: 'UsersInCity',
      }),
    },
    posts: {
      author: r.one.users({
        from: r.posts.authorId,
        to: r.users._id,
      }),
      comments: r.many.comments({
        from: r.posts._id,
        to: r.comments.postId,
      }),
    },
    comments: {
      post: r.one.posts({
        from: r.comments.postId,
        to: r.posts._id,
      }),
      author: r.one.users({
        from: r.comments.authorId,
        to: r.users._id,
      }),
    },
    books: {
      authors: r.many.users({
        from: r.books._id.through(r.bookAuthors.bookId),
        to: r.users._id.through(r.bookAuthors.authorId),
      }),
    },
    bookAuthors: {
      book: r.one.books({
        from: r.bookAuthors.bookId,
        to: r.books._id,
      }),
      author: r.one.users({
        from: r.bookAuthors.authorId,
        to: r.users._id,
      }),
    },
    node: {
      parent: r.one.node({
        from: r.node.parentId,
        to: r.node._id,
      }),
      left: r.one.node({
        from: r.node.leftId,
        to: r.node._id,
      }),
      right: r.one.node({
        from: r.node.rightId,
        to: r.node._id,
      }),
    },
  })
);

type UsersRelationKeys = keyof typeof relations.users.relations;
type ExpectedUsersRelationKeys = 'city' | 'homeCity' | 'posts' | 'comments';
Expect<Equal<UsersRelationKeys, ExpectedUsersRelationKeys>>;
