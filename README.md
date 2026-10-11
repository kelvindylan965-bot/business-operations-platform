# Business Operations Platform

A web application for managing the main tasks involved in running a small business.

I built this project to practise what I learned in full-stack web development and apply it to something practical. I wanted to bring the frontend, backend, and database together in one application that can help manage everyday business tasks.

The application brings customer records, products, stock, orders, payments, expenses, and reports into one place.

## Why I Built It

Small businesses need to keep track of customers, products, stock levels, orders, payments, and expenses. I wanted to build an application that brings these tasks together while giving me practical experience connecting different parts of a full-stack application.

This project also gives me a way to demonstrate my development skills through a working application.

## What the Application Does

- **Dashboard:** Provides an overview of business activity.
- **Customers:** Stores customer records.
- **Products:** Stores product details and prices.
- **Inventory:** Tracks stock quantities and reorder levels.
- **Orders:** Manages orders, calculates totals, and checks stock when an order is confirmed.
- **Payments:** Manages payment records and payment verification permissions.
- **Expenses:** Records business expenses, categories, amounts, and dates.
- **Reports:** Provides business reporting information.
- **Login and permissions:** Controls access to features and business data.

## Technologies Used

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- REST API
- JSON Web Tokens (JWT)

**Database**
- PostgreSQL

**Development Tools**
- Git
- npm
- Visual Studio Code
- Docker-based development environment

## Screenshots

### Dashboard

![Dashboard — top](Screenshots/dashboard-top.png)

![Dashboard — bottom](Screenshots/dashboard-bottom.png)

### Customers and Staff

![Customers](screenshots/customers.png)

![Staff](screenshots/staff.png)

### Products and Inventory

![Products](screenshots/products.png)

![Inventory](screenshots/inventory.png)

### Orders and Payments

![Orders](screenshots/orders.png)

![Payments](screenshots/payments.png)

### Expenses and Reports

![Expenses](screenshots/expenses.png)

![Reports](screenshots/reports.png)

## Running the Project Locally

### Requirements

- Node.js and npm
- PostgreSQL
- Git

### 1. Get the source code

After the repository is published, clone it using:

```bash
git clone https://github.com/kelvindylan965-bot/business-operations-platform.git
cd business-operations-platform
```

### 2. Install backend dependencies

From the project root, run:

```bash
npm install
```

### 3. Configure the database

Set up PostgreSQL and configure the environment variables required by the backend. Use the project's database schema and configuration as a guide.

Keep database credentials, passwords, JWT secrets, and other private settings out of GitHub.

### 4. Start the backend

From the project root, run:

```bash
npm run dev
```

### 5. Start the frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite in your browser.

The database and environment configuration must be set up for your own computer before the application can run.

## What I Learned

Building this project gave me practical experience connecting a frontend to a backend, working with PostgreSQL, creating API endpoints, handling authentication and permissions, validating user input, and managing related business records.

It also helped me understand how important it is for different features to work together and for the underlying data to remain consistent.

## Author

**Kelvin Kiptoo Ngetich**

GitHub: [kelvindylan965-bot](https://github.com/kelvindylan965-bot)
