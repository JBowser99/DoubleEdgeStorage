# 🚀 Double Edge Web App:

A modern React + Firebase web application with secure authentication, GCP bucket integration, and admin control dashboard.

## 🔐 What’s Included:
- Firebase Role Based Authentication. Regular and Admin Users.
- Firestore + Storage integration
- Admin-only pages (role-based access)
- Upload to & download from GCP Cloud Storage
- Protected routes
- Modular components

## 📦 Stack:
- React (TypeScript or JavaScript)
- Firebase (Auth, Firestore, Functions, Storage)
- Google Cloud Platform (Coldline bucket)
- Tailwind CSS

## 🔒 Security Notice:
This repo **excludes the `/functions` folder**, which contains private admin only cloud functions for admin controls backend logic and sensitive GCP communication configuration.

## 🛠 Replicated the Backend Instructions:
1. Set up a new firebase project name it double edge storage or whatever you like.
2. 


3. Deploy using `firebase deploy --only functions`

## 🛠 Setup Instructions:
1. Clone the repo  
2. Create a `.env` file:

3. Install dependencies:

```bash
npm install

Run webapp:
npm run dev
