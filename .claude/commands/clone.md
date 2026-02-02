make sure we maximize mirroring drizzle! dont forget all ts answers are in drizzle repo, dig into it when needed. they master more typescript than you. drizzle has many db integrtions so just pick the best one (postgres?) making sure we mirror all typing magic. - find what we did differenlty - fix one at a time, if you can't fix it, let me know what is different from drizzle that you're missing - dig into https://github.com/get-convex/convex-backend and https://github.com/get-convex/convex-ents if you need more insights -
SAME for testing / type testing - DO copy ALL the relevant tests drizzle has, for example we started this in @convex/test-types/ - so the methodology should also scan drizzle testing. they have great coverage. but when you need to test convex part, see convex-test skill and dig convex-backend/npm-packages tests.

Anytime when planning, use dig skill https://github.com/drizzle-team/drizzle-orm.git and https://github.com/get-convex/convex-ents.git and any relevant github repos to clone the code and analyze the code, especially about TypeScript patterns and generics. Assume your TS skills are limited and those repositories have better quality TS code. We don't want to reinvent the wheel, but we want the closest API to Drizzle. Convex Ents is an example of success mapping Convex db to an ORM, so you can look at how they type when needed.

at the end of each package change, make sure you didn't break the types:

- `bun typecheck` at root
- `bun run test` at root
