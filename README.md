SuppIT — Phase 5: System README
Project: SuppIT Business Management System
Developed by: WaterMark Dev Team
Course: BSc Information Technology — Final-Year IT Project
GitHub: WaterMark38/SuppIT
About SuppIT
SuppIT is a web-based business management system designed to help a small business manage customers, suppliers, stock, quotations, sales orders, invoices, payments and payment reminders in one place.

The system uses a three-tier architecture. This means the frontend, backend and database each have a different job, but work together whenever a user views, saves or updates information.
Layer	Technology	Main purpose
Presentation Layer (Frontend)	React with Next.js	Displays the system and collects information from users.
Application Layer (Backend)	Next.js API routes and Prisma ORM	Checks requests, applies business rules and communicates with the database.
Data Layer (Database)	Neon PostgreSQL	Stores and retrieves SuppIT's business records.


In simple terms: The frontend sends a request to the backend, the backend uses Prisma to read or update Neon, and the result is sent back to the frontend for the user to see.

======================================================================
1. Login and User Structure
======================================================================

Users sign in with their username or registered email address and their password. The system uses roles to control which functions each person can access.
Account	Login details	Main responsibilities
Super Admin — System Owner	Username: superadmin (after setup)	Full system management; controls Admin and Staff accounts, security-related user settings and business records.
Admin — Lecturer	Username: administrator (after setup); password: [add verified password to private lecturer copy]	Can work with customers, quotations, orders, invoices, payments, reminders and Staff accounts. Cannot change the Super Admin account.
Staff — Normal User	Example username: user1 (once created)	Performs permitted everyday business tasks without managing other users.


Account notes:
- The Super Admin and lecturer Admin must be separate database accounts.
- The lecturer's account is intended to use username and password only; an email address is not required for that account after the latest database and user-management updates.
- Passwords are checked on the backend using stored password hashes. The browser does not need the Neon database password.
- Admins can create Staff accounts and reset Staff passwords. A lecturer Admin must not be able to change the Super Admin's password or role.
- Setup/testing requirement: superadmin, administrator and their role restrictions must be confirmed after the Super Admin update, database migration and lecturer setup have been completed.
For the lecturer: Provide the verified working password separately with the private submission. Do not commit real login passwords, .env files or database connection strings to GitHub.

======================================================================
2. Frontend — Presentation Layer
======================================================================

Technology: React with Next.js

The frontend is the part of SuppIT that opens in the web browser. It includes the login screen, dashboard, menu, forms, tables, buttons and PDF previews.
What users can do
- Customers and suppliers: Add, view and update contact details.
- Stock: View product descriptions, prices, quantities and supplier information.
- Quotations: Select a customer, add items, set quantities and prices, and save a quotation.
- Sales orders: View orders created after a quotation is accepted.
- Invoices: Generate invoices from orders and review or download PDF documents.
- Payments: Record payments and view the outstanding balance for an invoice.
- Reminders: Click Check invoices to review upcoming and overdue payments.
- Reporting and Business Overview: See totals for customers, quotations, orders, invoices, amounts billed and amounts paid.
- User management: Create or manage user accounts if the signed-in role permits it.
How the frontend communicates
When a user clicks a button such as Save quotation, the frontend sends an HTTP request to a Next.js API endpoint. The request contains the quotation information, such as the customer, selected items, quantities and prices.

The frontend does not connect directly to PostgreSQL. It waits for the backend's reply and then shows either the saved record or a message explaining what needs to be corrected.

Example: A quotation saved successfully can be loaded again from Neon, so it is still available when the page is refreshed or the user signs in later.

======================================================================
3. Backend — Application Layer
======================================================================

Technology: Next.js API routes (JavaScript), Prisma ORM and PostgreSQL

The backend works behind the scenes. It receives requests from the frontend, checks who is signed in, checks the information being submitted and uses Prisma to communicate with Neon PostgreSQL.
Main backend functions
1. Authentication and roles: Checks the username/email and password, maintains a login session, and restricts actions according to the user's role.
2. Validation: Checks required information before saving, such as the customer, item quantities, prices, dates and payment amount.
3. Quotations and orders: Stores quotation details and converts an accepted quotation into a sales order. The order keeps its own saved item values.
4. Invoices: Generates an invoice from an order, records its total and due date, and prevents generating a second invoice for the same order.
5. Payments: Records payments, checks that a payment does not exceed the outstanding balance, and updates the invoice's payment status.
6. Reminders: Checks unpaid invoices when Check invoices is selected, then creates or updates due-soon and overdue reminder records.
7. Reports: Reads stored business totals from Neon and returns them for the dashboard.
8. Responses: Sends the result back to the frontend, normally as JSON (structured data). A failed request returns an error rather than silently saving incorrect information.
How a request moves through the backend
1. The user clicks Save or Generate invoice in the frontend.
2. The browser sends a request to a Next.js API route.
3. The API checks the user's session and permissions.
4. The API validates the submitted information and applies the relevant business rules.
5. Prisma ORM translates the application's database operation into a PostgreSQL query.
6. Neon PostgreSQL stores or retrieves the information.
7. The backend returns a result to the frontend, which updates the relevant screen.
Examples of the system's API routes
User action	Backend API route	What it does
Sign in	POST /api/auth/login	Verifies the login and creates a session.
View business records	GET /api/records	Loads records for the user's company.
Save a quotation	POST /api/records or POST /api/quotations	Validates and stores the quotation and its items.
Accept a quotation	POST /api/quotes/[id]/accept	Marks the quotation accepted and creates its sales order.
Generate an invoice	POST /api/orders/[id]/invoice	Creates an invoice from a saved order.
Record a payment	POST /api/invoices/[id]/payments	Saves a payment and updates the invoice status.
Check reminders	POST /api/reminders/sync	Identifies due-soon and overdue invoices.
View reports	GET /api/reports/overview	Retrieves business totals for the dashboard.
View/manage users	/api/users	Reads or creates users, subject to permissions.


The endpoint examples describe the project structure; the complete workflow and lecturer permissions still need end-to-end testing.
Why Prisma is used
Prisma is the connection between the Next.js backend and the PostgreSQL database. For example, the backend can ask Prisma to create an invoice or find a customer's quotations without writing a separate SQL statement in every screen.

The backend also uses database transactions for important actions such as quotation-to-order conversion and invoice/payment changes. A transaction helps keep related changes consistent if a request fails.

Important: The frontend and backend are hosted within the same Next.js project. There is no separate backend server that the lecturer needs to start.

======================================================================
4. Database — Data Layer and System Workflow
======================================================================

Technology: Neon PostgreSQL with Prisma ORM

Neon is the cloud-based relational database used by SuppIT. It stores records so they remain available after the user refreshes the page, closes the browser or signs in on another device.
Main database tables and relationships
Table or related tables	Information stored	How it connects to the system
Company, User	Companies, account details, roles and password hashes	Each user belongs to a company.
Customer, Supplier	Customer and supplier contact information	Customers link to quotations, orders and invoices; suppliers can link to stock.
StockItem	Products, quantity, cost and selling price	Items can be selected when preparing quotations.
Quotation, QuotationItem	Customer quotation, status, totals and line items	An accepted quotation can lead to a sales order.
SalesOrder, OrderItem	Sales order and its saved item values	The order refers to its original quotation and may have an invoice.
Invoice, InvoiceItem	Invoice number, dates, amounts, status and items	The invoice is linked to an order and customer.
Payment	Amount paid and payment method	Each payment belongs to an invoice.
Reminder	Due-soon, overdue or resolved reminder	Each reminder refers to an invoice.


The Prisma schema defines 13 application models. Prisma also maintains a separate migration history table called _prisma_migrations.

Company separation: Records include a company identifier (companyId). The backend uses it when reading and updating data so one company's records are kept separate from another company's information.

Saved prices: Quotation, order and invoice item tables store their own quantities and prices. This helps preserve the values from the original transaction, even when the stock item's current price changes later.
Example A — Creating a quotation and sales order
1. Frontend: The user chooses a customer, adds quotation items and clicks Save quotation.
2. Backend: Next.js checks the customer, quantities and prices, and sends the save operation through Prisma.
3. Database: Neon stores the Quotation record and its related QuotationItem rows.
4. Back to the frontend: Next.js returns the saved result. The quotation is displayed in the quotations screen.
5. Acceptance: When the quotation is accepted, the backend changes its status and creates a related SalesOrder and OrderItem records in Neon.
6. Back to the frontend again: The new order can be viewed in the Orders section.
Example B — Generating an invoice and recording payment
1. Frontend: The user opens an order and clicks Generate invoice.
2. Backend: Next.js checks that the order exists, that the invoice dates are valid and that the order has not already been invoiced.
3. Database: Neon stores an Invoice and its InvoiceItem details, with an invoice number, total, due date and initial payment status.
4. Back to the frontend: The user can review the saved invoice and prepare a PDF for download.
5. Payment: When a payment is received, the user enters the amount and payment method.
6. Backend and database: Next.js validates the amount, then Prisma saves a Payment linked to the invoice and updates its status.
7. Back to the frontend: The screen displays the new amount paid, remaining balance and payment status.
Payment statuses, notifications and reminders
Status	Meaning
Unpaid	The invoice has no recorded payment.
Partially Paid	A payment has been recorded, but some money is still outstanding.
Paid	The invoice has been paid in full.
Due Soon	The invoice is unpaid or partly paid and is due within the next seven days.
Overdue	The due date has passed and the invoice still has an outstanding balance.
Resolved	An active reminder is resolved after full payment.


How reminders communicate with the database:
1. The user opens Reminders and selects Check invoices.
2. The frontend sends a request to POST /api/reminders/sync.
3. The backend queries Neon for invoices that have not been fully paid.
4. It compares the invoice due dates with the current date and creates or updates reminder records in Neon.
5. The frontend reloads the reminders and displays their updated statuses.
6. When an invoice is paid in full, the payment process also resolves its active reminder.
These are on-screen payment updates and reminders. The current system does not automatically send email or SMS reminders. For quotation and invoice emails, the user can open their default email application and manually attach the downloaded PDF.
How the Presentation, Application and Data Layers communicate
                    USER
         Logs in / saves a quotation
                      |
                      v
       PRESENTATION LAYER — FRONTEND
               React + Next.js
       Sends an HTTP request to /api/...
                      |
                      v
        APPLICATION LAYER — BACKEND
              Next.js API routes
       Checks login, role and input
              Uses Prisma ORM
                      |
                      v
           DATA LAYER — DATABASE
               Neon PostgreSQL
       Saves or retrieves related rows
                      |
                      v
        BACKEND RETURNS A RESPONSE
         Saved record or error message
                      |
                      v
         FRONTEND UPDATES THE SCREEN
       User sees the saved information
Example of the communication: A quotation is not simply stored on the browser. SuppIT sends it to the backend, the backend saves it in Neon using Prisma, and the frontend loads it again when needed. The same process is used for invoices, payments and reminders.

======================================================================
5. How to Install and Run SuppIT Locally
======================================================================
Requirements
- A computer with Node.js and npm installed.
- Git to download the project from GitHub.
- Access to the Neon PostgreSQL database and its connection strings.
- PowerShell or the terminal built into WebStorm.

Installation commands — follow these numbered steps in order
1. Download the SuppIT project from GitHub. If the current project is already open in WebStorm, skip steps 1 and 2.
   git clone https://github.com/WaterMark38/SuppIT.git

2. Open the downloaded project folder.
   cd SuppIT

3. Install the required packages.
   npm install

4. Create the private environment file, only if it does not already exist.
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   Open .env and enter the appropriate credentials provided privately for the demonstration database:
   DATABASE_URL="YOUR_NEON_POOLED_CONNECTION_STRING"
   DIRECT_URL="YOUR_NEON_DIRECT_CONNECTION_STRING"
   SESSION_SECRET="YOUR_PRIVATE_SESSION_SECRET"
   DATABASE_URL uses Neon's pooled connection; DIRECT_URL uses the direct connection. Never upload .env to GitHub. The lecturer will need authorized database access or a configured demonstration environment; cloning the source code alone does not copy the database records.

5. Validate the Prisma database schema.
   npm run db:validate

6. Generate the Prisma Client.
   npm run db:generate

7. Check the database migration status.
   npx prisma migrate status
   Only for a new, empty development database that has not yet received the project migrations, apply the included migrations:
   npm run db:deploy
   Do not reset the existing SuppIT Neon database or run first-time migration commands against data you need to keep.

8. Start the Next.js frontend and backend together.
   npm run dev

9. Open SuppIT in the browser.
   http://localhost:3000

10. Stop SuppIT when finished. Press Ctrl + C in the terminal.
First-time administrator setup — new company only
If the database contains no company or administrator yet, an initial setup script is available:
npm run admin:create
Do not rerun it on an existing company just to change a password. The Super Admin and lecturer Admin accounts have a separate setup process and must be tested before the lecturer demonstration.
Useful troubleshooting checks
- Run npm run db:validate if Prisma reports schema errors.
- Run npm run db:generate after database schema changes.
- Run npx prisma migrate status to confirm the intended Neon database and migration status.
- Run npm run build to check whether the application builds successfully before submission.
- Check the WebStorm terminal if the frontend shows a login, API or database error.
Project Status
The initial database structure, Prisma migrations and original administrator setup were completed in the development environment. The Super Admin / lecturer account configuration and full quotation → order → invoice → payment → reminder workflow should be tested and confirmed before final submission. Some screens and integrations remain under development.

Developed by WaterMark Dev Team | SuppIT Phase 5