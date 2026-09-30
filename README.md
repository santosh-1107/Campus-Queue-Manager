# 🎓 Campus Queue Manager (CQM)

A real-time, full-stack queue management system designed for campus administrative counters, certificate distribution, lab equipment booking, and student help desks. Built with **React**, **Node.js**, **Express**, **MySQL**, and **Socket.io**.

---

## 🌟 Key Features

- **Live Departure Board UI**: Airport/train departure board visual aesthetic (navy background, amber accents, monospace token numerals).
- **Real-Time WebSocket Sync**: Instant token status updates across student, staff, and admin views using Socket.io without manual refresh.
- **Smart Wait-Time Predictor (`waitTimePredictor.js`)**: Dynamic ETA prediction using exponential moving average (EMA) based on queue position and rolling service completion history.
- **Automated No-Show Detection (`autoSkipNoShows`)**: Background job running every 30s to auto-skip tokens called but unclaimed within a configurable grace window.
- **Role-Based Access Control (RBAC)**: Secure JWT authentication supporting `student`, `staff`, and `admin` roles.
- **Staff Calling Panel**: Quick actions to call next token, complete service, or pause/resume queues.
- **Admin Analytics Dashboard**: High-level metrics tracking total tokens, completion rates, no-show percentages, and hourly queue volumes.

---

## 📁 Project Structure

```plaintext
Campus-Queue-Manager/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration (MySQL connection pool)
│   │   ├── controllers/     # Auth, queue, staff, and service controllers
│   │   ├── middleware/      # JWT auth and role verification middleware
│   │   ├── models/          # SQL schema (schema.sql) and mock seed script (seed.js)
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Wait time predictor and automated no-show background workers
│   │   ├── sockets/         # Socket.io event handlers and room broadcasters
│   │   ├── app.js           # Express application setup and middleware
│   │   └── server.js        # Server entry point and HTTP/Socket listener
│   ├── .env.example         # Backend environment variable template
│   ├── package.json         # Backend dependencies and scripts
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API client instances and endpoints
│   │   ├── components/      # UI components, layout, and queue board elements
│   │   ├── context/         # Auth and WebSocket React context providers
│   │   ├── hooks/           # Custom hooks for live queue subscriptions
│   │   ├── pages/           # Login, Student Join, Live Board, Staff, Admin views
│   │   ├── utils/           # Time formatters and helpers
│   │   ├── App.jsx          # Router and application routes
│   │   └── main.jsx         # React root entry point
│   ├── .env.example         # Frontend environment variable template
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend dependencies and scripts
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── vite.config.js       # Vite build configuration
│   └── README.md
├── .gitignore               # Comprehensive Git ignore rules (protects .env, node_modules, builds)
└── README.md                # Root project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.x or later)
- **npm** (v9.x or later)
- **MySQL** (v8.x or compatible, e.g., MariaDB)

---

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with your MySQL database credentials:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=campus_queue_manager
   JWT_SECRET=your_jwt_secret_key
   NO_SHOW_GRACE_SECONDS=120
   CLIENT_URL=http://localhost:5173
   ```

5. Initialize the database schema:
   ```bash
   mysql -u root -p < src/models/schema.sql
   ```

6. Seed mock demo data (users, counters, services, and live queue states):
   ```bash
   npm run seed
   ```

7. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server runs on `http://localhost:5000`.*

---

### 2. Frontend Setup

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the `.env` configuration file:
   ```bash
   cp .env.example .env
   ```

4. Ensure your frontend `.env` points to your backend instance:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

5. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:5173`.*

---

## 🔑 Demo Logins

After executing `npm run seed` in the backend, the following accounts are pre-configured:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@demo.cqm` | `demo1234` | Full access: manage services, counters, analytics |
| **Staff** | `staff1@demo.cqm` | `demo1234` | Certificate Counter operator (active queue) |
| **Staff** | `staff2@demo.cqm` | `demo1234` | Student Help Desk operator |
| **Student** | `aditi@demo.cqm` | `demo1234` | Pre-enrolled student token |
| **Student** | `rohan@demo.cqm` | `demo1234` | Pre-enrolled student token |

---

## 🔌 Socket.io Events Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `watchService` | Client ➔ Server | `serviceId` | Subscribes client to live queue room |
| `leaveService` | Client ➔ Server | `serviceId` | Unsubscribes client from room |
| `queueUpdate` | Server ➔ Client | `{ waiting: [...] }` | Broadcasts refreshed queue list & positions |
| `tokenCalled` | Server ➔ Client | `{ tokenId, tokenNumber }` | Broadcasts when next token is called |
| `tokenSkipped` | Server ➔ Client | `{ tokenId }` | Broadcasts when a token is skipped |

---

## 🛡️ Security & Privacy Notice

- All `.env` files containing secrets, database credentials, and JWT signing keys are excluded from git version control via `.gitignore`.
- Always generate unique secret keys for production deployments.

---

## 📄 License

This project is developed for educational and hackathon demonstration purposes.
