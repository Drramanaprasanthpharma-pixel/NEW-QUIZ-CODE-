# Pulse Quiz

A small real-time quiz room built with React, Vite, Firebase Authentication, and Firestore.

## Setup

1. Create a Firebase project, enable **Email/Password Authentication** and **Cloud Firestore**.
2. Copy `.env.example` to `.env` and add the web app configuration from Firebase.
3. Publish `firestore.rules` with the Firebase CLI or paste it into Firestore Rules.
4. Create a host account in Firebase Authentication, then run `npm run dev`.

Hosts use `/host`; players use `/play`. Game and player sessions are kept in `sessionStorage` so a refresh reconnects to the room.

## Vercel

Add these six variables in Vercel Project Settings for the Production environment, then redeploy:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

The app still renders its home page if these variables are missing, but Firebase-backed host and player rooms remain unavailable until they are configured.