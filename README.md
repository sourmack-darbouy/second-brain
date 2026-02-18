# 🧠 Second Brain

A personal knowledge management system built with Next.js.

## Features

- **Authentication** - Password-protected access
- **Dashboard** - Overview of memories, tasks, and recent documents
- **Memories** - Long-term and daily notes
- **Documents** - Store and browse important files
- **Tasks** - Priority-based task management

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Upstash Redis

## Deploy on Vercel

### 1. Create Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Deploy to Vercel

1. Push this repo to GitHub
2. Import to Vercel
3. Add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy!

## Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your Upstash credentials to .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage with Alfred (OpenClaw)

This Second Brain is designed to work with Alfred, your AI assistant. Alfred can:
- Add memories and tasks
- Help you review and organize your knowledge
- Send daily briefings summaries

---

Built with ❤️ for personal knowledge management
