/* biome-ignore-all lint: compile-time type assertions */

import { useCurrentUser } from './use-current-user';

type IsAny<T> = 0 extends 1 & T ? true : false;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

type CurrentUserData = ReturnType<typeof useCurrentUser>;
type _currentUserDataNotAny = Expect<Equal<false, IsAny<CurrentUserData>>>;
