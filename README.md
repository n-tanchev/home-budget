# HomeBudget 🏠💰

A modern family budget tracker built with React, TypeScript, Tailwind CSS, and shadcn/ui design system. Track income, expenses, bills, subscriptions, debt, savings, and investments — with rich analytics and year-over-year comparisons.

![HomeBudget](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-blue)

## Features

- **Monthly tracking**: Income, expenses, bills/subscriptions, debt payments, savings & investments
- **Custom categories**: Add/remove expense and bill categories from the UI
- **Budget per category**: Set monthly budgets and track spending against them
- **Copy from previous month**: Quickly populate a new month with recurring entries
- **Rich analytics**: Pie charts, bar charts, area charts, trend lines
- **Year-over-year comparison**: Compare any two years side by side
- **Light & Dark theme**: System-aware with manual toggle
- **Data persistence**: LocalStorage by default + optional Firebase cloud sync
- **Import/Export**: JSON backup and restore
- **Mobile-friendly**: Responsive design works on all screen sizes
- **Free to host**: Deploy to Vercel, Netlify, or GitHub Pages

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/home-budget.git
cd home-budget
npm install

# 2. Start development server
npm run dev

# 3. Open http://localhost:5173
```

The app works immediately with **local storage only** — no Firebase setup needed to get started.

---

## Deployment (Free)

### Option A: Vercel (Recommended — easiest)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → "Add New Project"
3. Import your GitHub repository
4. Framework preset: **Vite**
5. If using Firebase, add environment variables in Vercel's project settings
6. Click **Deploy**

Your app will be live at `https://your-project.vercel.app`

### Option B: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → "Add new site" → "Import from Git"
3. Build command: `npm run build`
4. Publish directory: `dist`
5. If using Firebase, add environment variables in Site settings → Build & deploy → Environment
6. Click **Deploy site**

### Option C: GitHub Pages

1. Install gh-pages: `npm install -D gh-pages`

2. Add to `vite.config.ts`:
   ```ts
   export default defineConfig({
     base: '/home-budget/',  // your repo name
     plugins: [react()],
     ...
   })
   ```

3. Add to `package.json` scripts:
   ```json
   "deploy": "npm run build && npx gh-pages -d dist"
   ```

4. Run: `npm run deploy`

5. In GitHub repo → Settings → Pages → Source: "Deploy from a branch" → Branch: `gh-pages`

---

## Firebase Setup (Optional — for cloud sync & Google Auth)

Firebase is **optional**. The app works fully with localStorage. Add Firebase if you want:
- Data synced across devices
- Google Sign-In authentication
- Family members accessing the same data

### Steps:

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project

2. **Enable Authentication**:
   - Authentication → Sign-in method → Enable **Google**
   - Add your domain to Authorized Domains (e.g., `your-app.vercel.app`)

3. **Enable Firestore**:
   - Firestore Database → Create database → Start in test mode
   - Later, add security rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /budgets/{userId} {
         allow read, write: if request.auth != null && request.auth.token.email == userId;
       }
     }
   }
   ```

4. **Get your config**:
   - Project settings → General → Your apps → Web app → Register
   - Copy the config values

5. **Create `.env` file** (copy from `.env.example`):
   ```
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

6. **For Vercel/Netlify deployment**: Add these as environment variables in the hosting platform's settings.

---

## Access Control

### Without Firebase
Anyone who has the URL can access the app. Data is stored per-browser in localStorage.

### With Firebase
- Go to **Settings → Allowed Emails** in the app
- Add the email addresses of family members who should have access
- Only those emails will be able to sign in with Google
- For server-side enforcement, configure Firestore Security Rules (see above)

---

## Project Structure

```
src/
├── App.tsx              # Main app with auth, routing, theme
├── main.tsx             # Entry point
├── index.css            # Tailwind + theme variables
├── lib/
│   ├── types.ts         # TypeScript interfaces & constants
│   ├── utils.ts         # Formatting, colors, helpers
│   ├── store.tsx         # React Context state management
│   └── firebase.ts       # Firebase config, auth, persistence
└── pages/
    ├── Dashboard.tsx     # Year overview with charts
    ├── MonthView.tsx     # Monthly detail — all data entry
    ├── YearView.tsx      # Year analytics & comparisons
    └── Settings.tsx      # Categories, currency, import/export
```

## Tech Stack

- **React 19** + **TypeScript**
- **Tailwind CSS 3** with shadcn/ui design tokens
- **Recharts** for data visualization
- **Firebase** (optional) for auth + cloud storage
- **Vite** for blazing fast builds
- **LocalStorage** as default persistence

## License

MIT


```shell
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /budgets/{docId} {
      allow read, write: if request.auth != null
        && request.auth.token.email in ['nikolay.g.tanchev@gmail.com', 'ntanchev@speed.bg', 'mihaela.r.ivanova@gmail.com'];
    }
  }
}

```
