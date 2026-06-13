#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"

echo "🥒 PickleConnect — Starting up..."
echo ""

# Install dependencies if needed
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo "🚀 Starting backend on http://localhost:3001"
cd backend && node server.js &
BACKEND_PID=$!

sleep 1

echo "🌐 Starting frontend on http://localhost:5173"
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ PickleConnect is running!"
echo "   Open: http://localhost:5173"
echo ""
echo "Demo accounts (password: demo123):"
echo "  jordan@demo.com  — Jordan 'Pickle King' Smith (DUPR 4.5)"
echo "  alex@demo.com    — Alex 'Dink Master' Chen (DUPR 4.2)"
echo "  maria@demo.com   — Maria 'Court Queen' Lopez (DUPR 3.8)"
echo ""
echo "DUPR test IDs: 10001234 · 20005678 · 30009012"
echo ""
echo "Press Ctrl+C to stop both servers"

wait
