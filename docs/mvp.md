# Furniture Receivables & Collections App — 2-Day MVP Scope

## Goal

Build a simple internal web app that helps the business track the core collections workflow:

```text
Customer → Receivable → Payment → Balance → Overdue
```

The 2-day MVP should answer:

- Who owes money?
- How much is unpaid?
- Who has paid?
- Which accounts are overdue?
- Which distributor is responsible?
- Which customers are risky or blacklisted?

This is not the full final system. It is a scoped-down MVP focused only on receivables and collections.

---

## Included in This MVP

- Login/logout
- Admin and distributor roles
- Distributor management
- Customer management
- Customer risk status
- Receivable/sale creation
- Balance calculation
- Payment recording
- Overdue account list
- Basic dashboard totals
- Distributor data restrictions
- Online vs distributor sales channel tagging

---

## Not Included

The following are intentionally excluded from the 2-day MVP:

- Offline mode and sync
- Full GPS map view
- Advanced role matrix
- User management UI
- Password reset
- Fund release tracking
- Audit log viewer
- Full blacklist approval workflow
- Payment correction/void workflow
- Full payment schedule generation
- CSV exports
- Advanced reports
- Native mobile app
- SMS reminders
- Push notifications
- Route planning
- Inventory management
- Accounting integration
- Payment gateway integration

---

## User Roles

## Admin

Admin can:

- Log in
- View dashboard
- Manage distributors
- Add/edit customers
- View all customers
- Create receivables
- View all receivables
- Record payments
- View overdue accounts
- Mark customers as:
  - Good
  - Watchlist
  - Blacklisted
- View all distributor and online records

## Distributor

Distributor can:

- Log in
- View own dashboard
- Add own customers
- Edit own customers
- Create receivables for own customers
- Record payments for own customers
- View own receivables
- View own overdue accounts

Distributor cannot:

- View other distributors’ customers
- View other distributors’ receivables
- Manage distributors
- Create sales for blacklisted customers

---

## Permissions

| Feature                      |    Admin |        Distributor |
| ---------------------------- | -------: | -----------------: |
| Login/logout                 |      Yes |                Yes |
| View dashboard               | All data |      Own data only |
| Manage distributors          |      Yes |                 No |
| Add customers                |      Yes |                Yes |
| Edit customers               |      Yes |           Own only |
| View customers               |      All |           Own only |
| Add receivables              |      Yes | Own customers only |
| Record payments              |      Yes | Own customers only |
| View receivables             |      All |           Own only |
| View overdue accounts        |      All |           Own only |
| Mark customer as watchlist   |      Yes | Own customers only |
| Mark customer as blacklisted |      Yes |                 No |
| Delete financial records     |       No |                 No |

---

## Core Workflows

## Admin Workflow

1. Admin logs in.
2. Admin creates distributor.
3. Admin adds or reviews customer records.
4. Admin creates receivable/sale record.
5. Admin records customer payment.
6. System updates balance.
7. Admin views overdue accounts.
8. Admin marks risky customers as watchlist or blacklisted.
9. Admin checks dashboard totals.

## Distributor Workflow

1. Distributor logs in.
2. Distributor adds customer.
3. Distributor records customer address and optional GPS coordinates.
4. Distributor creates receivable/sale.
5. Distributor records payment when customer pays.
6. System updates customer balance.
7. Distributor views own overdue accounts.

## Payment Workflow

1. User opens receivable record.
2. User records payment amount.
3. System validates that payment does not exceed remaining balance.
4. System saves payment.
5. System recalculates current balance.
6. If balance becomes zero, receivable is marked as fully paid.
7. If balance remains unpaid after due date, receivable appears as overdue.

## Watchlist / Blacklist Workflow

1. Customer is marked as one of:
   - Good
   - Watchlist
   - Blacklisted
2. If customer is on watchlist, system shows warning before sale.
3. If customer is blacklisted:
   - Admin can still create receivable if needed.
   - Distributor cannot create new receivable for that customer.

---

## Required Pages

1. Login
2. Dashboard
3. Distributors
4. Add/Edit Distributor
5. Customers
6. Add/Edit Customer
7. Customer Profile
8. Receivables
9. Add Receivable
10. Receivable Detail
11. Record Payment
12. Overdue Accounts

---

## Modules

## 1. Authentication

### Included

- Login page
- Logout
- Protected pages
- Admin role
- Distributor role
- Seed initial admin account

### Acceptance Criteria

- Admin can log in.
- Distributor can log in.
- Logged-out users cannot access protected pages.
- Distributor cannot access admin-only pages.
- Distributor can only view own records.

---

## 2. Distributor Management

### Included

- Distributor list
- Add distributor
- Edit distributor

### Fields

```text
distributors
- id
- name
- phone
- address
- assigned_area
- status
- created_at
- updated_at
```

### Statuses

```text
active
inactive
```

### Acceptance Criteria

- Admin can add distributor.
- Admin can edit distributor.
- Admin can view distributor list.
- Distributor users can be linked to distributor records.

---

## 3. Customer Management

### Included

- Customer list
- Add customer
- Edit customer
- Customer profile

### Fields

```text
customers
- id
- full_name
- phone
- address
- latitude
- longitude
- sales_channel
- distributor_id
- risk_status
- notes
- created_by
- created_at
- updated_at
```

### Sales Channels

```text
online
distributor
```

### Risk Statuses

```text
good
watchlist
blacklisted
```

### Rules

- Customer phone number should be checked for duplicates.
- If duplicate phone number exists, show warning.
- Distributor customers must be linked to a distributor.
- Distributor users can only see customers linked to their distributor.
- Admin can see all customers.
- GPS coordinates are optional.

### Acceptance Criteria

- Admin can create customer.
- Distributor can create own customer.
- Admin can view all customers.
- Distributor can view only own customers.
- Customer profile shows linked receivables.
- Customer risk status is visible before sale creation.

---

## 4. Receivables

### Included

- Receivables list
- Add receivable
- Receivable detail page
- Automatic balance calculation
- Basic overdue detection

### Fields

```text
receivables
- id
- customer_id
- distributor_id
- sales_channel
- sale_date
- product_description
- total_amount
- down_payment
- original_balance
- current_balance
- payment_term_months
- monthly_due_amount
- first_due_date
- status
- created_by
- created_at
- updated_at
```

### Statuses

```text
current
overdue
fully_paid
```

### Calculations

Original balance:

```text
original_balance = total_amount - down_payment
```

Current balance:

```text
current_balance = original_balance - total_payments
```

Monthly due amount:

```text
monthly_due_amount = original_balance / payment_term_months
```

Default payment term:

```text
10 months
```

### Simplified Overdue Logic

```text
If today is after first_due_date
and current_balance is greater than 0,
mark/show the receivable as overdue.
```

### Rules

- Creating a sale creates a receivable.
- Down payment cannot exceed total amount.
- Current balance is automatically calculated.
- Monthly due amount is automatically calculated.
- Fully paid receivables are marked as fully paid.
- Distributor cannot create receivable for blacklisted customers.
- Admin can create receivable for blacklisted customers if needed.

### Acceptance Criteria

- User can create receivable.
- System calculates original balance.
- System calculates monthly due amount.
- System calculates current balance.
- Receivable shows payment history.
- Receivable becomes fully paid when balance reaches zero.
- Overdue receivable appears in overdue page.

---

## 5. Payment Tracking

### Included

- Record payment form
- Payment history on receivable detail page
- Balance update after payment

### Fields

```text
payments
- id
- receivable_id
- customer_id
- amount
- payment_date
- payment_method
- reference_number
- notes
- recorded_by
- created_at
- updated_at
```

### Payment Methods

```text
cash
gcash
bank_transfer
other
```

### Rules

- Payment must be linked to receivable.
- Payment reduces current balance.
- Payment amount cannot exceed current balance.
- Payment amount must be greater than zero.
- Payments should not be hard deleted.
- Distributor can only record payments for own receivables.
- Admin can record payments for any receivable.

### Acceptance Criteria

- User can record payment.
- System updates current balance.
- System prevents overpayment.
- Payment appears in receivable payment history.
- Fully paid receivable is marked as fully paid.

---

## 6. Overdue Accounts

### Included

- Overdue accounts list

### Columns

- Customer name
- Phone
- Sales channel
- Distributor
- Product/item description
- Total amount
- Current balance
- First due date
- Days overdue
- Status

### Optional Filters

- Distributor
- Sales channel
- Status

### Days Overdue Calculation

```text
days_overdue = today - first_due_date
```

Only show receivable as overdue if:

```text
current_balance > 0
and today > first_due_date
```

### Acceptance Criteria

- Admin can view all overdue accounts.
- Distributor can view only own overdue accounts.
- Overdue page shows customer, balance, and due date.
- Fully paid receivables do not appear as overdue.

---

## 7. Watchlist / Blacklist

### Included

- Customer risk status field
- Warning before receivable creation
- Blacklisted customer blocking for distributors

### Risk Statuses

```text
good
watchlist
blacklisted
```

### Rules

- Good customers have no warning.
- Watchlist customers show warning before sale.
- Blacklisted customers show strong warning.
- Distributor cannot create new receivable for blacklisted customers.
- Admin can still create receivable for blacklisted customers.

### Acceptance Criteria

- Customer can be marked as good, watchlist, or blacklisted.
- Warning appears for watchlist customers.
- Distributor is blocked from creating receivable for blacklisted customer.
- Admin can still create receivable for blacklisted customer.

---

## 8. Dashboard

### Admin Dashboard Cards

- Total receivables
- Total collected
- Total outstanding balance
- Total overdue amount
- Number of active receivables
- Number of overdue receivables
- Number of watchlist customers
- Number of blacklisted customers

### Distributor Dashboard Cards

- Own total receivables
- Own total collected
- Own outstanding balance
- Own overdue amount
- Own active receivables
- Own overdue receivables

### Calculations

Total receivables:

```text
sum(total_amount)
```

Total collected:

```text
sum(payments.amount)
```

Outstanding balance:

```text
sum(current_balance)
```

Total overdue amount:

```text
sum(current_balance where receivable is overdue)
```

### Acceptance Criteria

- Admin sees business-wide totals.
- Distributor sees only own totals.
- Dashboard updates after receivable or payment creation.

---

## Data Model

Only five tables are required for the 2-day MVP.

## users

```text
users
- id
- full_name
- email
- password_hash
- role
- distributor_id
- created_at
- updated_at
```

Roles:

```text
admin
distributor
```

## distributors

```text
distributors
- id
- name
- phone
- address
- assigned_area
- status
- created_at
- updated_at
```

Statuses:

```text
active
inactive
```

## customers

```text
customers
- id
- full_name
- phone
- address
- latitude
- longitude
- sales_channel
- distributor_id
- risk_status
- notes
- created_by
- created_at
- updated_at
```

Sales channels:

```text
online
distributor
```

Risk statuses:

```text
good
watchlist
blacklisted
```

## receivables

```text
receivables
- id
- customer_id
- distributor_id
- sales_channel
- sale_date
- product_description
- total_amount
- down_payment
- original_balance
- current_balance
- payment_term_months
- monthly_due_amount
- first_due_date
- status
- created_by
- created_at
- updated_at
```

Statuses:

```text
current
overdue
fully_paid
```

## payments

```text
payments
- id
- receivable_id
- customer_id
- amount
- payment_date
- payment_method
- reference_number
- notes
- recorded_by
- created_at
- updated_at
```

---

## 2-Day Build Plan

## Day 1 — Setup, Customers, Receivables

### Morning

- [ ] Create project/repository
- [ ] Set up database
- [ ] Set up authentication
- [ ] Create users table
- [ ] Seed initial admin account
- [ ] Create protected app layout
- [ ] Add login/logout

### Midday

- [ ] Create distributors table
- [ ] Build distributor list
- [ ] Build add/edit distributor form
- [ ] Create customers table
- [ ] Build customer list
- [ ] Build add/edit customer form
- [ ] Add customer profile page

### Afternoon

- [ ] Create receivables table
- [ ] Build add receivable form
- [ ] Add balance calculation
- [ ] Add monthly due calculation
- [ ] Build receivable list
- [ ] Build receivable detail page
- [ ] Add role filtering:
  - Admin sees all records
  - Distributor sees own records only

### End of Day 1 Target

The app should allow:

- Admin login
- Distributor login
- Admin creates distributors
- Users create customers
- Users create receivables
- System calculates balances
- Admin sees all records
- Distributor sees own records only

---

## Day 2 — Payments, Overdue, Dashboard, Risk Status

### Morning

- [ ] Create payments table
- [ ] Build record payment form
- [ ] Show payment history on receivable detail page
- [ ] Update current balance after payment
- [ ] Prevent overpayment
- [ ] Mark receivable as fully paid when balance is zero

### Midday

- [ ] Add overdue calculation
- [ ] Build overdue accounts page
- [ ] Add customer risk status
- [ ] Show watchlist warning before sale
- [ ] Block distributor from creating receivable for blacklisted customer

### Afternoon

- [ ] Build admin dashboard
- [ ] Build distributor dashboard
- [ ] Add basic filters if time allows
- [ ] Test admin workflow
- [ ] Test distributor workflow
- [ ] Fix critical bugs
- [ ] Deploy MVP

### End of Day 2 Target

The app should allow:

- Receivable tracking
- Payment recording
- Automatic balance updates
- Overdue account visibility
- Watchlist/blacklist warning
- Dashboard totals
- Basic deployment for internal use

---

## Priority Backlog

## Must Have

- [ ] Login/logout
- [ ] Admin role
- [ ] Distributor role
- [ ] Distributor CRUD
- [ ] Customer CRUD
- [ ] Customer risk status
- [ ] Receivable creation
- [ ] Balance calculation
- [ ] Monthly due calculation
- [ ] Payment recording
- [ ] Payment history
- [ ] Overpayment prevention
- [ ] Overdue account list
- [ ] Basic dashboard
- [ ] Distributor data restriction

## Nice to Have

- [ ] GPS current location capture
- [ ] Duplicate customer warning by phone number
- [ ] Sales channel filter
- [ ] Distributor filter
- [ ] Simple CSV export
- [ ] Basic payment audit log
- [ ] Simple aging buckets

## Not for 2-Day MVP

- [ ] Offline mode
- [ ] Sync system
- [ ] Full GPS map
- [ ] Fund release tracking
- [ ] Full audit logs
- [ ] User management UI
- [ ] Blacklist approval workflow
- [ ] Payment correction workflow
- [ ] Full reports
- [ ] Native mobile app
- [ ] Inventory management

---

## Business Rules

## Distributor Rules

- Distributor can only view own customers.
- Distributor can only view own receivables.
- Distributor can only record payments for own customers.
- Distributor cannot create receivable for blacklisted customer.
- Distributor cannot manage other distributors.

## Customer Rules

- Customer can belong to either:
  - Online sales channel
  - Distributor sales channel
- Customer may have multiple receivables.
- Customer risk status is visible before sale.
- Customer risk status options are:
  - Good
  - Watchlist
  - Blacklisted

## Receivable Rules

- Receivable is created when a sale is recorded.
- Balance equals:

```text
total amount - down payment - payments
```

- Default payment term is 10 months.
- Monthly due amount equals:

```text
original balance / payment term months
```

- Fully paid receivable should automatically close.
- Overdue account appears when:

```text
current balance > 0
and today > first due date
```

## Payment Rules

- Payment must be linked to receivable.
- Payment must reduce receivable balance.
- Payment cannot exceed current balance.
- Payment records should not be hard deleted.
- Payment amount must be greater than zero.

---

## Basic Metrics

The dashboard should track:

- Total receivables
- Total collections
- Total outstanding balance
- Total overdue amount
- Number of active receivables
- Number of overdue receivables
- Number of watchlist customers
- Number of blacklisted customers

Distributor dashboards should show the same metrics, filtered to the distributor’s own data only.

---

## Definition of Done

A feature is considered done when:

- [ ] Database changes are complete
- [ ] Backend/API logic is complete
- [ ] Frontend UI is complete
- [ ] Role permissions are enforced
- [ ] Basic validation is implemented
- [ ] Error handling is implemented
- [ ] Feature works for admin
- [ ] Feature works for distributor, if applicable
- [ ] Feature has been manually tested
- [ ] Critical bugs are fixed
- [ ] Feature is deployed or ready to deploy

---

## MVP Acceptance Criteria

The 2-day MVP is successful if:

- [ ] Admin can log in.
- [ ] Distributor can log in.
- [ ] Admin can create distributors.
- [ ] Admin can create customers.
- [ ] Distributor can create own customers.
- [ ] Admin can see all customers.
- [ ] Distributor can only see own customers.
- [ ] User can create receivable from customer.
- [ ] System calculates original balance.
- [ ] System calculates monthly due amount.
- [ ] User can record payment.
- [ ] System updates current balance.
- [ ] System prevents overpayment.
- [ ] Fully paid receivable is marked fully paid.
- [ ] Overdue receivables appear in overdue list.
- [ ] Customer can be marked good, watchlist, or blacklisted.
- [ ] Watchlist customers show warning before sale.
- [ ] Distributor cannot create sale for blacklisted customer.
- [ ] Admin dashboard shows basic business totals.
- [ ] Distributor dashboard shows own totals only.

---

## Suggested Phase 2

After the 2-day MVP is working, build the next features in this order:

1. Full payment schedule table
2. Better overdue and aging bucket logic
3. Fund release tracking
4. Payment correction/void workflow
5. Audit logs
6. CSV exports
7. Full blacklist approval workflow
8. GPS map view
9. Offline mode and sync
10. User management UI
11. More advanced reports
12. Inventory management

---

## Final Scope Reminder

For this 2-day MVP, focus only on:

```text
Customer → Receivable → Payment → Balance → Overdue
```

Do not add extra features unless they directly support the receivables and collections workflow.
