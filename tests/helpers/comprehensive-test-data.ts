/**
 * Comprehensive Test Data for Multi-Tenant CRM Testing
 *
 * This file contains all test data constants with tenant-specific naming conventions
 * to ensure proper isolation testing and data traceability.
 *
 * Naming Convention: [EntityType] [Description] ([TenantName])
 * Example: "ABC Construction (Speccon)" - a client in Speccon tenant
 */

// ============================================================================
// TENANT DEFINITIONS
// ============================================================================

export const TEST_TENANTS = {
  speccon: {
    id: 'speccon',
    name: 'Speccon',
    description: 'Speccon Holdings - Primary tenant',
    currencySymbol: 'R',
    financialYearStart: 'March',
    financialYearEnd: 'February',
  },
  abebe: {
    id: 'abebe',
    name: 'Abebe',
    description: 'Abebe tenant',
    currencySymbol: 'R',
    financialYearStart: 'March',
    financialYearEnd: 'February',
  },
  megro: {
    id: 'megro',
    name: 'Megro',
    description: 'Nelspruit',
    currencySymbol: 'R',
    financialYearStart: 'March',
    financialYearEnd: 'February',
  },
};

// ============================================================================
// USER HIERARCHY PER TENANT
// Each tenant has: 1 Admin, 1 Group Sales Manager, 2 Managers, 4 Salespeople
// ============================================================================

export const TENANT_USERS = {
  speccon: {
    admin: {
      email: 'admin@speccon.co.za',
      displayName: 'Speccon Admin',
      password: 'Speccon1379!',
      role: 'admin',
    },
    groupSalesManager: {
      email: 'gsm@speccon.co.za',
      displayName: 'GSM Speccon (John)',
      password: 'Speccon1379!',
      role: 'group-sales-manager',
    },
    managers: [
      {
        email: 'manager1@speccon.co.za',
        displayName: 'Manager Speccon Team A (Mike)',
        password: 'Speccon1379!',
        role: 'manager',
      },
      {
        email: 'manager2@speccon.co.za',
        displayName: 'Manager Speccon Team B (Sarah)',
        password: 'Speccon1379!',
        role: 'manager',
      },
    ],
    salespeople: [
      {
        email: 'sales1@speccon.co.za',
        displayName: 'Sales Speccon A1 (Tom)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 0, // Reports to Manager Team A
      },
      {
        email: 'sales2@speccon.co.za',
        displayName: 'Sales Speccon A2 (Lisa)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 0, // Reports to Manager Team A
      },
      {
        email: 'sales3@speccon.co.za',
        displayName: 'Sales Speccon B1 (David)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 1, // Reports to Manager Team B
      },
      {
        email: 'sales4@speccon.co.za',
        displayName: 'Sales Speccon B2 (Emma)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 1, // Reports to Manager Team B
      },
    ],
    accountant: {
      email: 'accountant@speccon.co.za',
      displayName: 'Accountant Speccon (Peter)',
      password: 'Speccon1379!',
      role: 'accountant',
    },
  },
  abebe: {
    admin: {
      email: 'admin@abebe.co.za',
      displayName: 'Abebe Admin',
      password: 'Speccon1379!',
      role: 'admin',
    },
    groupSalesManager: {
      email: 'gsm@abebe.co.za',
      displayName: 'GSM Abebe (James)',
      password: 'Speccon1379!',
      role: 'group-sales-manager',
    },
    managers: [
      {
        email: 'manager1@abebe.co.za',
        displayName: 'Manager Abebe Team A (Karen)',
        password: 'Speccon1379!',
        role: 'manager',
      },
      {
        email: 'manager2@abebe.co.za',
        displayName: 'Manager Abebe Team B (Robert)',
        password: 'Speccon1379!',
        role: 'manager',
      },
    ],
    salespeople: [
      {
        email: 'sales1@abebe.co.za',
        displayName: 'Sales Abebe A1 (Grace)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 0,
      },
      {
        email: 'sales2@abebe.co.za',
        displayName: 'Sales Abebe A2 (Brian)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 0,
      },
      {
        email: 'sales3@abebe.co.za',
        displayName: 'Sales Abebe B1 (Amanda)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 1,
      },
      {
        email: 'sales4@abebe.co.za',
        displayName: 'Sales Abebe B2 (Chris)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 1,
      },
    ],
    accountant: {
      email: 'accountant@abebe.co.za',
      displayName: 'Accountant Abebe (Linda)',
      password: 'Speccon1379!',
      role: 'accountant',
    },
  },
  megro: {
    admin: {
      email: 'admin@megro.co.za',
      displayName: 'Megro Admin',
      password: 'Speccon1379!',
      role: 'admin',
    },
    groupSalesManager: {
      email: 'gsm@megro.co.za',
      displayName: 'GSM Megro (William)',
      password: 'Speccon1379!',
      role: 'group-sales-manager',
    },
    managers: [
      {
        email: 'manager1@megro.co.za',
        displayName: 'Manager Megro Team A (Nancy)',
        password: 'Speccon1379!',
        role: 'manager',
      },
      {
        email: 'manager2@megro.co.za',
        displayName: 'Manager Megro Team B (Kevin)',
        password: 'Speccon1379!',
        role: 'manager',
      },
    ],
    salespeople: [
      {
        email: 'sales1@megro.co.za',
        displayName: 'Sales Megro A1 (Sandra)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 0,
      },
      {
        email: 'sales2@megro.co.za',
        displayName: 'Sales Megro A2 (Paul)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 0,
      },
      {
        email: 'sales3@megro.co.za',
        displayName: 'Sales Megro B1 (Michelle)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 1,
      },
      {
        email: 'sales4@megro.co.za',
        displayName: 'Sales Megro B2 (Steven)',
        password: 'Speccon1379!',
        role: 'salesperson',
        managerIndex: 1,
      },
    ],
    accountant: {
      email: 'accountant@megro.co.za',
      displayName: 'Accountant Megro (Jennifer)',
      password: 'Speccon1379!',
      role: 'accountant',
    },
  },
};

// System Admin (cross-tenant access)
// Uses the existing admin@speccon.co.za account that already exists in the system
export const SYSTEM_ADMIN = {
  email: 'admin@speccon.co.za',
  displayName: 'System Administrator',
  password: 'Speccon1379!',
  role: 'admin',
  isSystemAdmin: true,
};

// ============================================================================
// CLIENT DATA PER TENANT
// Each salesperson creates 2 clients = 8 clients per tenant
// Naming: [ClientName] ([TenantShortCode]-[SalespersonCode])
// ============================================================================

export const TENANT_CLIENTS = {
  speccon: {
    // Clients for Sales A1 (Tom)
    salesA1: [
      {
        name: 'ABC Construction (SP-A1-01)',
        legalName: 'ABC Construction (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Construction',
        country: 'South Africa',
        primaryContact: 'John Builder',
        contactEmail: 'john@abcconstruction.co.za',
        phone: '+27 11 111 1111',
        notes: 'Created by Tom from Speccon Team A. Test client for tenant isolation.',
      },
      {
        name: 'XYZ Mining (SP-A1-02)',
        legalName: 'XYZ Mining Operations (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Mining',
        country: 'South Africa',
        primaryContact: 'Mary Miner',
        contactEmail: 'mary@xyzmining.co.za',
        phone: '+27 11 111 2222',
        notes: 'Created by Tom from Speccon Team A. Test client for forecasting.',
      },
    ],
    // Clients for Sales A2 (Lisa)
    salesA2: [
      {
        name: 'Tech Solutions (SP-A2-01)',
        legalName: 'Tech Solutions SA (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Peter Tech',
        contactEmail: 'peter@techsolutions.co.za',
        phone: '+27 11 222 1111',
        notes: 'Created by Lisa from Speccon Team A.',
      },
      {
        name: 'Green Energy (SP-A2-02)',
        legalName: 'Green Energy Holdings (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Energy',
        country: 'South Africa',
        primaryContact: 'Susan Green',
        contactEmail: 'susan@greenenergy.co.za',
        phone: '+27 11 222 2222',
        notes: 'Created by Lisa from Speccon Team A.',
      },
    ],
    // Clients for Sales B1 (David)
    salesB1: [
      {
        name: 'Finance Corp (SP-B1-01)',
        legalName: 'Finance Corporation (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Financial Services',
        country: 'South Africa',
        primaryContact: 'Frank Finance',
        contactEmail: 'frank@financecorp.co.za',
        phone: '+27 11 333 1111',
        notes: 'Created by David from Speccon Team B.',
      },
      {
        name: 'Health Plus (SP-B1-02)',
        legalName: 'Health Plus Medical (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Healthcare',
        country: 'South Africa',
        primaryContact: 'Helen Health',
        contactEmail: 'helen@healthplus.co.za',
        phone: '+27 11 333 2222',
        notes: 'Created by David from Speccon Team B.',
      },
    ],
    // Clients for Sales B2 (Emma)
    salesB2: [
      {
        name: 'Retail World (SP-B2-01)',
        legalName: 'Retail World SA (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Retail',
        country: 'South Africa',
        primaryContact: 'Rita Retail',
        contactEmail: 'rita@retailworld.co.za',
        phone: '+27 11 444 1111',
        notes: 'Created by Emma from Speccon Team B.',
      },
      {
        name: 'Logistics Pro (SP-B2-02)',
        legalName: 'Logistics Pro Transport (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Logistics',
        country: 'South Africa',
        primaryContact: 'Larry Logistics',
        contactEmail: 'larry@logisticspro.co.za',
        phone: '+27 11 444 2222',
        notes: 'Created by Emma from Speccon Team B.',
      },
    ],
  },
  abebe: {
    salesA1: [
      {
        name: 'Training Academy (AB-A1-01)',
        legalName: 'Training Academy SA (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Education',
        country: 'South Africa',
        primaryContact: 'Theo Train',
        contactEmail: 'theo@trainingacademy.co.za',
        phone: '+27 12 111 1111',
        notes: 'Created by Grace from Abebe Team A. Abebe tenant client.',
      },
      {
        name: 'Skills Development (AB-A1-02)',
        legalName: 'Skills Development Centre (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Education',
        country: 'South Africa',
        primaryContact: 'Sally Skills',
        contactEmail: 'sally@skillsdev.co.za',
        phone: '+27 12 111 2222',
        notes: 'Created by Grace from Abebe Team A.',
      },
    ],
    salesA2: [
      {
        name: 'Corporate Learning (AB-A2-01)',
        legalName: 'Corporate Learning Solutions (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Education',
        country: 'South Africa',
        primaryContact: 'Carl Corp',
        contactEmail: 'carl@corplearning.co.za',
        phone: '+27 12 222 1111',
        notes: 'Created by Brian from Abebe Team A.',
      },
      {
        name: 'Youth Training (AB-A2-02)',
        legalName: 'Youth Training Initiative (Pty) Ltd',
        type: 'Non-Profit',
        status: 'Active',
        industry: 'Education',
        country: 'South Africa',
        primaryContact: 'Yolanda Youth',
        contactEmail: 'yolanda@youthtraining.co.za',
        phone: '+27 12 222 2222',
        notes: 'Created by Brian from Abebe Team A.',
      },
    ],
    salesB1: [
      {
        name: 'Safety First (AB-B1-01)',
        legalName: 'Safety First Training (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Training',
        country: 'South Africa',
        primaryContact: 'Sam Safety',
        contactEmail: 'sam@safetyfirst.co.za',
        phone: '+27 12 333 1111',
        notes: 'Created by Amanda from Abebe Team B.',
      },
      {
        name: 'Compliance Hub (AB-B1-02)',
        legalName: 'Compliance Hub Africa (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Consulting',
        country: 'South Africa',
        primaryContact: 'Cathy Compliance',
        contactEmail: 'cathy@compliancehub.co.za',
        phone: '+27 12 333 2222',
        notes: 'Created by Amanda from Abebe Team B.',
      },
    ],
    salesB2: [
      {
        name: 'Leadership Institute (AB-B2-01)',
        legalName: 'Leadership Institute SA (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Training',
        country: 'South Africa',
        primaryContact: 'Leo Leader',
        contactEmail: 'leo@leadershipinst.co.za',
        phone: '+27 12 444 1111',
        notes: 'Created by Chris from Abebe Team B.',
      },
      {
        name: 'HR Consulting (AB-B2-02)',
        legalName: 'HR Consulting Experts (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Consulting',
        country: 'South Africa',
        primaryContact: 'Hannah HR',
        contactEmail: 'hannah@hrconsulting.co.za',
        phone: '+27 12 444 2222',
        notes: 'Created by Chris from Abebe Team B.',
      },
    ],
  },
  megro: {
    salesA1: [
      {
        name: 'Software House (MR-A1-01)',
        legalName: 'Software House ZA (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Steve Software',
        contactEmail: 'steve@softwarehouse.co.za',
        phone: '+27 21 111 1111',
        notes: 'Created by Sandra from Megro Team A. Megro tenant client.',
      },
      {
        name: 'Cloud Services (MR-A1-02)',
        legalName: 'Cloud Services Africa (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Cindy Cloud',
        contactEmail: 'cindy@cloudservices.co.za',
        phone: '+27 21 111 2222',
        notes: 'Created by Sandra from Megro Team A.',
      },
    ],
    salesA2: [
      {
        name: 'Data Analytics (MR-A2-01)',
        legalName: 'Data Analytics Pro (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Derek Data',
        contactEmail: 'derek@dataanalytics.co.za',
        phone: '+27 21 222 1111',
        notes: 'Created by Paul from Megro Team A.',
      },
      {
        name: 'Cyber Security (MR-A2-02)',
        legalName: 'Cyber Security Solutions (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Charles Cyber',
        contactEmail: 'charles@cybersec.co.za',
        phone: '+27 21 222 2222',
        notes: 'Created by Paul from Megro Team A.',
      },
    ],
    salesB1: [
      {
        name: 'Network Solutions (MR-B1-01)',
        legalName: 'Network Solutions Africa (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Nathan Network',
        contactEmail: 'nathan@networksolutions.co.za',
        phone: '+27 21 333 1111',
        notes: 'Created by Michelle from Megro Team B.',
      },
      {
        name: 'IT Support (MR-B1-02)',
        legalName: 'IT Support Services (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Ian IT',
        contactEmail: 'ian@itsupport.co.za',
        phone: '+27 21 333 2222',
        notes: 'Created by Michelle from Megro Team B.',
      },
    ],
    salesB2: [
      {
        name: 'Digital Marketing (MR-B2-01)',
        legalName: 'Digital Marketing Agency (Pty) Ltd',
        type: 'Corporate',
        status: 'Prospect',
        industry: 'Marketing',
        country: 'South Africa',
        primaryContact: 'Diana Digital',
        contactEmail: 'diana@digitalmarketing.co.za',
        phone: '+27 21 444 1111',
        notes: 'Created by Steven from Megro Team B.',
      },
      {
        name: 'Web Development (MR-B2-02)',
        legalName: 'Web Development Studio (Pty) Ltd',
        type: 'Corporate',
        status: 'Active',
        industry: 'Technology',
        country: 'South Africa',
        primaryContact: 'Walter Web',
        contactEmail: 'walter@webdev.co.za',
        phone: '+27 21 444 2222',
        notes: 'Created by Steven from Megro Team B.',
      },
    ],
  },
};

// ============================================================================
// FORECAST TEST DATA
// Specific amounts for validation testing
// ============================================================================

export const FORECAST_DATA = {
  // Product Lines
  productLines: ['Learnerships', 'TAP Business', 'Compliance Training', 'Other Courses'],

  // Standard forecast values per product (for testing calculations)
  learnerships: {
    learnerCount: 10,
    costPerLearner: 35000,
    duration: 12,
    expectedTotal: 350000, // 10 * 35000
    certaintyPercentage: 80,
    expectedCertain: 280000, // 350000 * 0.8
  },
  tapBusiness: {
    subscriptionCount: 5,
    monthlyFee: 2500,
    duration: 12,
    expectedTotal: 150000, // 5 * 2500 * 12
    certaintyPercentage: 90,
    expectedCertain: 135000,
  },
  complianceTraining: {
    courseCount: 20,
    coursePrice: 1500,
    expectedTotal: 30000, // 20 * 1500
    certaintyPercentage: 95,
    expectedCertain: 28500,
  },
  otherCourses: {
    courseCount: 15,
    coursePrice: 2000,
    expectedTotal: 30000,
    certaintyPercentage: 70,
    expectedCertain: 21000,
  },
};

// Expected totals per role for validation
export const EXPECTED_TOTALS = {
  // Per salesperson (2 clients each, forecasts on 1 client)
  salesperson: {
    totalRevenue: 560000, // Learnership + TAP + Compliance + Other
    certainRevenue: 464500,
  },
  // Per manager (2 salespeople)
  manager: {
    totalRevenue: 1120000,
    certainRevenue: 929000,
  },
  // Per GSM (2 managers = 4 salespeople)
  groupSalesManager: {
    totalRevenue: 2240000,
    certainRevenue: 1858000,
  },
  // Per tenant (same as GSM)
  tenant: {
    totalRevenue: 2240000,
    certainRevenue: 1858000,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique name with timestamp
 */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

/**
 * Get date in future
 */
export function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get all users for a tenant as flat array
 */
export function getAllTenantUsers(tenantKey: keyof typeof TENANT_USERS) {
  const tenant = TENANT_USERS[tenantKey];
  return [
    tenant.admin,
    tenant.groupSalesManager,
    ...tenant.managers,
    ...tenant.salespeople,
    tenant.accountant,
  ];
}

/**
 * Get all clients for a tenant as flat array
 */
export function getAllTenantClients(tenantKey: keyof typeof TENANT_CLIENTS) {
  const tenant = TENANT_CLIENTS[tenantKey];
  return [
    ...tenant.salesA1,
    ...tenant.salesA2,
    ...tenant.salesB1,
    ...tenant.salesB2,
  ];
}

/**
 * Get client code pattern for tenant
 */
export function getTenantClientPattern(tenantKey: string): string {
  const patterns: { [key: string]: string } = {
    speccon: 'SP-',
    abebe: 'AB-',
    megro: 'MR-',
  };
  return patterns[tenantKey] || '';
}
