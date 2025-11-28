# Pre-Commit Hooks Setup Guide

## Files That Need to Be Committed to Git

To share pre-commit hooks with your team, commit these files:

### Required Files (Must Commit):

1. **`.githooks/pre-commit`** - The actual hook script
2. **`setup-pre-commit.sh`** - Setup script for new contributors
3. **`python-service/ruff.toml`** - Ruff configuration
4. **`python-service/mypy.ini`** - Mypy configuration
5. **`python-service/requirements.txt`** - Includes ruff and mypy dependencies

### Optional but Recommended:

6. **`.githooks/README.md`** - Documentation for the hooks

## Setup for New Contributors

When someone clones the repo, they need to run:

```bash
# 1. Install Python dependencies (includes ruff and mypy)
cd python-service
pip install -r requirements.txt
cd ..

# 2. Set up git hooks
./setup-pre-commit.sh
```

That's it! The hooks will now run automatically on every commit.

## How It Works

The setup script configures git to use the `.githooks/` directory directly:

```bash
git config core.hooksPath .githooks
```

This means:
- ✅ Hooks are tracked in git (in `.githooks/`)
- ✅ No copying needed - git uses them directly
- ✅ Everyone gets the same hooks automatically
- ✅ Updates to hooks are shared via git pull

## Verify It's Working

Try committing a Python file:

```bash
git add python-service/main.py
git commit -m "test commit"
```

You should see the pre-commit checks run automatically.

## Troubleshooting

If hooks aren't running:

1. Check if hooks are configured:
   ```bash
   git config core.hooksPath
   # Should output: .githooks
   ```

2. Make sure the hook is executable:
   ```bash
   ls -la .githooks/pre-commit
   # Should show: -rwxr-xr-x
   ```

3. Re-run setup:
   ```bash
   ./setup-pre-commit.sh
   ```

