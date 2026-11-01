# SuppIT — Business Management System

---

## 1. Login Details and User Roles
please run npm run dev in webstorm
Open **http://localhost:3000** after starting SuppIT. Users sign in with a **username or registered email address**, followed by their password.

| Account | Login | Password | Main access |
|---|---|---|---|
| **Super Admin — System Owner** | `superadmin` or `teamwatermark9@gmail.com` | **Private owner password** | Full system and account management |
| **Admin — Lecturer** | `administrator` | **Provided privately to the lecturer** | Business management and Staff account management |
| **Staff — Normal User** | `user1` (once created) | **Set by an administrator** | Day-to-day business functions |

**Account permissions**

- **Super Admin:** Manages the system, Admin and Staff accounts, passwords and business records.
- **Admin:** Manages customers, stock, quotations, orders, invoices, payments, reminders and Staff accounts. Cannot change the Super Admin account.
- **Staff:** Uses the business functions permitted by their role. Cannot manage other users.

> **Important:** The `superadmin`, `administrator` and `user1` usernames only work after those accounts have been configured in the database. The lecturer's account can be set up without an email address. Check that each account works before the demonstration. Do not put working passwords in a GitHub README; provide the lecturer's password separately.

---

## 2. About SuppIT

SuppIT is a web-based business management system for small businesses. It helps users manage **customers, suppliers, products, quotations, sales orders, invoices, payments and payment reminders** in one place.

SuppIT uses a **three-tier architecture**:

| Layer | Technology | What it does |

| **Presentation Layer** | React and Next.js | Displays the dashboard, forms, tables and buttons |

| **Application Layer** | Next.js API routes and Prisma | Checks requests, applies business rules and reads or saves records |

| **Database Layer** | Neon PostgreSQL | Stores the business information and links related records |

The frontend and backend are part of the **same Next.js project**. Neon is a separate cloud database.

---

## 3. Frontend — Presentation Layer

The frontend is what users see in their browser. It includes the login page, dashboard and screens used to manage business records.

| Screen | What users can do |
|---|---|
| **Customers** | Add, view and update customer information |
| **Suppliers** | Maintain supplier details |
| **Stock** | View and manage products, services, quantities and prices |
| **Quotations** | Select customers, add items and save quotations |
| **Sales Orders** | View orders linked to accepted quotations |
| **Invoices** | Review invoices and preview or download a PDF |
| **Payments** | Record customer payments and view outstanding balances |
| **Reminders** | Check invoices that are due soon or overdue |
| **Reports** | View business totals and summary information |
| **User Management** | Manage user accounts according to the signed-in user's role |

**Example:** A user completes a quotation form and clicks **Save**. The frontend sends the information to the backend. Once saved, the quotation can be displayed again in SuppIT.

---

## 4. Backend — Application Layer

The backend is built using **Next.js API routes (JavaScript)**. It works behind the scenes when a user saves, updates or opens a record.

The backend:

- Checks login details and user permissions.
- Checks required fields before saving records.
- Saves customers, suppliers, stock items and quotations.
- Processes accepted quotations into related sales orders.
- Creates invoice records using saved order information.
- Records payments and updates invoice balances and payment statuses.
- Checks unpaid invoices when a user selects **Check invoices**.
- Sends saved records or error messages back to the frontend.

**How it communicates with Neon:** The API uses **Prisma ORM** to read and write information in the PostgreSQL database. This keeps database access on the server instead of putting database credentials in the browser.

---

## 5. Database — Data Layer

SuppIT uses **Neon PostgreSQL** to store information so it is available after refreshing the browser or logging in again.

The Prisma schema defines these main records:

| Records | Information stored |
|---|---|
| **Company and User** | Company details, user accounts and roles |
| **Customer and Supplier** | Business contacts |
| **StockItem** | Product and service information |
| **Quotation and QuotationItem** | Quotation details and selected items |
| **SalesOrder and OrderItem** | Orders and their saved items |
| **Invoice and InvoiceItem** | Invoice totals, dates, statuses and items |
| **Payment** | Payments received against invoices |
| **Reminder** | Due-soon, overdue and resolved reminders |

Related records use IDs so, for example, an invoice can be linked to its customer and sales order. Business records are associated with the relevant company.

### How the three layers communicate

```text
User adds or updates information in SuppIT
                  |
                  v
Frontend — React / Next.js
                  |
                  v
Backend — Next.js API routes
                  |
                  v
Prisma reads or saves data in Neon PostgreSQL
                  |
                  v
Backend returns the result
                  |
                  v
Frontend displays the saved record or updated status
```

### Example A — From quotation to sales order

1. **Frontend:** The user selects a customer, adds products or services and clicks **Save quotation**.
2. **Backend:** Next.js checks the information and asks Prisma to save it.
3. **Database:** Neon stores the quotation and its individual items.
4. **Return to screen:** The backend returns the saved quotation, which appears in SuppIT.
5. **Accepted quotation:** The backend creates the related sales order, which is then available in the Orders screen.

### Example B — From sales order to invoice and payment

1. **Frontend:** The user opens an order and selects **Generate invoice**.
2. **Backend:** Next.js prepares the invoice using the saved order details.
3. **Database:** Neon stores the invoice, its items, amount, due date and payment status.
4. **Return to screen:** The invoice appears in SuppIT for review and PDF download.
5. **Payment:** When the user records a payment, the backend saves it and updates the outstanding balance shown in the interface.

### Payment statuses and reminders

| Status | Meaning |
|---|---|
| **Unpaid** | No payment has been received |
| **Partially Paid** | A payment was received, but money is still outstanding |
| **Paid** | The invoice has been paid in full |
| **Due Soon** | An unpaid balance is due within the next seven days |
| **Overdue** | The due date has passed and money is still outstanding |
| **Resolved** | The reminder has been resolved, for example after full payment |

The user selects **Check invoices** to refresh reminders. Reminder information appears inside SuppIT; the current system **does not automatically send email or SMS reminders**. For quotation and invoice emails, users can open their default email application and manually attach a downloaded PDF.

---

## 6. Install and Run SuppIT Locally

**Requirements:** Node.js and npm, Git, a configured Neon PostgreSQL database, and a terminal such as Windows PowerShell or WebStorm. Docker Desktop is optional.

Follow these steps in order. **Each command is run separately.**

1. **Download the project** (skip this if you already have the project folder):
   ```powershell
   git clone https://github.com/WaterMark38/SuppIT.git
   ```

2. **Open the project folder:**
   ```powershell
   cd SuppIT
   ```

3. **Install the project packages:**
   ```powershell
   npm install
   ```

4. **Create `.env` if it does not already exist:**
   ```powershell
   Copy-Item .env.example .env
   ```
   Open `.env` and enter your private connection settings:
   ```dotenv
   DATABASE_URL="YOUR_NEON_POOLED_CONNECTION_STRING"
   DIRECT_URL="YOUR_NEON_DIRECT_CONNECTION_STRING"
   SESSION_SECRET="YOUR_PRIVATE_SESSION_SECRET"
   ```
   Keep any existing `.env` file rather than overwriting it. Use the **pooled** Neon connection for `DATABASE_URL` and the **direct** connection for `DIRECT_URL`.

5. **Check the Prisma schema:**
   ```powershell
   npm run db:validate
   ```

6. **Generate Prisma Client:**
   ```powershell
   npm run db:generate
   ```

7. **Check the database migration status:**
   ```powershell
   npx prisma migrate status
   ```
   For a **new, empty development database only**, apply the migration files already included in the project:
   ```powershell
   npm run db:deploy
   ```
   Do not reset or overwrite a database containing existing business records.

8. **Start SuppIT:**
   ```powershell
   npm run dev
   ```

9. **Open the system:** Visit **http://localhost:3000** in your browser.

10. **Stop the system:** Press **Ctrl + C** in the terminal.

### First-time account setup

For a **new database with no administrator**, create the first administrator using:

```powershell
npm run admin:create
```

The separate Super Admin and lecturer accounts must be configured and tested using the account setup provided with the project. Do not run the initial administrator creation command again on an existing configured company.

### Optional Docker setup

Run these commands from the project folder while Docker Desktop is running:

1. **Build and start:**
   ```powershell
   docker compose up --build -d
   ```
2. **Check the application container:**
   ```powershell
   docker compose ps
   ```
3. **Stop the application container:**
   ```powershell
   docker compose down
   ```

Docker runs the application locally and still connects to Neon over the internet. Do not run Docker and `npm run dev` on the same port at the same time.

---

## 7. Current Development Notes

- The database structure and original administrator setup have been completed in the development environment.
- Confirm the Super Admin and lecturer login permissions using the latest account-management update.
- Test the full quotation → order → invoice → payment workflow before submission.
- Verify that changes made through the interface are saved in Neon and remain visible after refreshing.
- Review dependency security warnings before deployment.
- Do not upload `.env`, account passwords, database credentials, `node_modules` or `.next` to GitHub.

---

**Developed by WaterMark Dev Team — SuppIT Business Management System**
