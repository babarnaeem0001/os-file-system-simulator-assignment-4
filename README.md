# OS File System Simulator - Assignment 4

Interactive web application for **CS313 Operating System Concepts, Assignment 4:
File System Simulation**.

## Team Members

| Name | Student ID |
| --- | --- |
| Hamid Saleem | 9061 |
| Babar Naeem | 8963 |
| Muhammad Sabeel Khan | 8926 |
| Abdul Sami | 8929 |

## Assignment Scope

This project implements only Assignment 4 from the provided brief. It simulates:

- File creation, deletion, reading, and writing.
- Contiguous, linked, and indexed file allocation.
- A disk block map with index/data block distinction.
- Disk usage, free blocks, fragmentation, access time, active locks, and waiting requests.
- Process-based file access through read/write locks.
- Shared-file conflict scenarios with deadlock detection and recovery.

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Vercel-compatible route handler backend at `/api/filesystem`

## Getting Started

Install dependencies and run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Backend Contract

The frontend posts the current simulation state and a simulation action to:

```text
POST /api/filesystem
```

The route handler returns the next state, including updated disk blocks, locks,
requests, metrics, deadlock cycles, and event logs. This keeps the app deployable
on Vercel serverless infrastructure without requiring a database.

## Verification

```bash
npm run lint
npm run build
```

## Deploy on Vercel

Push the repository to GitHub, import it into Vercel, and keep the default Next.js
settings. Vercel automatically builds the frontend and route handler backend.
