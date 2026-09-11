# Trikaar HMS — UX & convenience roadmap

How this was written: by reading the codebase and running the full stack locally against a
seeded hospital, not from a template. Every item marked **Evidence** points at something
actually in the repo today. Items without evidence are proposals and say so.

Effort is rough: **S** ≈ under a day, **M** ≈ a few days, **L** ≈ a week or more.

---

## 0. What changed already

Shipped this session, not yet deployed to the VPS:

- Navigation rebuilt per role; a dead menu group and a hardcoded username-to-SuperAdmin
  grant removed.
- Ward board now reads the real bed register instead of inventing eight beds.
- Walk-in patients can be registered without abandoning the booking/admission form.
- Quick Rx and the full composer briefly agreed on prescription status; the pad was then
  removed outright in later work (see below), which settles §4.7 more decisively than a
  status fix could.

Landed independently after that, in a separate pass over the doctor and patient flows —
kept here as fact, not attributed as this session's work: the Quick Rx pad and AI scribe
demo removed from the consult desk, doctor profile fields made directly editable, syrup
dosing given a proper +/- stepper, patient list paginated, appointment booking given a
real date/time picker, an automatic day/night theme, and two new modules — **Care Teams**
(internal staff messaging, `/dashboard/teams`) and a **Chatbot** help page
(`/dashboard/chatbot`). None of those are audited below; this pass predates them.

The rest of this document is what I would do next.

---

## 1. Sold but not built

The highest-risk gap in the product. The public site markets eight modules; two do not
exist in any form, and one is thinner than the claim.

> **Evidence:** `trikaar-website/src/app/solutions/hospital-management/page.tsx` lists
> Pharmacy Management and Lab Management. There is no pharmacy or lab route in
> `App.jsx` and no `PharmacyController` / `LabController` in the backend.

### 1.1 Pharmacy module — **L**
A doctor can already mark a prescription **"sent to pharmacy"**. Nothing receives it.

> **Evidence:** `DoctorPortalController.java:422` sets `status = "sent_to_pharmacy"`, and
> `Prescription.java:57` documents a `"dispensed"` status that nothing ever writes.

The status is a dead end: the prescription changes colour and stops. Minimum useful version:

- A dispensing queue showing prescriptions awaiting the counter.
- Mark dispensed / partially dispensed / out of stock, moving the status to `dispensed`.
- Medicine master with stock counts, so "out of stock" is known before the patient walks over.
- Push the dispensed items onto the patient's bill (see §3.1).

Decide deliberately: **build it, or stop advertising it.** Selling a module that silently
drops prescriptions is the worst of the three options.

### 1.2 Lab module — **L**
The prescription composer already captures **"Recommended tests / investigations"** as free
text. That text goes nowhere. A minimum lab loop: order → sample collected → result entered
→ result visible on the patient timeline → doctor notified. Same decision as above.

### 1.3 "Reports & Analytics" — **M**
There is a dashboard, not reporting. No `/reports` route exists. What a hospital owner
actually asks for monthly: revenue by service and by doctor, OPD vs IPD split, occupancy
trend, outstanding payments ageing, top diagnoses. Most of the data is already stored.

---

## 2. Built but unreachable

Backend work that is finished and shipping, with no way to reach it. Cheapest wins here.

### 2.1 Audit log has no UI — **S**
> **Evidence:** `AuditLogController.java` exposes `GET /api/AuditLog` and
> `GET /api/AuditLog/Stats`. Zero references anywhere in `frontend-modern/src`.

For a system holding medical records this is usually a compliance requirement, and it is
already written. A filterable table under Settings, plus "recent activity" on a staff
member's profile, is a day's work against an endpoint that already exists.

### 2.2 Bed prices are captured and never used — **S**
> **Evidence:** `pricePerDay` is collected on the bed form, stored on `Bed.java:21`, and
> shown in the admit dropdown — but it appears in **no** backend file other than the model.
> `BillingController` computes `totalIpdDays` and stops short of multiplying by the rate.

The system knows the stay length and the nightly rate and still makes someone reach for a
calculator. See §3.1.

---

## 3. Money

### 3.1 Draft the inpatient bill automatically — **M**
On discharge, assemble a draft invoice: bed nights × rate, plus consultations, procedures
from the service catalogue, and (once §1.1 exists) dispensed medicines. A human reviews and
finalises. Every input already exists; only the multiplication is missing.

**Why it matters:** manual bed billing is where revenue quietly leaks, and it is the number
an owner checks first.

### 3.2 Show the running bill during the stay — **S**
A long-stay family should be able to ask "what is it so far?" and get an answer. Put the
accrued total on the admission row and the patient chart.

### 3.3 Outstanding payments view — **S**
Who owes what, how old. Currently a Payment pending count exists on the SaaS console but
nothing equivalent per hospital.

### 3.4 Estimate before admission — **M**
Give a bed rate × expected nights estimate at admission time. Reduces disputes at discharge
— a real and recurring source of friction in Indian hospitals.

---

## 4. The doctor's hour

The prescription flow is the product's strongest asset. These sharpen it.

### 4.1 Allergy checking that actually blocks — **M**
The composer has an **"Allergy warnings"** free-text field the doctor fills in themselves.
Nothing cross-checks a prescribed medicine against it, or against the patient's recorded
allergies. Even exact-name matching with a hard confirm would prevent a real class of harm.
Structure allergies on the patient record first.

### 4.2 Recent and favourite medicines — **S**
A doctor prescribes from a personal repertoire of perhaps 40 drugs. Surfacing "your recent"
above the full search removes most typing. Templates exist; per-doctor frequency does not.

### 4.3 Keyboard-first queue — **S**
A consulting doctor should not need a mouse. Advance status, open the chart, start an Rx —
all from the keyboard, with the shortcuts visible.

### 4.4 Carry the last visit into this one — **M**
"Same as last time, plus one change" is the most common repeat-consultation shape. Offer
"repeat previous prescription" with the previous medicines pre-loaded and editable.

### 4.5 Vitals at check-in — **M**
Height and weight are on the prescription form for the *doctor* to type. A nurse or the
front desk should capture vitals (BP, pulse, temperature, SpO₂, height, weight) at check-in
so they arrive with the patient and trend over time.

### 4.6 Discharge summary — **M**
Currently discharge writes a one-line remark. A proper summary — diagnosis, course, meds on
discharge, follow-up date — is the document patients actually carry to the next doctor.

### 4.7 AI scribe — **resolved**
Flagged here as a demo that reads like a shipped feature; it and the Quick Rx pad it lived
in were removed from the consult desk in the work that landed after this audit. No action
needed — noted so the decision doesn't look skipped.

---

## 5. Front desk

### 5.1 A real "today" screen — **M**
Reception's whole job is today: who is booked, who has arrived, who is waiting, who has not
shown. Today they assemble this from the appointment list. One screen, built for a person
with a queue in front of them.

### 5.2 Better duplicate handling — **S**
> **Evidence:** `PatientController.java:63-69` already detects a duplicate mobile number and
> returns a message naming the existing patient.

The detection works; the response is a dead end — an error string. Offer the obvious next
step: **open that patient**, or **book for them**. The information is already in the message.

### 5.3 Appointment reminders — **M**
No-shows are the clinic's biggest silent cost. WhatsApp is already the channel the business
uses (the marketing site links to `wa.me`). A day-before reminder with a confirm/reschedule
link pays for itself.

### 5.4 Reschedule and cancel with a reason — **S**
Cancellation reasons are what later reveal *why* the no-show rate is what it is.

---

## 6. Ward

### 6.1 Bed transfer — **M**
The Inpatients page describes transfers; there is no transfer action, and no
`/api/Admission/Transfer` endpoint. Moving a patient today means discharge + readmit, which
breaks the stay record and the billing with it.

### 6.2 Bed status beyond free/occupied — **S**
Real wards need **cleaning**, **maintenance**, and **reserved**. A bed just vacated is not
immediately available, and treating it as available causes double-allocation.

### 6.3 Expected discharge date — **S**
Lets the ward see tomorrow's capacity instead of discovering it tomorrow.

### 6.4 Ward-level staffing view — **M**
Which nurse covers which beds this shift. Pairs with the attendance module that already exists.

---

## 7. Consistency

### 7.1 One vocabulary for appointment status — **M**
> **Evidence:** `DoctorQueue.jsx` alone contains `Booked`, `Scheduled`, `CheckedIn`,
> `Waiting`, `InConsultation`, `Consulting`, `Completed`, `Complete`, `Done`, `Active` —
> plus lowercase variants.

Several of these are the same state under different names. This is how filters quietly miss
rows and counts disagree between screens. Pick one set, migrate the data, validate on write.

### 7.2 Patient status vs clinical status — **S**
`Patient.status` holds Outpatient/Inpatient/Emergency/Discharged, which is really a
*derived* fact about the current admission. Two sources of truth that will drift; the
admission record should win.

### 7.3 Money and dates formatted in one place — **S**
₹ formatting and date rendering are re-implemented per page. One helper each, used everywhere.

---

## 8. Cross-cutting UX

### 8.1 Recently viewed patients — **S**
The single highest-frequency navigation in any HMS is "back to the patient I just had open."

### 8.2 Make the command palette the spine — **S**
⌘K already searches patients well. Extend it to actions ("admit", "new appointment",
"today's queue") and it becomes the fastest path in the product for staff who use it daily.

### 8.3 Undo instead of confirm, where the action is reversible — **M**
Confirmations are right for discharge. For lighter actions, a toast with **Undo** is faster
and less numbing than another dialog.

### 8.4 Saved filters and column choice on lists — **M**
Every role wants a different default view of the same table.

### 8.5 Consistent print output — **M**
Prescription and invoice printing were deliberately left alone during the redesign because
they are physical documents. They now need their own pass: one letterhead, one layout
system, hospital branding from settings rather than hardcoded.

### 8.6 Empty states that teach — **S**
Several already do this well. Bring the rest up to the same standard: a first-run hospital
should be walked from zero to first patient.

---

## 9. Trust, safety, compliance

### 9.1 Rotate the leaked signing secret — **S, urgent**
The JWT secret was committed to a public repository. The docker-compose side is fixed
locally, but **the live VPS still runs the old secret.** Anyone with repo history can mint a
token for any user in any tenant, including SuperAdmin. Rotating invalidates active
sessions, so it needs a chosen moment — but it needs one soon.

### 9.2 Session timeout — **S**
Tokens last 24 hours. A shared front-desk terminal should not stay signed in overnight.

### 9.3 Password policy and forced first-change — **S**
> **Evidence:** `needsPasswordUpdate` appears in exactly two places — declared on
> `User.java:37`, and set to `true` when the seeder creates the admin account. It is never
> read, by the backend or the frontend.

The flag is set and then ignored, so a seeded admin is never actually asked to change the
password it was created with. Read it at sign-in and force the change.

### 9.4 Per-record access logging — **M**
"Who opened this patient's chart" is the question that matters after an incident. Builds on §2.1.

### 9.5 Backups someone has actually restored — **S**
A `database-backup` directory exists. An untested backup is not a backup; run one restore
drill and write down the steps.

---

## 10. Mobile and network reality

### 10.1 Doctors round with a phone — **M**
The mobile bar is now workflow-ordered, but the ward board, patient chart and Rx pad deserve
a proper pass at phone width. Rounds happen away from a desk.

### 10.2 Survive a bad connection — **L**
Clinic internet drops. At minimum: never silently lose a half-written prescription, retry
failed writes, and say plainly when something did not save. Today a failed save is a toast
and the work is gone.

### 10.3 Make it installable — **S**
The web manifest already exists. A doctor's phone should be able to keep it on the home screen.

---

## Suggested order

**First — cheap, already paid for**
§2.1 audit log UI · §2.2 + §3.1 bed billing · §5.2 duplicate handling · §8.1 recent patients ·
§9.2 session timeout · §9.3 password policy

**Second — decide, then act**
§1.1 pharmacy and §1.2 lab: build or stop selling. This is a positioning decision, not an
engineering one, and it should not drift.

**Third — the daily grind**
§5.1 today screen · §4.2 recent medicines · §4.3 keyboard queue · §6.1 bed transfer ·
§6.2 bed states · §7.1 status vocabulary

**Fourth — the differentiators**
§4.1 allergy checking · §4.5 vitals · §4.6 discharge summary · §5.3 reminders ·
§1.3 reporting · §10.2 offline resilience

**Whenever the moment is right**
§9.1 secret rotation — the only genuinely urgent item on this list.

---

## One caution

This roadmap is long, and a hospital system earns trust by doing a few things
reliably rather than many things partially. The two modules that are advertised and absent
are a bigger risk to the business than anything missing from the ones that exist. I would
close that gap — by building or by retracting the claim — before adding new surface.
