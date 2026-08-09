# 🍕 ALFRIDO PIZZA — Server Application (Backend API & Realtime)

Production-level REST API and Socket.IO backend for **ALFRIDO PIZZA**, built with Node.js, Express, TypeScript, Prisma ORM, and Socket.IO.

Target Repository: [https://github.com/mostafaward27/Pizaa_Server.git](https://github.com/mostafaward27/Pizaa_Server.git)

---

## 🚀 Features

- **RESTful Endpoints**: Full API support for Products, Categories, Branches, Offers, Orders, and Admin stats.
- **Realtime WebSockets**: Instant order status broadcast to kitchen staff, branch managers, and customer tracking rooms.
- **Database & Prisma ORM**: SQLite for quick local development, easily configurable for PostgreSQL / MySQL in production.
- **Automated Seeding**: Quick database setup with pre-populated products, categories, branches, and sample orders.

---

## 🛠️ Technology Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database / ORM**: [Prisma ORM](https://www.prisma.io/) (SQLite / PostgreSQL)
- **Realtime**: [Socket.IO](https://socket.io/)
- **Authentication / Hashing**: bcryptjs, JSON Web Tokens

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP Server Port | `5001` |
| `NODE_ENV` | Environment Mode (`development` / `production`) | `development` |
| `DATABASE_URL` | Prisma DB URL | `"file:./dev.db"` (Local) or PostgreSQL URL |
| `JWT_SECRET` | Secret key for JWT signing | Set your secure random secret |
| `CORS_ORIGIN` | Allowed CORS Origins | `*` or `https://your-client.vercel.app` |

---

## 💻 Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client & Seed Database**:
   ```bash
   npm run prisma:db:push
   npm run seed
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5001`.

---

## 📦 Production Build & Run

1. **Compile TypeScript**:
   ```bash
   npm run build
   ```

2. **Run Database Migrations / Push**:
   ```bash
   npm run prisma:db:push
   ```

3. **Start Production Server**:
   ```bash
   npm start
   ```

---

## 🚀 How to Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - ALFRIDO PIZZA Server"
git branch -M main
git remote add origin https://github.com/mostafaward27/Pizaa_Server.git
git push -u origin main
```
