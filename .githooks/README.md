# Git Hooks Setup

This directory contains git hooks that are automatically run before commits.

## Setup (First Time)

Run the setup script from the repository root:

```bash
./setup-pre-commit.sh
```

Or manually:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

## What Gets Checked

The pre-commit hook automatically runs checks on staged files:

### Python Files (in `python-service/`)
1. **ruff check** - Linting for Python code (with auto-fix)
2. **ruff format** - Formatting check (with auto-format)
3. **mypy** - Type checking

### TypeScript Files (in `src/`)
1. **ESLint** - Linting for TypeScript code (with auto-fix)
2. **Prettier** - Formatting check (with auto-format)
3. **tsc --noEmit** - TypeScript type checking

**Note:** Python and TypeScript checks run in parallel when both types of files are staged.

If any check fails, the commit will be blocked.

## Manual Commands

### Python Checks

If you need to run Python checks manually:

```bash
# Use python3 -m to avoid PATH issues
cd python-service

# Lint check
python3 -m ruff check .

# Auto-fix linting issues
python3 -m ruff check --fix .

# Format check
python3 -m ruff format --check .

# Auto-format code
python3 -m ruff format .

# Type checking
python3 -m mypy .
```

**Note:** The hook uses `python3 -m` syntax, which works even if `ruff`/`mypy` aren't in your PATH. If you get "command not found" errors when running manually, use `python3 -m` instead.

### TypeScript Checks

If you need to run TypeScript checks manually:

```bash
# From repository root

# Lint check
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format check
npm run format:check

# Auto-format code
npm run format

# Type checking
npm run type-check
```

**Note:** Make sure to run `npm install` first to install dependencies.

## Requirements

### Python Dependencies

Make sure you have the Python dependencies installed:

```bash
cd python-service
pip install -r requirements.txt
```

The hook requires:
- `ruff` (linting and formatting)
- `mypy` (type checking)

### TypeScript Dependencies

Make sure you have the TypeScript dependencies installed:

```bash
# From repository root
npm install
```

The hook requires:
- `eslint` (linting)
- `prettier` (formatting)
- `typescript` (type checking)
- `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` (ESLint TypeScript support)

