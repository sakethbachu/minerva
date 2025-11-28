#!/bin/bash
# Setup script for pre-commit hooks

set -e

echo "🔧 Setting up pre-commit hooks..."

# Check if .githooks directory exists
if [ ! -d ".githooks" ]; then
    echo "❌ Error: .githooks directory not found"
    echo "   Make sure you're running this from the repository root"
    exit 1
fi

# Clean up old hook from .git/hooks/ if it exists (Option 1: single source of truth)
if [ -f ".git/hooks/pre-commit" ]; then
    echo "🧹 Removing old hook from .git/hooks/ (using .githooks/ instead)..."
    rm .git/hooks/pre-commit
    echo "✅ Cleaned up old hook"
fi

# Method 1: Use git's core.hooksPath (recommended - no copying needed)
echo "📌 Configuring git to use .githooks directory..."
git config core.hooksPath .githooks

# Make sure the hook is executable
chmod +x .githooks/pre-commit

echo "✅ Git hooks configured to use .githooks directory"
echo "   (No copying needed - git will use hooks directly from .githooks/)"

# Install Python dependencies
if [ -d "python-service" ]; then
    echo "📦 Installing Python dependencies (including ruff and mypy)..."
    cd python-service
    pip3 install -r requirements.txt
    cd ..
    echo "✅ Dependencies installed"
else
    echo "❌ Error: python-service directory not found"
    exit 1
fi

echo ""
echo "🎉 Setup complete! Pre-commit hooks are now active."
echo ""
echo "The hook will automatically run:"
echo "  - ruff check (linting)"
echo "  - ruff format (formatting)"
echo "  - mypy (type checking)"
echo ""
echo "To test, try committing a Python file:"
echo "  git add python-service/main.py"
echo "  git commit -m 'test commit'"

