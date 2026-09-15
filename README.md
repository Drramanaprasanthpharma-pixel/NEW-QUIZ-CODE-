# Pulse Quiz

A small real-time quiz room built with React, Vite, Firebase Authentication, and Firestore.

## Setup

1. Create a Firebase project, enable **Email/Password Authentication** and **Cloud Firestore**.
2. Copy `.env.example` to `.env` and add the web app configuration from Firebase.
3. Publish `firestore.rules` with the Firebase CLI or paste it into Firestore Rules.
4. Create a host account in Firebase Authentication, then run `npm run dev`.

Hosts use `/host`; players use `/play`. Game and player sessions are kept in `sessionStorage` so a refresh reconnects to the room.