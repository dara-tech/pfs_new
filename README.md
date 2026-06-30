# PSF V4 Report - Express + React + shadcn/ui

Modern full-stack application with Express.js backend and React frontend using shadcn/ui components.

## Project Structure

```
pfs_new/
├── backend/          # Express.js API server
├── frontend/         # React + Vite + shadcn/ui
└── package.json      # Root workspace configuration
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for both backend and frontend workspaces.

### 2. Configure Backend

1. Copy the example environment file:
```bash
cp backend/.env.example backend/.env
```

2. Update `backend/.env` with your database credentials:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=psf_db
DB_USERNAME=root
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
```

### 3. Run Development Servers

From the root directory:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

Then start the production server:
```bash
npm start
```

## Tech Stack

### Backend
- Express.js
- Sequelize (MySQL)
- JWT Authentication
- Express Session
- bcryptjs

### Frontend
- React 18
- Vite
- React Router
- shadcn/ui (Radix UI + Tailwind CSS)
- Zustand (State Management)
- Axios

## Default Login Credentials

Based on the Laravel database seeds, you can use these credentials to login:

**Admin User:**
- Email: `admin@admin.com`
- Password: `password`
- Role: Administrator

**Regular User:**
- Email: `user@admin.com`
- Password: `password`
- Role: User

> **Note:** Make sure your database has been seeded with these users. If not, you may need to create a user manually or run the Laravel seeder first.

## Features

- ✅ JWT-based authentication
- ✅ Session management
- ✅ Protected routes
- ✅ Modern UI with shadcn/ui components
- ✅ Responsive design
- ✅ API integration ready

## Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build frontend for production
- `npm start` - Start backend server in production mode

## Notes

- No custom CSS - all styling uses Tailwind CSS and shadcn/ui components
- Backend uses ES modules (type: "module")
- Frontend uses Vite for fast development and building

