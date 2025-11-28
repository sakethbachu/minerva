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

The pre-commit hook automatically runs:

1. **ruff check** - Linting for Python code
2. **ruff format** - Formatting check
3. **mypy** - Type checking

If any check fails, the commit will be blocked.

## Manual Commands

If you need to run checks manually:

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

## Requirements

Make sure you have the dependencies installed:

```bash
cd python-service
pip install -r requirements.txt
```

The hook requires:
- `ruff` (linting and formatting)
- `mypy` (type checking)

