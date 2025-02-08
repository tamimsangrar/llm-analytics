# LLM Analytics Dashboard

A real-time analytics dashboard for monitoring Claude API usage and performance metrics.

## Project Structure
- `/backend` - Express.js server with PostgreSQL database
- `/frontend` - React application with real-time visualizations

## Setup Instructions

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Copy and fill in your environment variables
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: Your Claude API key

### Frontend
- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: Backend WebSocket URL

## Deployment
- Backend: Deployed on Render
- Frontend: Deployed on Netlify