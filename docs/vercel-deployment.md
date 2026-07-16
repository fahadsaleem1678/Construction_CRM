# Vercel Deployment Guide

This repo is set up for:

1. GitHub Actions CI on every push/PR to `main`
2. Vercel Git-based auto deployments for the frontend in `apps/web`

## What deploys where

- Frontend: Vercel
- Database: Supabase
- Backend API: needs a separate public host

The frontend cannot work in production without a live API URL because `apps/web` calls the Express API through `VITE_API_URL`.

## CI pipeline

GitHub Actions workflow:

- `.github/workflows/ci.yml`

It runs:

- workspace install
- shared types build
- API build + tests
- web build + tests

## Vercel setup

Create a Vercel project connected to this GitHub repository.

Recommended project settings:

- Framework Preset: `Vite`
- Root Directory: `apps/web`
- Production Branch: `main`

Once the repo is linked, Vercel will automatically:

- create preview deployments for pull requests / branch pushes
- create a production deployment when changes land on `main`

## Environment variables to configure in Vercel

Set these in the Vercel project:

- `VITE_API_URL`

Example:

```text
https://your-api-domain.example.com/api
```

Do not point this at localhost.

## Backend requirements

Before the frontend production deployment is truly usable, we need the API deployed somewhere public, for example:

- Railway
- Render
- Fly.io

That backend host must have production environment variables configured, including:

- `DATABASE_URL`
- `SUPABASE_AUTH_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_ORIGIN`
- `DOCUMENT_STORAGE_DRIVER`
- `R2_ENDPOINT`
- `R2_REGION`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`

For production, `APP_ORIGIN` must match the deployed frontend domain.

## What I still need from you

To complete live deployment, I need:

1. A decision on where the Express API will be hosted
2. Access to or screenshots/values from the Vercel project setup screen
3. The final production API URL once the backend host is chosen
4. If you want a custom domain on Vercel, the domain name

## Recommended rollout order

1. Link the GitHub repo to Vercel with root directory `apps/web`
2. Deploy the backend API to a public host
3. Set `VITE_API_URL` in Vercel
4. Set backend `APP_ORIGIN` to the Vercel domain
5. Push to `main` and verify the CI workflow and Vercel production deployment
