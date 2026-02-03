import type { GenericId } from 'convex/values';

// Shared test fixture types - used across multiple type test files
// These represent the expected types for test data structures

export type UserRow = {
  _id: string;
  _creationTime: number;
  name: string;
  email: string;
  age: number | null;
  cityId: GenericId<'cities'>;
  homeCityId: GenericId<'cities'> | null;
};

export type PostRow = {
  _id: string;
  _creationTime: number;
  title: string;
  content: string;
  authorId: GenericId<'users'> | null;
  published: boolean | null;
};

export type CityRow = {
  _id: string;
  _creationTime: number;
  name: string;
};

export type CommentRow = {
  _id: string;
  _creationTime: number;
  text: string;
  postId: GenericId<'posts'>;
  userId: GenericId<'users'>;
};
