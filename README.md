# 🚀 Appvizo - Ultra Modern Apps & Games Portal

Official repository for **Appvizo** — A modern, high-performance Apps & Games directory built with **React 19 + TypeScript (TSX) + Supabase + Modern CSS**.

---

## 🌐 Domain & Configuration

- **Brand:** Appvizo
- **Supabase Cloud Project URL:** `https://mpxbnwcospmifvhcteqi.supabase.co`
- **Database:** Supabase PostgreSQL with real-time sync & Row Level Security (RLS)

---

## 🔑 Admin Panel Access & Security

- **Direct URL:** `/admin` (e.g. `https://your-domain/admin` or `http://localhost:3000/admin`)
- **Password:** Configured via Cloudflare Pages environment secret `ADMIN_PASSWORD` (never hardcoded in source code).
- **Other Shortcuts:**
  - Keyboard shortcut: `Ctrl + Shift + A` (Mac: `Cmd + Shift + A`)
  - Search trigger: Search bar me `admin` likhein aur Lock 🔒 icon dabayein
  - Footer trigger: Footer copyright text par 3 baar click karein
- **Public Header:** Visitors ke liye koi admin button nahi dikhta (bilkul clean UI).

---

## ⚡ Supabase Setup Instructions (Important)

Your Supabase project is active and connected! To ensure the tables are initialized in your database:

1. Open your **Supabase Dashboard** at [supabase.com](https://supabase.com/dashboard/project/mpxbnwcospmifvhcteqi).
2. Go to **SQL Editor** from the left sidebar.
3. Open or copy the contents of `supabase_schema.sql` from this repository.
4. Paste the SQL code into the editor and click **"Run"**.
5. All tables (`apps`, `settings`), security policies, and 12 starter apps will be created immediately!

---

## 🛠️ Project Structure

```text
appvizo/
├── src/
│   ├── components/
│   │   ├── AdminPage.tsx       # Dedicated full-page Admin Portal
│   │   ├── AdminPage.css       # Admin dashboard styles
│   │   └── LegalModals.tsx     # Functional Privacy Policy, Terms, and Contact views
│   ├── types.ts                # TypeScript interfaces (AppItem, SiteSettings)
│   ├── data.ts                 # 12 Starter apps data + local fallback persistence
│   ├── supabaseClient.ts       # Supabase client & live cloud synchronization
│   ├── App.tsx                 # Main application component
│   ├── App.css                 # Component layout, responsive grid & animations
│   ├── index.css               # Global theme tokens, typography, and styles
│   ├── main.tsx                # React 19 entrypoint
│   └── vite-env.d.ts           # Vite client environment types
├── public/
│   ├── 404.html                # Cloudflare Pages SPA fallback
│   └── uploads/logos/          # 12 High-res starter vector SVG logos
├── dist/                       # Minified production build
├── supabase_schema.sql         # Supabase PostgreSQL schema & seed script
├── .env                        # Active environment configuration
├── .env.example                # Example environment file
├── index.html                  # Root HTML with Appvizo SEO & OpenGraph tags
├── package.json                # Project dependencies and build scripts
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite configuration
```

---

## 💻 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`

3. Build for production:
   ```bash
   npm run build
   ```

---

## 🚀 Deployment to Raxo.online

- **Vercel / Netlify / Cloudflare Pages:**
  Simply connect this GitHub repository (`https://github.com/Rajveerkol/raja-1.git`).
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
  - Connect your custom domain `Raxo.online` in the dashboard!
