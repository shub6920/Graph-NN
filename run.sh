#!/usr/bin/env bash
set -e

echo "======================================================================"
echo " Comparative Analysis: GNN vs. Traditional Machine Learning Lab"
echo "======================================================================"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt
else
    source venv/bin/activate
fi

if [ ! -d "frontend/dist" ]; then
    echo "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

echo "Starting Unified Research Dashboard on http://127.0.0.1:8090 ..."
cd backend
python3 main.py
