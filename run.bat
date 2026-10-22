@echo off
echo ======================================================================
echo  Comparative Analysis: GNN vs. Traditional Machine Learning Lab
echo ======================================================================

REM Check virtualenv
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    call .\venv\Scripts\activate
    echo Installing backend dependencies...
    pip install -r backend\requirements.txt
) else (
    call .\venv\Scripts\activate
)

REM Build frontend if dist not present
if not exist "frontend\dist" (
    echo Building frontend React application...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

echo Starting Unified Research Dashboard on http://127.0.0.1:8090 ...
cd backend
python main.py
pause
