# Comprehensive E2E Test Suite

## Overview

This test suite provides comprehensive end-to-end testing for the multi-tenant CRM system, covering:

1. **Tenant Setup** - Creates 3 test tenants
2. **User Hierarchy** - Creates full user hierarchies per tenant
3. **Client Management** - Creates clients with tenant-specific naming
4. **Forecasts & Calculations** - Tests financial calculations
5. **Portfolio Visibility** - Tests hierarchical data visibility
6. **Tenant Isolation** - Ensures data isolation between tenants
7. **Manager Isolation** - Ensures manager teams are isolated

## Test Data Structure

### Tenants
| Tenant | Code | Description |
|--------|------|-------------|
| Speccon Holdings | SP | Primary test tenant |
| Andebe Training | AN | Secondary test tenant |
| Megra Solutions | MG | Tertiary test tenant |

### User Hierarchy Per Tenant
```
┌─────────────────────────────────────────┐
│            Tenant Admin                  │
├─────────────────────────────────────────┤
│       Group Sales Manager                │
│              │                           │
│    ┌─────────┴─────────┐                │
│    │                   │                 │
│ Manager A          Manager B             │
│    │                   │                 │
│ ┌──┴──┐            ┌──┴──┐              │
│ SA1  SA2           SB1  SB2              │
│ (2)  (2)           (2)  (2)    ← Clients │
├─────────────────────────────────────────┤
│          Accountant (view only)          │
└─────────────────────────────────────────┘
```

### Client Naming Convention
Format: `[Company Name] ([TenantCode]-[TeamCode]-[Number])`

| Pattern | Meaning |
|---------|---------|
| `(SP-A1-01)` | Speccon, Team A, Salesperson 1, Client 1 |
| `(AN-B2-02)` | Andebe, Team B, Salesperson 2, Client 2 |
| `(MG-A2-01)` | Megra, Team A, Salesperson 2, Client 1 |

This allows easy identification of which tenant and salesperson owns each client during testing.

### Expected Client Counts
| Role | Can See | Count |
|------|---------|-------|
| Salesperson | Own clients only | 2 |
| Manager | Team clients | 4 |
| GSM / Admin | All tenant clients | 8 |
| System Admin | All clients (all tenants) | 24 |

## Running Tests

### Prerequisites
1. Start the development server on port 3000:
   ```bash
   npm start
   ```

2. Ensure you have the system admin account set up:
   - Email: `sysadmin@speccon.co.za`
   - Password: `Speccon`

### Run All E2E Tests (in order)
```bash
npx playwright test --project=e2e-setup --project=e2e-users --project=e2e-clients --project=e2e-forecasts --project=e2e-visibility --project=e2e-tenant-isolation --project=e2e-manager-isolation
```

### Run Individual Test Suites
```bash
# Tenant Setup
npx playwright test tests/e2e/01-tenant-setup.spec.ts

# User Hierarchy Setup
npx playwright test tests/e2e/02-user-hierarchy-setup.spec.ts

# Client Creation
npx playwright test tests/e2e/03-client-creation.spec.ts

# Forecasts
npx playwright test tests/e2e/04-forecast-calculations.spec.ts

# Portfolio Visibility
npx playwright test tests/e2e/05-portfolio-visibility.spec.ts

# Tenant Isolation
npx playwright test tests/e2e/06-tenant-isolation.spec.ts

# Manager Isolation
npx playwright test tests/e2e/07-manager-isolation.spec.ts
```

### Run Regular Feature Tests (non-E2E)
```bash
npx playwright test --project=chromium
```

## Forecast Test Values

### Expected Calculations Per Product Line
| Product | Formula | Total |
|---------|---------|-------|
| Learnerships | 10 learners × R35,000 | R350,000 |
| TAP Business | 5 subs × R2,500 × 12 months | R150,000 |
| Compliance Training | 20 courses × R1,500 | R30,000 |
| Other Courses | 15 courses × R2,000 | R30,000 |
| **Total per salesperson** | | **R560,000** |

### Certainty Percentages
| Product | Certainty | Weighted Amount |
|---------|-----------|-----------------|
| Learnerships | 80% | R280,000 |
| TAP Business | 90% | R135,000 |
| Compliance | 95% | R28,500 |
| Other | 70% | R21,000 |
| **Weighted Total** | | **R464,500** |

### Aggregated Totals
| Level | Total Revenue | Certain Revenue |
|-------|--------------|-----------------|
| Per Salesperson | R560,000 | R464,500 |
| Per Manager (2 sales) | R1,120,000 | R929,000 |
| Per GSM (4 sales) | R2,240,000 | R1,858,000 |

## Isolation Matrix

### Tenant Isolation Tests
| From Tenant | Cannot See |
|-------------|------------|
| Speccon | Andebe clients, Megra clients |
| Andebe | Speccon clients, Megra clients |
| Megra | Speccon clients, Andebe clients |

### Manager Isolation Tests (Within Tenant)
| Manager | Can See | Cannot See |
|---------|---------|------------|
| Manager A | SP-A1-xx, SP-A2-xx | SP-B1-xx, SP-B2-xx |
| Manager B | SP-B1-xx, SP-B2-xx | SP-A1-xx, SP-A2-xx |

## Test User Credentials

All test users use the password: `Speccon`

### Speccon Users
| Role | Email |
|------|-------|
| Admin | admin@speccon.co.za |
| GSM | gsm@speccon.co.za |
| Manager A | manager1@speccon.co.za |
| Manager B | manager2@speccon.co.za |
| Sales A1 | sales1@speccon.co.za |
| Sales A2 | sales2@speccon.co.za |
| Sales B1 | sales3@speccon.co.za |
| Sales B2 | sales4@speccon.co.za |
| Accountant | accountant@speccon.co.za |

### Andebe Users
| Role | Email |
|------|-------|
| Admin | admin@andebe.co.za |
| GSM | gsm@andebe.co.za |
| (etc.) | manager1@andebe.co.za, etc. |

### Megra Users
| Role | Email |
|------|-------|
| Admin | admin@megra.co.za |
| GSM | gsm@megra.co.za |
| (etc.) | manager1@megra.co.za, etc. |

## Troubleshooting

### Tests Failing with Timeout
- Increase timeout in `playwright.config.ts`
- Ensure dev server is running on port 3000
- Check network connectivity

### Login Failures
- Verify test user credentials match what's in the database
- Check Firebase authentication is working
- Ensure users have correct tenantId assigned

### Isolation Tests Showing Wrong Counts
- Run client creation tests first to ensure test data exists
- Check client naming includes correct tenant codes
- Verify user hierarchy assignments are complete

## Adding New Tests

When adding new E2E tests:

1. Create file in `tests/e2e/` with numbered prefix (e.g., `08-new-feature.spec.ts`)
2. Add project to `playwright.config.ts` with appropriate dependencies
3. Use test data from `tests/helpers/comprehensive-test-data.ts`
4. Follow the tenant-specific naming conventions
