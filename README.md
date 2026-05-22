# Travel Itinerary (MERN) — Scaffold

This workspace contains a starter MERN application that allows users to upload travel booking documents, extract data, and generate AI-powered itineraries.

Folders:
- `server/` — Node.js + Express backend
- `client/` — React frontend

Quick start (local):

1. Backend

  - Edit `server/.env.example` and create `.env` with your values (Mongo URI, JWT secret, `OPENAI_API_KEY`).
  - Install & run:

```powershell
cd "c:\Users\Yash\Desktop\New Task\server"
npm install
npm run dev
```

2. Frontend

```powershell
cd "c:\Users\Yash\Desktop\New Task\client"
npm install
npm start
```

Notes & next steps:
- Configure cloud storage (S3) for uploads in production.
- Configure a managed OCR like Google Vision for better accuracy.
- Replace the OpenAI model string with your preferred model and ensure `OPENAI_API_KEY` is set.
