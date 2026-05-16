# Furniture Receivables & Collections App — Demo MVP Scope

## Goal

Build a fast internal demo MVP for tracking customer receivables, payments, overdue accounts, and customer locations.

The demo should clearly answer:

- Who owes money?
- How much is unpaid?
- Who has paid?
- Which accounts are overdue?
- Where are the customers located?
- Which customers are risky or blacklisted?

The demo MVP should focus only on:

```text
Customer Location → Receivable → Payment → Balance → Overdue
```

---

# MVP Strategy

This version is intentionally smaller than the full system.

The goal is to finish quickly and produce a convincing client demo, not a complete production system.

Maps/customer location are considered a core demo feature because the client specifically wants to know where customers are located.

---

# Recommended Demo Scope

## Must Have

- Login/logout
- Protected pages
- Customer management
- Customer location capture
- Map view with customer pins
- Customer risk status
- Receivable creation
- Balance calculation
- Payment recording
- Payment history
- Overpayment prevention
- Overdue account list
- Basic dashboard totals

## Should Have If Time Allows

- Distributor field on customers and receivables
- Distributor filtering
- Distributor login with own-record restrictions

## Cut From Demo

The following should be removed or postponed to keep the MVP fast:

- Distributor CRUD UI
- Full user management UI
- Password reset
- Advanced role matrix
- Full dashboard metrics
- Full payment schedule generation
- CSV exports
- Audit logs
- Payment correction/void workflow
- Blacklist approval workflow
- Advanced reports
- Offline mode
- Sync system
- Native mobile app
- SMS reminders
- Push notifications
- Route planning
- Inventory management
- Accounting integration
- Payment gateway integration

---

# Core Demo Workflow

The demo should follow this story:

1. Admin logs in.
2. Admin views dashboard totals.
3. Admin opens the map view.
4. Admin sees customer pins on the map.
5. Admin clicks a customer pin.
6. Admin opens the customer profile.
7. Admin views customer receivables and unpaid balance.
8. Admin records a payment.
9. System updates the current balance.
10. Admin opens overdue accounts.
11. Admin sees overdue customers and their locations.
12. Admin adds a new customer using current location.
13. Admin creates a receivable for that customer.
14. Customer appears on the map.

This demonstrates the core value:

```text
See who owes money, how much they owe, who is overdue, and where they are.
```

---

# User Roles

## Demo Recommendation

For the fastest demo, use only an admin login.

If distributor access is important for the demo, add one distributor login with restricted data.

## Admin

Admin can:

- Log in
- View dashboard
- Add/edit customers
- View all customers
- View map of all customers
- Create receivables
- View all receivables
- Record payments
- View overdue accounts
- Mark customers as:
  - Good
  - Watchlist
  - Blacklisted
- Create receivables for blacklisted customers if needed

## Distributor Optional

Distributor can:

- Log in
- View own dashboard
- Add own customers
- Edit own customers
- View own customers on map
- Create receivables for own customers
- Record payments for own customers
- View own overdue accounts

Distributor cannot:

- View other distributors’ customers
- View other distributors’ receivables
- Create receivables for blacklisted customers
- Manage distributors

---

# Required Pages

For the demo MVP, use fewer pages.

## Required

1. Login
2. Dashboard
3. Customers
4. Add/Edit Customer
5. Customer Profile
6. Map View
7. Add Receivable
8. Receivable Detail
9. Overdue Accounts

## Optional

1. Receivables List
2. Distributor Filter
3. Distributor Login

## Removed From Demo

- Distributors page
- Add/Edit Distributor page
- User management page
- Advanced reports page
- CSV export page

---

# Modules

---

## 1. Authentication

### Included

- Login page
- Logout
- Protected pages
- Seed initial admin account

### Optional

- Distributor role
- Distributor data restriction

### Acceptance Criteria

- Admin can log in.
- Logged-out users cannot access protected pages.
- Admin can access all demo records.
- If distributor login is included, distributor only sees own records.

---

## 2. Customer Management

### Included

- Customer list
- Add customer
- Edit customer
- Customer profile
- Customer location fields
- Customer risk status

### Fields

```text
customers
- id
- full_name
- phone
- address
- latitude
- longitude
- distributor_id
- risk_status
- notes
- created_at
- updated_at
```

### Risk Statuses

```text
good
watchlist
blacklisted
```

### Rules

- GPS coordinates are optional but strongly recommended.
- Customer may have multiple receivables.
- Customer risk status must be visible before creating a receivable.
- Watchlist customers should show a warning.
- Blacklisted customers should show a strong warning.
- Distributor users, if included, can only see their own customers.

### Acceptance Criteria

- Admin can create customer.
- Admin can edit customer.
- Admin can view customer profile.
- Customer profile shows linked receivables.
- Customer profile shows customer location.
- Customer risk status is visible.
- Customer can be marked good, watchlist, or blacklisted.

---

## 3. Customer Location and Maps

Maps are part of the demo MVP.

### Included

- Latitude and longitude fields on customer
- `Use Current Location` button
- Map preview on customer profile
- Map page showing customer pins
- Link to open customer location in Google Maps

### Customer Form Location Features

The add/edit customer form should include:

```text
address
latitude
longitude
```

Buttons:

```text
Use Current Location
Open in Google Maps
```

### Map Page

The map page should show all customers with valid coordinates.

Each customer pin should show:

- Customer name
- Phone
- Risk status
- Current outstanding balance
- Distributor, if available
- Link to customer profile
- Link to open in Google Maps

### Map Implementation Recommendation

Use Leaflet with OpenStreetMap for the demo.

Why:

- Fast to implement
- Free
- No Google Maps billing setup
- Good enough for customer pins and popups

Google Maps links can still be used for navigation.

### Google Maps Link Format

```text
https://www.google.com/maps?q={latitude},{longitude}
```

Example:

```text
https://www.google.com/maps?q=14.5995,120.9842
```

### Not Included

- Route planning
- Live GPS tracking
- Distributor tracking
- Offline maps
- Geofencing
- Advanced clustering
- Heatmaps

### Acceptance Criteria

- User can save customer latitude and longitude.
- User can click `Use Current Location`.
- Customer profile shows customer location.
- Map page shows customer pins.
- User can open location in Google Maps.

---

## 4. Receivables

### Included

- Add receivable
- Receivable detail page
- Automatic balance calculation
- Basic overdue detection
- Payment history on receivable detail page

### Fields

```text
receivables
- id
- customer_id
- distributor_id
- sale_date
- product_description
- total_amount
- down_payment
- original_balance
- current_balance
- first_due_date
- status
- created_at
- updated_at
```

### Optional Fields

Only include these if monthly installment terms are important for the demo:

```text
payment_term_months
monthly_due_amount
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

If monthly terms are included:

```text
monthly_due_amount = original_balance / payment_term_months
```

Default payment term, if used:

```text
10 months
```

### Simplified Overdue Logic

```text
If today is after first_due_date
and current_balance is greater than 0,
show the receivable as overdue.
```

### Rules

- Creating a sale creates a receivable.
- Down payment cannot exceed total amount.
- Current balance is automatically calculated.
- Fully paid receivables are marked as fully paid.
- Watchlist customers show a warning before sale.
- Distributor cannot create receivable for blacklisted customers.
- Admin can create receivable for blacklisted customers if needed.

### Acceptance Criteria

- User can create receivable.
- System calculates original balance.
- System calculates current balance.
- System prevents invalid down payment.
- Receivable shows payment history.
- Receivable becomes fully paid when balance reaches zero.
- Overdue receivable appears in overdue page.

---

## 5. Payment Tracking

### Included

- Record payment form
- Payment history on receivable detail page
- Balance update after payment
- Overpayment prevention

### Fields

```text
payments
- id
- receivable_id
- customer_id
- amount
- payment_date
- payment_method
- notes
- created_at
- updated_at
```

### Optional Fields

```text
reference_number
recorded_by
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
- Payment amount must be greater than zero.
- Payment amount cannot exceed current balance.
- Payment reduces current balance.
- Payments should not be hard deleted in the production version.
- Admin can record payments for any receivable.
- Distributor, if included, can only record payments for own receivables.

### Acceptance Criteria

- User can record payment.
- System updates current balance.
- System prevents overpayment.
- Payment appears in receivable payment history.
- Fully paid receivable is marked fully paid.

---

## 6. Overdue Accounts

### Included

- Overdue accounts list
- Link to customer profile
- Link to customer location/map

### Columns

- Customer name
- Phone
- Address
- Distributor, if available
- Product/item description
- Total amount
- Current balance
- First due date
- Days overdue
- Status
- Location link

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
- Distributor, if included, can view only own overdue accounts.
- Overdue page shows customer, balance, due date, and location.
- Fully paid receivables do not appear as overdue.

---

## 7. Watchlist / Blacklist

### Included

- Customer risk status field
- Risk badge on customer profile
- Warning before receivable creation
- Blacklisted customer blocking for distributors, if distributor login is included

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
- Distributor cannot create new receivable for blacklisted customer.
- Admin can still create receivable for blacklisted customer.

### Acceptance Criteria

- Customer can be marked as good, watchlist, or blacklisted.
- Risk status is visible on customer list and customer profile.
- Warning appears for watchlist customers.
- Strong warning appears for blacklisted customers.
- Distributor is blocked from creating receivable for blacklisted customer, if distributor role is included.
- Admin can still create receivable for blacklisted customer.

---

## 8. Dashboard

Keep the dashboard simple for the demo.

### Dashboard Cards

- Total receivables
- Total collected
- Total outstanding balance
- Total overdue amount

### Optional Cards

Only add if time allows:

- Number of active receivables
- Number of overdue receivables
- Number of watchlist customers
- Number of blacklisted customers

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
- Distributor, if included, sees own totals only.
- Dashboard updates after receivable or payment creation.

---

# Data Model

Only five tables are required.

---

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

### Roles

```text
admin
distributor
```

For the fastest demo, only `admin` is required.

---

## distributors

For the demo, distributors can be seeded instead of managed through UI.

```text
distributors
- id
- name
- phone
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

---

## customers

```text
customers
- id
- full_name
- phone
- address
- latitude
- longitude
- distributor_id
- risk_status
- notes
- created_at
- updated_at
```

### Risk Statuses

```text
good
watchlist
blacklisted
```

---

## receivables

```text
receivables
- id
- customer_id
- distributor_id
- sale_date
- product_description
- total_amount
- down_payment
- original_balance
- current_balance
- first_due_date
- status
- created_at
- updated_at
```

### Optional Fields

```text
payment_term_months
monthly_due_amount
```

### Statuses

```text
current
overdue
fully_paid
```

---

## payments

```text
payments
- id
- receivable_id
- customer_id
- amount
- payment_date
- payment_method
- notes
- created_at
- updated_at
```

### Optional Fields

```text
reference_number
recorded_by
```

### Payment Methods

```text
cash
gcash
bank_transfer
other
```

---

# Business Rules

## Customer Rules

- Customer may have multiple receivables.
- Customer location is stored using latitude and longitude.
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

- Down payment cannot exceed total amount.
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
- Payment amount must be greater than zero.

## Risk Rules

- Watchlist customers show a warning.
- Blacklisted customers show a strong warning.
- Admin can create receivable for blacklisted customer.
- Distributor cannot create receivable for blacklisted customer, if distributor role is included.

## Distributor Rules Optional

If distributor login is included:

- Distributor can only view own customers.
- Distributor can only view own receivables.
- Distributor can only record payments for own customers.
- Distributor cannot create receivable for blacklisted customer.
- Distributor cannot manage other distributors.

---

# Revised 2-Day Build Plan

---

## Day 1 — Setup, Customers, and Map

### Morning

- [ ] Create project/repository
- [ ] Set up database
- [ ] Set up authentication
- [ ] Create users table
- [ ] Seed initial admin account
- [ ] Create protected app layout
- [ ] Add login/logout

### Midday

- [ ] Create customers table
- [ ] Build customer list
- [ ] Build add/edit customer form
- [ ] Add risk status field
- [ ] Add latitude and longitude fields
- [ ] Add `Use Current Location` button
- [ ] Add customer profile page

### Afternoon

- [ ] Add map library
- [ ] Build map page
- [ ] Show customer pins on map
- [ ] Add popup with customer details
- [ ] Add link to customer profile
- [ ] Add Google Maps external link

### End of Day 1 Target

The app should allow:

- Admin login
- Add customers
- Edit customers
- Save customer location
- Capture current location
- View customers on map
- View customer profile

---

## Day 2 — Receivables, Payments, Overdue, Dashboard

### Morning

- [ ] Create receivables table
- [ ] Build add receivable form
- [ ] Add balance calculation
- [ ] Build receivable detail page
- [ ] Show receivables on customer profile
- [ ] Add watchlist/blacklist warning

### Midday

- [ ] Create payments table
- [ ] Build record payment form
- [ ] Show payment history on receivable detail page
- [ ] Update current balance after payment
- [ ] Prevent overpayment
- [ ] Mark receivable as fully paid when balance is zero

### Afternoon

- [ ] Add overdue calculation
- [ ] Build overdue accounts page
- [ ] Add basic dashboard cards
- [ ] Add demo data
- [ ] Test full demo workflow
- [ ] Fix critical bugs
- [ ] Deploy MVP

### End of Day 2 Target

The app should allow:

- Customer location tracking
- Map-based customer visibility
- Receivable tracking
- Payment recording
- Automatic balance updates
- Overdue account visibility
- Watchlist/blacklist warning
- Basic dashboard totals

---

# Priority Backlog

## Must Have

- [ ] Login/logout
- [ ] Protected pages
- [ ] Customer CRUD
- [ ] Customer location fields
- [ ] Use current location button
- [ ] Customer map view
- [ ] Customer profile
- [ ] Customer risk status
- [ ] Receivable creation
- [ ] Balance calculation
- [ ] Payment recording
- [ ] Payment history
- [ ] Overpayment prevention
- [ ] Overdue account list
- [ ] Basic dashboard

## Nice to Have

- [ ] Distributor field
- [ ] Distributor login
- [ ] Distributor data restriction
- [ ] Duplicate customer warning by phone number
- [ ] Sales channel field
- [ ] Basic filters
- [ ] Simple CSV export
- [ ] Simple aging buckets

## Not for Demo MVP

- [ ] Distributor CRUD UI
- [ ] Full user management UI
- [ ] Password reset
- [ ] Offline mode
- [ ] Sync system
- [ ] Full GPS map features
- [ ] Route planning
- [ ] Live tracking
- [ ] Fund release tracking
- [ ] Full audit logs
- [ ] Blacklist approval workflow
- [ ] Payment correction workflow
- [ ] Full reports
- [ ] Native mobile app
- [ ] Inventory management
- [ ] Accounting integration

---

# Demo Acceptance Criteria

The demo MVP is successful if:

- [ ] Admin can log in.
- [ ] Admin can create customers.
- [ ] Admin can add customer location.
- [ ] Admin can use current location to fill GPS coordinates.
- [ ] Admin can view customers on a map.
- [ ] Admin can open customer profile from map.
- [ ] Admin can create receivable from customer.
- [ ] System calculates original balance.
- [ ] System calculates current balance.
- [ ] Admin can record payment.
- [ ] System updates current balance.
- [ ] System prevents overpayment.
- [ ] Fully paid receivable is marked fully paid.
- [ ] Overdue receivables appear in overdue list.
- [ ] Overdue list shows customer location link.
- [ ] Customer can be marked good, watchlist, or blacklisted.
- [ ] Watchlist customers show warning before sale.
- [ ] Dashboard shows basic business totals.

---

# Definition of Done

A feature is considered done when:

- [ ] Database changes are complete
- [ ] Backend/API logic is complete
- [ ] Frontend UI is complete
- [ ] Basic validation is implemented
- [ ] Error handling is implemented
- [ ] Feature works in the demo flow
- [ ] Feature has been manually tested
- [ ] Critical bugs are fixed
- [ ] Feature is deployed or ready to deploy

---

# Recommended Final Demo Flow

Use this exact flow during the client demo:

1. Log in as admin.
2. Show dashboard totals:
   - Total receivables
   - Total collected
   - Outstanding balance
   - Overdue amount
3. Open map view.
4. Show customer pins.
5. Click an overdue or high-balance customer pin.
6. Open the customer profile.
7. Show customer risk status and receivables.
8. Open a receivable.
9. Record a payment.
10. Show the balance update.
11. Open overdue accounts.
12. Show overdue customers with balances and map links.
13. Add a new customer.
14. Click `Use Current Location`.
15. Save the customer.
16. Show the customer appearing on the map.
17. Create a receivable for the new customer.

---

# Suggested Phase 2

After the demo MVP is approved, build the next features in this order:

1. Distributor CRUD UI
2. Distributor login and strict data restrictions
3. Full payment schedule table
4. Better overdue and aging bucket logic
5. Duplicate customer detection by phone
6. CSV exports
7. Payment correction/void workflow
8. Audit logs
9. Full blacklist approval workflow
10. GPS map filters and clustering
11. Route planning
12. Offline mode and sync
13. User management UI
14. More advanced reports
15. Inventory management

---

# Final Scope Reminder

For this demo MVP, focus only on:

```text
Customer Location → Receivable → Payment → Balance → Overdue
```

Do not add extra features unless they directly support the demo workflow.
