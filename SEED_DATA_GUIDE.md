# Seed Data Guide

## Overview

The seed data system allows you to populate your CRM with test data for development and testing purposes. This includes clients, products, deals, quotes, invoices, contracts, forecasts, messages, and feedback.

## Accessing Seed Data Management

1. Log into the CRM system
2. Navigate to **"Seed Data"** in the top navigation menu
3. You'll see the Seed Data Management page

## Seed Data Contents

The seed data includes:

### Clients (6 total)
- **ABC Manufacturing** - Corporate, Active (R1.25M YTD Revenue)
- **Tech Solutions SA** - Corporate, Active (R980K YTD Revenue)
- **Greenfield High School** - School, Active (R450K YTD Revenue)
- **Metro Logistics** - Corporate, Pending (R0 YTD, R250K Pipeline)
- **Premier Academy** - School, Prospect (R0 YTD, R150K Pipeline)
- **Construction Corp** - Corporate, Active (R2.1M YTD Revenue)

### Products (9 total)
- **Learnerships**: 3 programs across different clients
- **TAP Business**: 2 programs
- **Compliance**: 3 training programs (First Aid, Fire Fighter, OHS)
- **Other Courses**: 1 program (Basic Excel)

### Deals (6 total)
Distributed across all 6 pipeline stages:
- Lead Generation: 1 deal
- Initial Contact: 1 deal
- Needs Assessment: 1 deal
- Proposal Sent: 1 deal
- Negotiation: 1 deal
- Deal Closed: 1 deal

### Financial Data
- **Quotes**: 4 quotes (various statuses)
- **Invoices**: 5 invoices (Paid, Pending, Unpaid)
- **Forecasts**: 2 revenue forecasts for 2025-2026

### Contracts (4 total)
- SLA (Service Level Agreement)
- MSA (Master Service Agreement)
- SOW (Statement of Work)
- Mix of Active and Pending statuses

### Messages (4 total)
- Various statuses: Unread, Assigned, In Progress, Resolved
- Different types: Support Request, Question, Issue, General

### Feedback (3 total)
- Client feedback entries with ratings and comments

## Using Seed Data

### Step 1: Select Users

Before seeding data, you need to select which users will be assigned to the seed data:

1. The system will automatically try to detect users based on email/title
2. You can manually select users from the dropdowns:
   - **Sales Person 1**: Required - will be assigned to most clients
   - **Sales Person 2**: Required - will be assigned to some clients
   - **Admin**: Optional - used for admin-related messages
   - **Manager**: Optional - used for management messages

### Step 2: Choose Action

You have three options:

#### Option 1: Reset & Seed Data (Recommended for Testing)
- **Deletes ALL existing data** (clients, deals, products, etc.)
- Creates fresh seed data
- Use this when you want a clean slate for testing

**Warning**: This will permanently delete all your data!

#### Option 2: Add Seed Data Only
- Adds seed data **without** deleting existing data
- Useful if you want to keep some existing data
- May create duplicate IDs if data already exists

#### Option 3: Clear All Data
- Deletes all data **without** adding seed data
- Use with extreme caution!
- Useful for completely clearing the database

## User ID Requirements

- **Minimum**: Sales Person 1 and Sales Person 2 must be selected
- **Optional**: Admin and Manager can be left empty (will use auto-detected or placeholder IDs)

## Testing the System

After seeding data, you can test:

1. **Dashboard**: View financial dashboard, pipeline stats, messages, and feedback
2. **Clients**: Browse client list, filter by status/type, view client details
3. **Sales Pipeline**: See deals across all 6 stages, move deals between stages
4. **Messages**: View messages in different status tabs, create new messages
5. **Profile**: View and edit user profiles

## Resetting to Seed Data

To reset back to seed data at any time:

1. Go to **Seed Data** page
2. Select your users (if needed)
3. Click **"Reset & Seed Data"**
4. Confirm the action

## Important Notes

- Seed data uses **fixed IDs** (e.g., 'client1', 'deal1') for consistency
- User IDs are dynamically assigned based on your selection
- All dates are set to realistic values (2024-2025)
- Currency values are in South African Rand (ZAR)
- The seed data represents a realistic CRM scenario

## Troubleshooting

### "Please select at least two salesperson users"
- Make sure you have at least 2 users in your Firestore `users` collection
- Select Sales Person 1 and Sales Person 2 from the dropdowns

### "Failed to seed data"
- Check browser console for detailed error messages
- Ensure you have write permissions in Firestore
- Verify Firestore security rules allow writes

### Data not appearing
- Refresh the page after seeding
- Check Firestore Console to verify data was created
- Ensure you're logged in with proper permissions

## Customizing Seed Data

To customize the seed data, edit `src/services/seedDataService.js`:

- Modify client data in the `clients` array
- Add/remove products in the `products` array
- Adjust deals in the `deals` array
- Update forecasts, quotes, invoices, etc.

Then use "Reset & Seed Data" to apply your changes.






