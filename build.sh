#!/bin/bash
set -o errexit

echo "Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel

echo "Installing production dependencies..."
pip install --no-cache-dir -r back-end/requirements.txt
