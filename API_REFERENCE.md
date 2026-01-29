# Speccon CRM API Reference

Generated from `swagger.json` (OpenAPI 3.0.4).  
**Base URL:** `https://crm-service.speccon.co.za`

**Total endpoints in Swagger:** 142

---

## User (Auth & Management)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/User/Login` | Login (returns tokens) |
| GET | `/api/User/GetCurrentUser` | Current user details **(use this, not UserDetail – UserDetail is not in Swagger)** |
| GET | `/api/User/GetList` | List users |
| GET | `/api/User/GetById` | Get user by ID (`userId`) |
| GET | `/api/User/GetByKey` | Get user by key (`userKey`) |
| POST | `/api/User/CreateUser` | Create user |
| PUT | `/api/User/UpdateUser` | Update user |
| DELETE | `/api/User/Delete` | Delete user |
| POST | `/api/User/SoftDelete` | Soft delete user |
| PUT | `/api/User/UpdateUserRole` | Update user role |
| PUT | `/api/User/UpdateUserManager` | Update user manager |
| GET | `/api/User/GetDirectReports` | Get direct reports (`userId`) |
| GET | `/api/User/GetUserHierarchy` | Get user hierarchy (`userId`) |
| GET | `/api/User/GetTeamMembers` | Get team members (`userId`) |
| POST | `/api/User/BatchCreate` | Batch create users |

**Note:** Swagger does **not** define `/api/User/UserDetail`, `/api/User/RefreshToken`, `/api/User/ChangePassword`, or `/api/User/LogOut`. If your backend exposes them, they are outside this spec. The app uses **GetCurrentUser** for post-login user details.

---

## Client

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Client/GetList` | List clients |
| GET | `/api/Client/GetById` | Get by ID (`clientId`) |
| GET | `/api/Client/GetByKey` | Get by key (`clientKey`) |
| POST | `/api/Client/CreateClient` | Create client |
| PUT | `/api/Client/UpdateClient` | Update client |
| DELETE | `/api/Client/Delete` | Delete client |
| POST | `/api/Client/SoftDelete` | Soft delete |
| PUT | `/api/Client/AssignSalesPerson` | Assign salesperson |
| PUT | `/api/Client/AssignSkillsPartner` | Assign skills partner |
| PUT | `/api/Client/UpdatePipelineStatus` | Update pipeline status |
| GET | `/api/Client/GetClientActivities` | Get client activities |
| GET | `/api/Client/GetClientInteractions` | Get client interactions |
| POST | `/api/Client/CreateInteraction` | Create interaction |
| PUT | `/api/Client/SetFollowUp` | Set follow-up |
| PUT | `/api/Client/ClearFollowUp` | Clear follow-up |
| GET | `/api/Client/GetClientsWithoutFollowUp` | Clients without follow-up |
| GET | `/api/Client/GetClientsWithOverdueFollowUp` | Clients with overdue follow-up |
| GET | `/api/Client/GetClientProducts` | Get client products |
| POST | `/api/Client/AddProduct` | Add product to client |
| PUT | `/api/Client/UpdateClientProduct` | Update client product |
| DELETE | `/api/Client/RemoveProduct` | Remove product from client |

---

## Deal

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Deal/GetList` | List deals |
| GET | `/api/Deal/GetById` | Get by ID (`dealId`) |
| GET | `/api/Deal/GetByKey` | Get by key (`dealKey`) |
| POST | `/api/Deal/CreateDeal` | Create deal |
| PUT | `/api/Deal/UpdateDeal` | Update deal |
| DELETE | `/api/Deal/Delete` | Delete deal |
| POST | `/api/Deal/SoftDelete` | Soft delete |
| PUT | `/api/Deal/UpdateDealStage` | Update deal stage |
| GET | `/api/Deal/GetPipelineKanban` | Get pipeline kanban data |

---

## Task

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Task/GetList` | List tasks |
| GET | `/api/Task/GetById` | Get by ID (`taskId`) |
| GET | `/api/Task/GetByKey` | Get by key (`taskKey`) |
| POST | `/api/Task/CreateTask` | Create task |
| PUT | `/api/Task/UpdateTask` | Update task |
| DELETE | `/api/Task/Delete` | Delete task |
| POST | `/api/Task/SoftDelete` | Soft delete |
| PUT | `/api/Task/CompleteTask` | Complete task |
| GET | `/api/Task/GetTaskStats` | Get task stats |

---

## Financial

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Financial/GetClientFinancials` | Get client financials |
| PUT | `/api/Financial/UpdateClientFinancial` | Update client financial |
| POST | `/api/Financial/SaveClientDeals` | Save client deals |
| GET | `/api/Financial/GetBudgets` | Get budgets |
| POST | `/api/Financial/SaveBudget` | Save budget |
| GET | `/api/Financial/GetBudgetVsForecast` | Budget vs forecast |
| POST | `/api/Financial/UploadFinancialData` | Upload financial data |
| GET | `/api/Financial/GetUploadHistory` | Get upload history |
| GET | `/api/Financial/GetUploadById` | Get upload by ID |
| DELETE | `/api/Financial/DeleteUpload` | Delete upload |
| POST | `/api/Financial/SoftDeleteUpload` | Soft delete upload |
| GET | `/api/Financial/GetFinancialDashboard` | Get financial dashboard |

---

## Message

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Message/GetList` | List messages |
| GET | `/api/Message/GetById` | Get by ID |
| POST | `/api/Message/SendMessage` | Send message |
| PUT | `/api/Message/MarkAsRead` | Mark as read |
| PUT | `/api/Message/ArchiveMessage` | Archive message |
| GET | `/api/Message/GetUnreadCount` | Get unread count |

---

## Pipeline Status

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/PipelineStatus/GetList` | List pipeline statuses |
| GET | `/api/PipelineStatus/GetById` | Get by ID |
| POST | `/api/PipelineStatus/CreatePipelineStatus` | Create |
| PUT | `/api/PipelineStatus/UpdatePipelineStatus` | Update |
| PUT | `/api/PipelineStatus/ReorderPipelineStatuses` | Reorder |
| POST | `/api/PipelineStatus/SetupDefaultPipelineStatuses` | Setup defaults |

---

## Product

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Product/GetList` | List products |
| GET | `/api/Product/GetById` | Get by ID (`productId`) |
| GET | `/api/Product/GetByKey` | Get by key (`productKey`) |
| POST | `/api/Product/CreateProduct` | Create product |
| PUT | `/api/Product/UpdateProduct` | Update product |
| PUT | `/api/Product/ArchiveProduct` | Archive product |
| DELETE | `/api/Product/Delete` | Delete product |
| POST | `/api/Product/SoftDelete` | Soft delete |

---

## Product Line

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ProductLine/GetList` | List product lines |
| GET | `/api/ProductLine/GetById` | Get by ID |
| GET | `/api/ProductLine/GetByKey` | Get by key |
| POST | `/api/ProductLine/CreateProductLine` | Create |
| PUT | `/api/ProductLine/UpdateProductLine` | Update |
| DELETE | `/api/ProductLine/Delete` | Delete |
| POST | `/api/ProductLine/SoftDelete` | Soft delete |

---

## Role

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Role/GetList` | List roles |
| GET | `/api/Role/GetById` | Get by ID (`roleId`) |
| GET | `/api/Role/GetByKey` | Get by key (`roleKey`) |
| POST | `/api/Role/CreateRole` | Create role |
| PUT | `/api/Role/UpdateRole` | Update role |
| DELETE | `/api/Role/Delete` | Delete role |
| POST | `/api/Role/SoftDelete` | Soft delete |
| GET | `/api/Role/GetRolePermissions` | Get role permissions |
| PUT | `/api/Role/UpdateRolePermissions` | Update role permissions |

---

## Permission

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Permission/GetList` | List permissions |
| GET | `/api/Permission/GetByCategory` | Get by category |

---

## Seta

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Seta/GetList` | List SETAs |
| GET | `/api/Seta/GetById` | Get by ID |
| POST | `/api/Seta/CreateSeta` | Create |
| PUT | `/api/Seta/UpdateSeta` | Update |
| DELETE | `/api/Seta/Delete` | Delete |
| POST | `/api/Seta/SoftDelete` | Soft delete |

---

## Skills Partner

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/SkillsPartner/GetList` | List skills partners |
| GET | `/api/SkillsPartner/GetById` | Get by ID |
| POST | `/api/SkillsPartner/CreateSkillsPartner` | Create |
| PUT | `/api/SkillsPartner/UpdateSkillsPartner` | Update |
| DELETE | `/api/SkillsPartner/Delete` | Delete |
| POST | `/api/SkillsPartner/SoftDelete` | Soft delete |

---

## System Setting

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/SystemSetting/GetList` | List settings |
| GET | `/api/SystemSetting/GetByKey` | Get by key |
| POST | `/api/SystemSetting/CreateOrUpdateSystemSetting` | Create or update |
| GET | `/api/SystemSetting/GetFinancialYearSettings` | Get financial year settings |
| PUT | `/api/SystemSetting/UpdateFinancialYearSettings` | Update financial year settings |

---

## Tenant

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Tenant/GetList` | List tenants |
| GET | `/api/Tenant/GetById` | Get by ID (`tenantId`) |
| GET | `/api/Tenant/GetByKey` | Get by key (`tenantKey`) |
| POST | `/api/Tenant/CreateTenant` | Create tenant |
| PUT | `/api/Tenant/UpdateTenant` | Update tenant |
| DELETE | `/api/Tenant/Delete` | Delete tenant |
| POST | `/api/Tenant/SoftDelete` | Soft delete |
| GET | `/api/Tenant/GetTenantStatistics` | Get tenant statistics |

---

## Calculation Template

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/CalculationTemplate/GetList` | List calculation templates |
| GET | `/api/CalculationTemplate/GetById` | Get by ID (`calculationTemplateId`) |
| GET | `/api/CalculationTemplate/GetByKey` | Get by key (`calculationTemplateKey`) |
| POST | `/api/CalculationTemplate/CreateCalculationTemplate` | Create |
| PUT | `/api/CalculationTemplate/UpdateCalculationTemplate` | Update |
| DELETE | `/api/CalculationTemplate/Delete` | Delete |
| POST | `/api/CalculationTemplate/SoftDelete` | Soft delete |
| POST | `/api/CalculationTemplate/ExecuteCalculation` | Execute calculation |

---

## Report

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/Report/GetDealAgingReport` | Deal aging report |
| GET | `/api/Report/GetPipelineAnalytics` | Pipeline analytics |
| GET | `/api/Report/GetTeamPerformance` | Team performance |
| GET | `/api/Report/GetFollowUpStats` | Follow-up stats |
| GET | `/api/Report/GetFinancialSummary` | Financial summary |

---

## Frontend vs Swagger

- **User “current user”:** The app calls `UserDetail` then falls back to **GetCurrentUser** on 404. Swagger only defines **GetCurrentUser**; there is no **UserDetail**. Using **GetCurrentUser** matches the spec.
- **Client assignment:** Frontend uses `AssignSalesPerson`; Swagger has `/api/Client/AssignSalesPerson`. Aligned.
- **Deal stage:** Frontend uses `UpdateDealStage`; Swagger has `/api/Deal/UpdateDealStage`. Aligned.
- **Financial year:** Frontend uses `SystemSetting/GetFinancialYearSettings` and `UpdateFinancialYearSettings`; Swagger has these under SystemSetting. Aligned.

For full request/response schemas and query/body parameters, open `swagger.json` or use Swagger UI against the same file.
