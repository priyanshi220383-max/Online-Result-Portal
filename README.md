# EduResult - Online Result / Report-Card Generation Portal

B.Tech CSE (2nd year) **DBMS capstone**. A school portal to manage students, subjects, examinations and marks, calculate results and
print report cards. Roles: **Administrator**, **Teacher**, **Student**.

**Stack:** React + Vite (frontend) - Node.js + Express (backend) - **MySQL 8** (primary database) - MongoDB (optional, report-card snapshots).

Start here for the syllabus: [`docs/DBMS-UNIT-MAPPING.md`](docs/DBMS-UNIT-MAPPING.md) - ER diagram: [`docs/ER-diagram.png`](docs/ER-diagram.png)

```
Online-Result-Portal/
|-- frontend/   React app (pages, components, services)
|-- backend/    Express API (config, routes, controllers, models, middleware, scripts)
|-- database/   schema.sql  procedures.sql  triggers.sql  views.sql  seed.sql  queries.sql  security.sql
|-- docs/       ER diagram + DBMS unit mapping
|-- .env.example   package.json   README.md
```

---

## 1. Prerequisites (Windows)
1. **Node.js 18.18 or newer** (20 LTS recommended) - https://nodejs.org (choose LTS, keep defaults). Check in a new Command Prompt: `node -v` and `npm -v`.
2. **MySQL Server 8.0 or newer** - https://dev.mysql.com/downloads/installer/ -> *MySQL Installer* -> "Server only" (or "Developer Default").
   * During setup choose **Use Strong Password Encryption**, and **set a root password - remember it**.
   * Keep the default port **3306** and let it run as a Windows Service (starts automatically).
   * MySQL Workbench is optional but handy for the demo.
3. *(Optional)* MongoDB Community Server - only for the snapshot feature (section 8).

## 2. Configure the environment
Open Command Prompt in the project folder (the one containing `package.json`):
```
copy .env.example .env
notepad .env
```
Set at least:
* `DB_PASSWORD=` your MySQL root password
* `JWT_SECRET=` any long random text (generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)

Leave everything else as it is for local use. (`.env` is never uploaded - it is in `.gitignore`.)

## 3. Install dependencies
```
npm install
```
One command installs both the frontend and the backend (npm workspaces).

## 4. Create the database and sample data
```
npm run db:setup
```
This creates the database `result_portal`, then runs `schema.sql`, `procedures.sql`, `triggers.sql`, `views.sql` and `seed.sql`
(24 students, 6 subjects, 3 classes, 5 exams, 216 marks, 32 results). **It resets the portal tables each time you run it.**
You do not need the `mysql` command-line client.

*Alternative (manual import):* in MySQL Workbench open and run the files in the order above, or in Command Prompt:
`mysql -u root -p < database\schema.sql` and so on (use `source` for files with `DELIMITER`).

Optional - database roles and users for the Unit 3 security demo: `npm run db:security`.

## 5. Run the application
```
npm run dev
```
* Website: **http://localhost:5173**
* API: http://localhost:5000/api (health check: http://localhost:5000/api/health)

### Demo logins (password for all: `Password@123`)
| Role | Username | Notes |
|---|---|---|
| Administrator | `admin` | everything |
| Teacher | `t.sharma` | Mathematics & Computer Science in all classes |
| Teacher | `t.kaur` / `t.singh` / `t.gupta` | English+Hindi / Science / Social Science |
| Student | `ADM2025001` ... `ADM2025024` | student username = admission number |

### Suggested demo flow
1. Sign in as **admin** -> Dashboard (live statistics) -> Students / Subjects / Classes / Exams.
2. Sign in as **t.sharma** -> Marks Entry -> *Half-Yearly Examination - 10-B* -> *Mathematics*. Type `150` -> the database trigger rejects it.
3. As admin: Marks Entry (fill the other subjects) -> Results -> **Generate results** -> Exams -> **Publish**.
4. Open a **report card** -> *Print / Save as PDF*.
5. Sign in as a **student** (e.g. `ADM2025009`) -> My Results -> report card (only published exams, only their own).
6. Settings: change the pass percentage or grade scale -> regenerate results -> statuses change.

## 6. Other commands
| Command | What it does |
|---|---|
| `npm run dev` | frontend + backend together (development) |
| `npm run build` | production build of the frontend -> `frontend/dist` |
| `npm start` | start only the API (production mode) |
| `npm run db:setup` | (re)create the database and sample data |
| `npm run db:setup:empty` | (re)create the database with empty tables (no sample data) |
| `npm run db:security` | create roles/users/privileges (needs a MySQL account allowed to create users) |
| `npm run db:benchmark` | indexing performance comparison (Unit 4) |
| `npm run test:db` | automated end-to-end test of API + database (start `npm run dev` first; it modifies sample data, so run `npm run db:setup` afterwards) |

SQL examples for the exam/viva: `mysql -u root -p result_portal < database\queries.sql` (or paste sections into Workbench).

## 7. Troubleshooting
| Problem | Fix |
|---|---|
| `Access denied for user 'root'` | `DB_USER`/`DB_PASSWORD` in `.env` are wrong. |
| `ECONNREFUSED 127.0.0.1:3306` / "Database is unavailable" | MySQL is not running: Windows Services -> *MySQL80* -> Start. Check `DB_PORT`. |
| `Client does not support authentication protocol` | Re-install MySQL with strong password encryption, or run in Workbench: `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';` |
| `Unknown database` / tables missing | Run `npm run db:setup`. |
| `Port 5000 / 5173 already in use` | Change `PORT` in `.env` (and `VITE_DEV_PROXY_TARGET` to match) or stop the other program. |
| Login page says "Cannot reach the server" | The backend is not running - look for errors in the terminal that runs `npm run dev`. |
| `'npm' is not recognized` | Install Node.js, then open a **new** Command Prompt. |
| `INTERSECT/EXCEPT` syntax error in `queries.sql` | They need MySQL 8.0.31+. Update MySQL or skip section 6. |
| Fonts look different offline | Fonts load from Google Fonts; the app falls back to system fonts. |
| After editing `.env` nothing changed | Stop and restart `npm run dev`. |

## 8. Optional: MongoDB snapshots (Unit 4)
1. Install MongoDB Community Server (https://www.mongodb.com/try/download/community) as a Windows service, or create a free **MongoDB Atlas** cluster.
2. In `.env` set `MONGODB_URI=mongodb://127.0.0.1:27017` (or your Atlas `mongodb+srv://...` string).
3. Restart `npm run dev`. Open any report card as admin/teacher -> **Save snapshot** (stores the report card as a document in `result_portal.report_card_snapshots`);
   the "Saved snapshots" panel lists versions and can display an old one.
4. Leave `MONGODB_URI` empty to disable - the rest of the portal is unaffected.

## 9. Preparing for deployment later (not done now)
* **Environment variables only** - no URLs or credentials in code. Production needs: `NODE_ENV=production`, a strong `JWT_SECRET`,
  `DB_*` of the cloud MySQL (set `DB_SSL=true`), `CORS_ORIGIN=https://your-frontend-domain`.
* **Run the schema on the cloud database:** put the cloud values in `.env` and run `npm run db:setup:empty` (it never needs the `mysql` client).
  Skip `db:security` if the provider does not allow `CREATE ROLE/USER`. Change/remove the demo accounts and sample data before going live.
* **Two-host setup:** build the frontend with `VITE_API_URL=https://api.your-domain.com/api npm run build` and host `frontend/dist` on any static host;
  run `npm start` for the API.
* **Single-host setup:** `npm run build`, set `SERVE_FRONTEND=true`, then `npm start` - Express serves the site and the API together (keep `VITE_API_URL=/api`).
* Nothing depends on Lovable or any hosted service.

## 10. About the rewrite
The original Lovable project (React + TanStack + Supabase/Postgres) was inspected and its design direction reused: navy/indigo palette,
Outfit/Figtree fonts, hero image, dashboard/results/report-card features, configurable grade scale, role portals, and the idea of
published results. Supabase, Lovable error reporting, Drizzle and the parent portal were removed; the data layer was redesigned as a normalised MySQL schema.

## 11. Honest notes
* Authentication token is kept in the browser's `localStorage` for simplicity; for a public deployment consider HTTP-only cookies.
* The API connects to MySQL with one account; the per-role MySQL roles in `security.sql` demonstrate database-level least privilege
  (try `mysql -u demo_teacher -p`), while the portal enforces roles in the API.
