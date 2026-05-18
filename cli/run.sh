#!/usr/bin/env bash
# Start Mini Rollup CLI (auto-starts backend if needed)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"
VENV="$BACKEND_DIR/venv"

if [ ! -d "$VENV" ]; then
    echo "Creating virtualenv..."
    python3 -m venv "$VENV"
fi

source "$VENV/bin/activate"

# Install CLI deps into backend venv if needed
pip install -q -r "$SCRIPT_DIR/requirements.txt"

cd "$SCRIPT_DIR"
PYTHONPATH="$BACKEND_DIR:$SCRIPT_DIR" python main.py
