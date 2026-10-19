# NobatAra — QA Test Matrix & Verification Protocols

**Audit Date:** 2026-10-19  
**Status:** Verification Protocols  

---

## 1. Test Suite Overview

| Category | Scope | Method | Target Threshold |
| :--- | :--- | :--- | :--- |
| **Static Analysis** | Full TypeScript codebase | `npm run lint` (`tsc --noEmit`) | 0 errors |
| **Build Integrity** | Bundler & CSS engine | `compile_applet` (`vite build`) | 0 build failures |
| **Security Audits** | Route access & tenant isolation | Automated API tests + manual pen-testing | Zero unauthorized access |
| **Responsive UX** | 375px (iPhone SE), 412px (Android), 768px (iPad), 1440px (Desktop) | Visual inspection | Zero horizontal overflow, zero button collision |
| **Persian RTL** | Font rendering, number formatting, direction | UI Inspection | Vazirmatn font, Persian digits in tabular numbers |

---

## 2. Test Cases by Persona & Workflow

| ID | Persona | Test Case Description | Expected Result | Baseline Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-CUST-01** | Customer | Browse salon services and filter by category | Service list updates instantly without page reload | PASS |
| **TC-CUST-02** | Customer | Complete 3-step booking flow | Unique tracking code generated, receipt modal opens | PASS (Mock OTP) |
| **TC-CUST-03** | Customer | Verify in-person settlement label | Both modal and receipt state "تسویه ۱۰۰٪ حضوری در سالن" | PASS |
| **TC-CUST-04** | Customer | Mobile view (390px) sticky booking CTA | CTA remains fixed at bottom; persona switcher does not overlap | PASS |
| **TC-SAL-01** | Salon App | Open Snapp-style appointment bottom sheet | Slide-up modal displays customer phone, service, price, and actions | PASS |
| **TC-SAL-02** | Salon App | Mark appointment completed with in-person payment | Status updates to `completed`, daily collected cash increases | PASS |
| **TC-SAL-03** | Salon App | Add walk-in appointment manually | New appointment added to today's queue | PASS |
| **TC-SAL-04** | Salon App | Generate and copy salon booking link | Link copied to clipboard (`nobatara.ir/:slug`) | PASS |
| **TC-ADM-01** | Super Admin | Approve a pending salon (`sal-104`) | Status becomes `active`, verified badge added, audit log recorded | PASS |
| **TC-ADM-02** | Super Admin | Suspend a delinquent salon (`sal-106`) | Status becomes `suspended`, toast alert appears with undo action | PASS |
| **TC-ADM-03** | Super Admin | Retry failed SMS in dispatch queue | Retry count increments, status becomes `delivered` | PASS |
| **TC-ADM-04** | Super Admin | Terminate active user session | Session removed from list, security log entry generated | PASS |
| **TC-ADM-05** | Super Admin | Add IP to firewall blacklist | IP added to blacklist, blocked status confirmed | PASS |
| **TC-ADM-06** | Super Admin | Global command palette (`Ctrl+K`) | Fast search opens and routes between salons and tabs | PASS |
| **TC-SEC-01** | Security | Unauthenticated visitor accesses `/admin` | Denied; redirected to login | **FAIL (In Baseline Mock)** |
| **TC-SEC-02** | Security | Salon A queries Salon B's appointment queue | 403 Forbidden | **FAIL (In Baseline Mock)** |
| **TC-SEC-03** | Security | Real OTP verification expires after 120s | Code invalidation enforced by server | **FAIL (In Baseline Mock)** |
