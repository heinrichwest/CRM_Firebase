# SpecCon Holdings CRM System

A comprehensive B2B CRM system built with React and Firebase, designed for SpecCon Holdings to manage client relationships, sales pipeline, training products, financials, and contracts.

## Features

### Core Modules

1. **Dashboard**
   - Financial Dashboard with revenue by product line
   - Sales Pipeline widget
   - Messages widget
   - Client Feedback widget

2. **Client Management**
   - Client list with filtering and search
   - Client detail pages with tabs:
     - Overview (financial summary, recent quotes/invoices)
     - Products (training products by category)
     - Financials (quotes, invoices, revenue forecast)
     - Legal (contracts & legal documents)

3. **Sales Pipeline**
   - 6-stage Kanban board:
     - Lead Generation
     - Initial Contact
     - Needs Assessment
     - Proposal Sent
     - Negotiation
     - Deal Closed

4. **Messages/Support Ticketing**
   - Internal messaging system
   - Status tracking (Unread, Assigned, In Progress, Resolved)
   - Task assignment

5. **Products Management**
   - 4 product categories:
     - Learnerships
     - TAP Business
     - Compliance
     - Other Courses
   - Product reports and tracking

6. **Financial Management**
   - Quotes management
   - Invoices tracking
   - Revenue forecasting
   - Financial year tracking

7. **Legal/Contracts**
   - Contract management (SLA, MSA, SOW, NDA, Amendment)
   - Contract lifecycle management
   - Renewal and amendment tracking

8. **Client Feedback**
   - Feedback collection and analysis
   - Rating tracking
   - Follow-up management

## Technology Stack

- **Frontend**: React 18 with Vite
- **Backend**: Firebase (Firestore, Authentication)
- **Styling**: CSS with SpecCon brand colors
- **Routing**: React Router v6
- **Deployment**: Firebase Hosting

## Brand Colors

- **Primary Blue**: #12265E
- **Accent Orange**: #FFA600
- **Light Blue**: #92ABC4
- **White**: #FFFFFF

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Firebase account and project created
- Firebase CLI installed (`npm install -g firebase-tools`)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Firebase:**
   - Make sure your `.env` file contains:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Login to Firebase:**
```bash
firebase login
```

4. **Initialize Firebase project (if not already done):**
```bash
firebase init
```
   - Select Firestore and Hosting
   - Use existing project: `speccon-crm`
   - Public directory: `dist`
   - Single-page app: Yes

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

Build the application:
```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## Firebase Deployment

### Deploy to Firebase Hosting

1. **Build the application:**
```bash
npm run build
```

2. **Deploy to Firebase:**
```bash
npm run deploy
```

Or deploy only hosting:
```bash
npm run deploy:hosting
```

### Deploy Firestore Rules and Indexes

Deploy Firestore security rules and indexes:
```bash
npm run deploy:firestore
```

### Initial Firestore Setup

After deploying, you need to set up your Firestore database:

1. Go to Firebase Console → Firestore Database
2. The security rules are already configured in `firestore.rules`
3. The indexes are configured in `firestore.indexes.json`
4. Create indexes if prompted by Firebase Console

### Firestore Collections Structure

The system uses the following Firestore collections:

- `users` - User accounts
- `clients` - Client information
  - `clients/{clientId}/products` - Client products (subcollection)
  - `clients/{clientId}/contracts` - Client contracts (subcollection)
  - `clients/{clientId}/activities` - Activity log (subcollection)
- `deals` - Sales pipeline deals
- `quotes` - Client quotes
- `invoices` - Client invoices
- `messages` - Internal messages/tickets
- `forecasts` - Revenue forecasts
- `feedback` - Client feedback

## Authentication

The system supports:
- Microsoft OAuth (Microsoft Exchange/Office 365)
- Email/Password authentication

Configure Microsoft OAuth in Firebase Console:
1. Go to Authentication → Sign-in method
2. Enable Microsoft provider
3. Add your Microsoft OAuth credentials

## Project Structure

```
src/
├── components/       # Reusable components
│   └── Layout.jsx    # Main layout with header
├── config/           # Configuration files
│   └── firebase.js   # Firebase initialization
├── pages/            # Page components
│   ├── Dashboard.jsx
│   ├── Clients.jsx
│   ├── SalesPipeline.jsx
│   ├── Messages.jsx
│   └── ...
├── services/         # Business logic and API calls
│   ├── firestoreService.js  # Firestore operations
│   └── userService.js       # User management
└── main.jsx          # Application entry point
```

## Environment Variables

Create a `.env` file in the root directory:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Deployment URL

The application is configured to be hosted at: **speccon-crm.web.app**

After deployment, your app will be available at:
- `https://speccon-crm.web.app`
- `https://speccon-crm.firebaseapp.com`

## Security Rules

Firestore security rules are configured in `firestore.rules`. The rules ensure:
- Only authenticated users can access data
- Users can read/write their own user documents
- All authenticated users can access clients, deals, quotes, invoices, etc.

## Next Steps

1. **Complete remaining modules:**
   - Client Detail pages (Overview, Products, Financials, Legal tabs)
   - Sales Pipeline Kanban board
   - Messages/Support system
   - Client Feedback module

2. **Add features:**
   - Excel export functionality
   - Xero integration for invoices
   - SharePoint integration for documents
   - Advanced reporting and analytics

3. **Testing:**
   - Unit tests for services
   - Integration tests
   - E2E tests

## Support

For issues or questions, refer to the scope document in `Screens/CRM_System_Scope_Document.txt`

## License

Proprietary - SpecCon Holdings (Pty) Ltd
