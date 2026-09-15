# Pulse Quiz

A small real-time quiz room built with React, Vite, Firebase Authentication, and Firestore.

## Setup

1. Create a Firebase project, enable **Google Authentication** and **Cloud Firestore**.
2. Copy `.env.example` to `.env` and add the web app configuration from Firebase.
3. Publish `firestore.rules` with the Firebase CLI or paste it into Firestore Rules.
4. In Firebase Console, open **Authentication > Settings > Authorized domains** and add
	`live-quiz.vercel.app`. Add `localhost` for local development if it is not already listed.
5. Run `npm run dev` and sign in with a Google account.

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

`VITE_FIREBASE_AUTH_DOMAIN` must remain the Firebase web app auth domain (for example,
`new-quiz-f5d33.firebaseapp.com`). Do not replace it with the Vercel deployment URL;
deployment domains are configured separately in Firebase's Authorized domains list.