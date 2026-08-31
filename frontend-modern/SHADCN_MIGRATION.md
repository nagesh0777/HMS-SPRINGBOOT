# shadcn/ui migration

## Done

**Foundation** — `components.json`, `@` alias in Vite, `cn()` in `src/lib/utils.js`, Tailwind
rebuilt on shadcn semantic tokens, and `tailwindcss-animate`.

The palette is unchanged: the existing medical blue is now `--primary`, expressed as HSL so
Tailwind can compose it with opacity. Components reference roles (`primary`, `muted`,
`destructive`, `success`, `warning`) rather than raw shades, so the app re-themes from one file.

**Components** in `src/components/ui/`:

`button` · `input` · `label` · `card` · `badge` · `textarea` · `separator` · `dialog` · `select`
· `table` · `tabs` · `skeleton` · `number-stepper` · `dosage-input`

**Screens converted**: the prescription template editor (including dose fields), all three
shared modals, the toast system, and the global patient search palette in `DashboardLayout`.

## Dose entry

Doses were free-text (`"500mg"`, `"1 packet"`, `"5 ml"`). They are now an **amount plus a unit**,
with `−` / `+` controls, in two places: the medication form and the template editor.

The step size follows the unit, because a single fixed step is wrong for most of them:

| Unit | Step | Max |
|---|---|---|
| mg | 50 | 5000 |
| ml | 2.5 | 500 |
| g | 0.5 | 50 |
| mcg | 25 | 2000 |
| tablet | 0.5 | 10 |
| drops / puffs | 1 | 20 / 10 |

Details that matter clinically:

- **The field stays typeable.** A doctor entering 62.5 should not press `+` thirteen times.
- **Clamping happens on blur, not per keystroke** — otherwise typing "12" is impossible when the
  max is 15.
- **Values are rounded to the step's precision**, so repeated addition cannot drift a dose to
  `7.500000000000001`.
- **Stored as the same string as before** (`formatDosage`), so the API, the saved templates and
  the printed prescription needed no change. `parseDosage` reads the historic free-text values.

## Accessibility fixes

These were the real defects, not styling:

| Was | Now |
|---|---|
| `ConfirmationModal` — no focus trap, page behind stayed reachable by Tab | Radix dialog: focus trapped, background inert, announced to screen readers |
| `PromptModal` — same, plus a `setTimeout` hack to focus the input | Same fix; `autoFocus` works because the dialog mounts content properly |
| `Toast` — visual only | Wrapped in an `aria-live="polite"` region. In a clinical app the toast is often the only confirmation a record saved; a screen reader user previously got nothing |
| Global search — Tab walked out of the palette into the page behind the backdrop | Radix-backed palette with a real focus trap |
| Search Escape handled by a `window` listener | Handled by the dialog. The window listener also swallowed Escape for any *other* open dialog — removed |
| Confirmation dialogs closed on an outside click | They no longer do. Clicking away is too easy to do by accident when the next press discharges a patient — Cancel or Escape only |

All modal APIs are unchanged, so the nine screens importing them needed no edits.

## Not yet converted

38 screens still use hand-rolled markup. They build and work — the old components were kept and
`Skeleton` exports both named and default so existing imports resolve — but they are not migrated.

Highest value next, roughly in order:

1. `PatientList`, `PatientDetails`, `PatientRegistration` — the busiest clinical screens
2. `DoctorQueue`, `AppointmentList` — daily use
3. The notification dropdown in `DashboardLayout` — still a manual `ref` + document click
   listener. `dropdown-menu.jsx` is written and ready; it needs wiring
4. The rest of `PrescriptionManagement` (1,700 lines) beyond the template editor
5. The `DashboardLayout` sidebar — left alone deliberately: it is the shell of a live clinical
   app, and a blind rewrite of 900 lines that cannot be run first is how a working system breaks

## Also done

Deleted `src/frontend-modern/` — a stale duplicate of four files (`Toast`, `DashboardLayout`,
`PrescriptionManagement`, `DoctorManagementPage`) shadowing the real ones. Editing the wrong copy
was a genuine trap.

## Note on the bundle

The build warns at 1.35 MB. Worth code-splitting by route before this grows further — the fix is
`manualChunks` in `vite.config.js`, or lazy routes.
