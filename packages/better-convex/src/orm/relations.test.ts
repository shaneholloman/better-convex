/**
 * M2 Relations Layer - v1 Validation Tests
 */
/** biome-ignore-all lint/performance/useTopLevelRegex: inline regex assertions are intentional in tests. */

import {
  convexTable,
  defineRelations,
  extractRelationsConfig,
  id,
  text,
} from './index';

describe('M2 Relations Layer (v1)', () => {
  describe('Relation Definition', () => {
    it('should create one() relation', () => {
      const users = convexTable('users', {
        name: text().notNull(),
        profileId: id('profiles').notNull(),
      });

      const profiles = convexTable('profiles', {
        bio: text().notNull(),
      });

      const relations = defineRelations({ users, profiles }, (r) => ({
        users: {
          profile: r.one.profiles({
            from: r.users.profileId,
            to: r.profiles._id,
          }),
        },
      }));

      expect(relations).toBeDefined();
      expect(relations.users.table).toBe(users);
      expect(relations.users.relations.profile).toBeDefined();
    });

    it('should create many() relation', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const posts = convexTable('posts', {
        title: text().notNull(),
        authorId: id('users').notNull(),
      });

      const relations = defineRelations({ users, posts }, (r) => ({
        users: {
          posts: r.many.posts({
            from: r.users._id,
            to: r.posts.authorId,
          }),
        },
      }));

      expect(relations).toBeDefined();
      expect(relations.users.table).toBe(users);
      expect(relations.users.relations.posts).toBeDefined();
    });

    it('should create bidirectional relations', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const posts = convexTable('posts', {
        title: text().notNull(),
        authorId: id('users').notNull(),
      });

      const relations = defineRelations({ users, posts }, (r) => ({
        users: {
          posts: r.many.posts(),
        },
        posts: {
          author: r.one.users({
            from: r.posts.authorId,
            to: r.users._id,
          }),
        },
      }));

      expect(relations.users.relations.posts).toBeDefined();
      expect(relations.posts.relations.author).toBeDefined();
    });
  });

  describe('Schema Extraction', () => {
    it('should extract simple one-to-many relation', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const posts = convexTable('posts', {
        title: text().notNull(),
        authorId: id('users').notNull(),
      });

      const relations = defineRelations({ users, posts }, (r) => ({
        users: {
          posts: r.many.posts({
            from: r.users._id,
            to: r.posts.authorId,
          }),
        },
        posts: {
          author: r.one.users({
            from: r.posts.authorId,
            to: r.users._id,
          }),
        },
      }));

      const edges = extractRelationsConfig(relations);

      expect(edges).toHaveLength(2);

      const postsEdge = edges.find((e) => e.edgeName === 'posts');
      expect(postsEdge).toMatchObject({
        sourceTable: 'users',
        edgeName: 'posts',
        targetTable: 'posts',
        cardinality: 'many',
        sourceFields: ['_id'],
        targetFields: ['authorId'],
      });

      const authorEdge = edges.find((e) => e.edgeName === 'author');
      expect(authorEdge).toMatchObject({
        sourceTable: 'posts',
        edgeName: 'author',
        targetTable: 'users',
        cardinality: 'one',
        sourceFields: ['authorId'],
        targetFields: ['_id'],
      });
    });

    it('should detect inverse relations', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const posts = convexTable('posts', {
        title: text().notNull(),
        authorId: id('users').notNull(),
      });

      const relations = defineRelations({ users, posts }, (r) => ({
        users: {
          posts: r.many.posts(),
        },
        posts: {
          author: r.one.users({
            from: r.posts.authorId,
            to: r.users._id,
          }),
        },
      }));

      const edges = extractRelationsConfig(relations);

      const postsEdge = edges.find((e) => e.edgeName === 'posts');
      const authorEdge = edges.find((e) => e.edgeName === 'author');

      expect(postsEdge?.inverseEdge).toBe(authorEdge);
      expect(authorEdge?.inverseEdge).toBe(postsEdge);
    });
  });

  describe('Validation', () => {
    it('should reject relation name that collides with column', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const posts = convexTable('posts', {
        title: text().notNull(),
        authorId: id('users').notNull(),
      });

      expect(() => {
        defineRelations({ users, posts }, (r) => ({
          users: {
            name: r.many.posts(),
          },
        }));
      }).toThrow(/relation name collides/);
    });

    it('should reject undefined target table', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const posts = convexTable('posts', {
        title: text().notNull(),
        authorId: id('users').notNull(),
      });

      const relations = defineRelations({ users, posts }, (r) => ({
        posts: {
          author: r.one.users({
            from: r.posts.authorId,
            to: r.users._id,
          }),
        },
      }));

      const invalidRelations = {
        posts: relations.posts,
      } as any;

      expect(() => {
        extractRelationsConfig(invalidRelations);
      }).toThrow(/references undefined table/);
    });

    it('should reject columns from the wrong table', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const profiles = convexTable('profiles', {
        bio: text().notNull(),
      });

      expect(() => {
        defineRelations({ users, profiles }, (r) => ({
          users: {
            profile: r.one.profiles({
              // Wrong table: using profiles._id as source
              from: r.profiles._id,
              to: r.profiles._id,
            }),
          },
        }));
      }).toThrow(/from" columns must belong/);
    });

    it('should reject circular dependencies', () => {
      const users = convexTable('users', {
        name: text().notNull(),
        managerId: id('users').notNull(),
      });

      const relations = defineRelations({ users }, (r) => ({
        users: {
          manager: r.one.users({
            from: r.users.managerId,
            to: r.users._id,
          }),
        },
      }));

      expect(() => {
        extractRelationsConfig(relations);
      }).toThrow(/Circular dependency/);
    });
  });

  describe('Alias Disambiguation', () => {
    it('should use alias for disambiguation', () => {
      const users = convexTable('users', {
        name: text().notNull(),
      });

      const posts = convexTable('posts', {
        title: text().notNull(),
        authorId: id('users').notNull(),
        editorId: id('users').notNull(),
      });

      const relations = defineRelations({ users, posts }, (r) => ({
        posts: {
          author: r.one.users({
            from: r.posts.authorId,
            to: r.users._id,
            alias: 'authored',
          }),
          editor: r.one.users({
            from: r.posts.editorId,
            to: r.users._id,
            alias: 'edited',
          }),
        },
        users: {
          authoredPosts: r.many.posts({
            from: r.users._id,
            to: r.posts.authorId,
            alias: 'authored',
          }),
          editedPosts: r.many.posts({
            from: r.users._id,
            to: r.posts.editorId,
            alias: 'edited',
          }),
        },
      }));

      const edges = extractRelationsConfig(relations);

      const authorEdge = edges.find((e) => e.edgeName === 'author');
      const authoredPostsEdge = edges.find(
        (e) => e.edgeName === 'authoredPosts'
      );

      expect(authorEdge?.inverseEdge).toBe(authoredPostsEdge);
      expect(authoredPostsEdge?.inverseEdge).toBe(authorEdge);
    });
  });
});
