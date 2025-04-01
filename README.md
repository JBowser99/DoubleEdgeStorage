# 🚀 Double Edge Web App

A modern React + Firebase web application with secure authentication, GCP bucket integration, and admin control dashboard.

## 🔐 What’s Included
- Firebase Authentication
- Firestore + Storage integration
- Admin-only pages (role-based access)
- Upload to & download from GCP Cloud Storage
- Protected routes
- Modular components

## 📦 Stack
- React (TypeScript or JavaScript)
- Firebase (Auth, Firestore, Functions, Storage)
- Google Cloud Platform (Coldline bucket)
- Tailwind CSS

## 🔒 Security Notice
This repo **excludes the `/functions` folder**, which contains private backend logic and sensitive GCP configurations.

To replicate the backend:
1. Set up Firebase Functions locally
2. Run:


3. Deploy using `firebase deploy --only functions`

## 🛠 Setup Instructions

1. Clone the repo  
2. Create a `.env` file:

3. Install dependencies:

```bash
npm install

Run webapp:
npm run dev
