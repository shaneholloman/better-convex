# CLAUDE.md

## Project Overview

- Project Status: @.claude/docs/project-status.md
- App Design: @.claude/docs/app-design-document.md
- Tech Stack: @.claude/docs/tech-stack.md
- Project Structure: @.claude/docs/project-structure.md

## Development

### Commands

- `pnpm typecheck` - Run TypeScript type checking (must pass without errors) on each task end
- `pnpm lint:fix` - Run ESLint and fix linting errors on precommit (not on each task end)
- DO NOT run `pnpm dev` or `pnpm build` or `pnpm start` - these are manual commands.

### Agents

Specialized sub-agents are automatically picked by Claude. Each operates with its own context window and focused expertise.

**@ References Rule**: When using sub-agents with @ references in the prompt, the sub-agent MUST use the Read tool to read ALL @ referenced files before starting any task. Sub-agents cannot automatically access @ referenced content like the main context can.
