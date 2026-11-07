# SuppIT — Business Management System

## 1. About the project

SuppIT is a web-based business management system that we developed for our IT project. The aim is to help a small business manage its daily records in one place instead of keeping customer details, quotations and payments in separate files.

The system allows users to manage customers, suppliers, stock items, quotations, orders, invoices, payments and reminders. We also added an Audit Trail so administrators can check the activity recorded in the system.

The application can be opened in a web browser. Its data is saved in a Neon PostgreSQL database, so records are not lost when the user refreshes the page or signs out.

**Live application (Vercel):** [https://supp-it.vercel.app](https://supp-it.vercel.app)

## 2. Technologies used

| Technology | How we used it |
|---|---|
| React | Builds the forms, tables and other parts of the interface |
| Next.js | Runs the web application and provides the backend API routes |
| JavaScript | Handles the frontend and backend logic |
| Prisma ORM | Connects the backend to the PostgreSQL database |
| Neon PostgreSQL | Stores the business records |
| jsPDF and html2canvas | Help generate PDF documents |
| Git and GitHub | Store and track changes to the project code |
| Vercel | Hosts the online application |
| Docker (optional) | Can be used to run the application in a container |

### Three-tier architecture

We used a three-tier design to separate the main parts of the application:

1. **Presentation layer:** React and Next.js display the pages that users interact with.
2. **Application layer:** Next.js API routes check requests, apply the rules and use Prisma to work with the database.
3. **Database layer:** Neon PostgreSQL stores users, customers, suppliers and other records.

The frontend and backend are in the same Next.js project, while Neon is hosted separately.

```text
User opens SuppIT in a browser
             |
             v
React / Next.js frontend
             |
             v
Next.js API routes
             |
             v
Prisma ORM
             |
             v
Neon PostgreSQL database
```

## 3. Main features

| Feature | What it does |
|---|---|
| Customers | Add, view and update customer details |
| Suppliers | Add and manage supplier information |
| Stock | Manage products, quantities and prices |
| Quotes | Create quotations with customers and line items |
| Orders | Create an order when a quotation is accepted |
| Invoices | Generate customer invoices from saved orders |
| Payments | Record customer receipts and supplier payments |
| Reminders | Check which customer invoices are due soon or overdue |
| Reports | Show a summary of the business records |
| Audit | Let administrators review user activity and saved changes |
| User management | Let administrators create and manage accounts within their permissions |

### From a quotation to a payment

The normal sales process in SuppIT works as follows:

1. A user creates a quotation for an existing customer.
2. When the customer accepts the quotation, it can be converted into an order.
3. An invoice is generated from the order and saved in Neon.
4. A user records the payment received from the customer.
5. The Payments screen shows how much has been paid and how much is still outstanding.

For example, if an invoice is **R10,000** and the customer pays **R6,000**, the system shows **R4,000 outstanding**. The payment status is shown as **Partially paid**.

## 4. User accounts and permissions

SuppIT has different account roles. Users sign in with their username or registered email address and password.

| Role | Main permissions |
|---|---|
| **Super Admin** | Manages the system, administrators and staff accounts |
| **Admin** | Manages business records and permitted staff accounts; can view Audit |
| **Staff** | Uses the business screens, including customer and supplier payment records; cannot view Audit or manage users |

**Only Admin and Super Admin can open the Audit tab or download Audit reports.** Staff users do not see the tab, and the backend also checks the user's role.

Login details are provided privately to the people who need them. Passwords and database connection details are not included in this public README.

## 5. Customer and supplier payments

The Payments page has two separate views:

- **Customer invoices:** Money that customers still need to pay to the business.
- **Supplier invoices:** Money that the business needs to pay to suppliers.

Users can record supplier invoices, enter payments against them and check the remaining balance. These are records of payments; SuppIT does **not** transfer money through a bank.

Each payment record can show the invoice number, customer or supplier, invoice date, due date, total amount, amount paid, outstanding amount, status and payment history.

### Payment filters

Users can filter the records by:

- Customer or supplier
- Invoice date, due date or latest payment date
- Today, the last 7 days, the last 30 days, this month or a custom date range
- Payment status: Unpaid, Partially paid or Paid

The **Export filtered PDF** and **Export filtered CSV** buttons download the records that match the selected filters. Customer and supplier reports are exported separately.

## 6. Audit Trail

We added an Audit Trail to help administrators see who used the system and what actions were recorded.

The Audit page can show:

- The user who performed the action
- The date and time
- The type of action, such as login, page visit, create, update, delete or payment
- The part of SuppIT where it happened
- A short description and the record ID when available
- The names of fields submitted during an update

Administrators can search or filter Audit records by user, action, module and date range. They can also export the filtered results to **PDF** or **CSV**.

Audit records are loaded in pages. To include older activity in a report, select **Load older entries** before exporting. The export includes the records currently loaded and matching the filters, not automatically every record ever stored in Neon.

**Limitations:** The Audit Trail records actions handled by the application's audit-enabled API routes. It does not track changes made directly in Neon's SQL Editor. For edits, it shows submitted field names rather than a complete before-and-after history of every value. Passwords are not included in audit reports.

## 7. Database

We used **Neon PostgreSQL** because the information needs to remain available after the application is closed. Prisma defines the database models and their relationships.

Some of the main models are:

| Models | Purpose |
|---|---|
| `Company`, `User` | Company details and user accounts |
| `Customer`, `Supplier` | Customer and supplier details |
| `StockItem` | Products, prices and quantities |
| `Quotation`, `QuotationItem` | Quotation details and items |
| `SalesOrder`, `OrderItem` | Orders created from accepted quotations |
| `Invoice`, `InvoiceItem` | Customer invoice details |
| `Payment` | Payments received from customers |
| `SupplierBill`, `SupplierPayment` | Supplier invoices and payments made |
| `Reminder` | Due-soon and overdue invoice records |
| `AuditLog` | User activity recorded by the application |

Most business records are linked to a company, so users should only work with data belonging to their company.

**Note:** The supplier and audit features need their relevant Prisma migrations to be applied to the correct Neon branch before they can work. Updating the frontend alone does not create database tables.

## 8. How to run the project locally

### Requirements

- Node.js and npm
- Git
- A Neon PostgreSQL database
- WebStorm, VS Code or another code editor
- An internet connection to access Neon

### Installation

Run the commands below in PowerShell or the terminal in WebStorm.

**1. Download the project** (skip this if it is already on your computer):

```powershell
git clone https://github.com/WaterMark38/SuppIT.git
cd SuppIT
```

**2. Install the packages:**

```powershell
npm install
```

**3. Configure the environment file:**

```powershell
Copy-Item .env.example .env
```

Open `.env` and add your own Neon connection details and a private session secret. Do not replace an `.env` file that is already configured.

```dotenv
DATABASE_URL="YOUR_NEON_POOLED_CONNECTION_STRING"
DIRECT_URL="YOUR_NEON_DIRECT_CONNECTION_STRING"
SESSION_SECRET="YOUR_PRIVATE_SECRET_AT_LEAST_32_CHARACTERS"
```

These are placeholders, not working credentials. Keep `.env` private and do not push it to GitHub.

**4. Check and generate the Prisma client:**

```powershell
npm run db:validate
npm run db:generate
```

**5. Check the database migrations:**

```powershell
npx prisma migrate status
```

When setting up a new database, apply the migration files included in the project:

```powershell
npm run db:deploy
```

Check that the connection is pointing to the correct Neon branch. Back up databases that already contain records, and do not approve a database reset or destructive change without reviewing it.

**6. Start SuppIT:**

```powershell
npm run dev
```

Open **http://localhost:3000** in a browser. To stop the application, press **Ctrl + C** in the terminal.

### First-time administrator

For a new database with no administrator account, the project includes this setup command:

```powershell
npm run admin:create
```

Use this only during initial setup and follow the prompts or setup instructions for your project. Do not run it again on a database where the accounts have already been created.

### Optional Docker setup

If Docker Desktop is installed and the project's `compose.yaml` file is available, you can run:

```powershell
docker compose up --build -d
docker compose ps
```

To stop the container:

```powershell
docker compose down
```

Docker is optional. It runs the application in a container, but the application still uses Neon as its database. Avoid running Docker and `npm run dev` on the same port at the same time.

## 9. Deployment and GitHub

The project code is stored on GitHub:

**Repository:** [https://github.com/WaterMark38/SuppIT](https://github.com/WaterMark38/SuppIT)

**Live application (Vercel):** [https://supp-it.vercel.app](https://supp-it.vercel.app)

The application is deployed on Vercel. Vercel must have the correct environment variables configured to connect to Neon. Database migrations must also be applied to the database used by the deployed application.

Files such as `.env`, `node_modules`, `.next` and personal editor settings should not be committed to the repository.

## 10. Current limitations and testing

The following points are important when testing or demonstrating the system:

- Reminders are updated when a user selects **Check invoices**. The system does not automatically email or SMS customers.
- A user can open their default email application for a quotation or invoice, but the downloaded PDF must be attached manually.
- Recording a supplier payment saves a transaction in SuppIT. It does not make a bank payment.
- PDF and CSV reports are based on the records available in the selected screen and the filters applied.
- Audit Trail helps with accountability but is not a complete record of direct database changes.
- The full quotation-to-order-to-invoice-to-payment process should be tested after database changes or deployment.

## 11. Project team

**Developed by WaterMark Dev Team**  
BSc Information Technology project — SuppIT Business Management System
