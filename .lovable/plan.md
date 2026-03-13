

## Plan: Add CallFlowDialog to all Call buttons across the app

Currently, only `LeadProfileDialog` opens the call flow confirmation popup after clicking Call. Five other locations just do `window.open(tel:...)` without the follow-up dialog.

### Affected files

1. **`src/pages/ContactsPage.tsx`** — Two call buttons (list view + detail panel). Add `CallFlowDialog` state and component; trigger it after the `tel:` call.

2. **`src/pages/FollowUpsPage.tsx`** — Call button per lead row. Add `CallFlowDialog` state tracking selected contact; open after `tel:`.

3. **`src/pages/ColdFollowUpPage.tsx`** — Same pattern as FollowUpsPage.

4. **`src/pages/BookingsPage.tsx`** — Call button in booking list. Add `CallFlowDialog`; pass booking's contact info.

5. **`src/components/BookingDetailDialog.tsx`** — Call button in booking detail. Add `CallFlowDialog`.

### Pattern for each file

- Import `CallFlowDialog`
- Add state: `callFlowOpen`, `callFlowContact` (id, name, phone, type)
- On call button click: open `tel:`, then `setTimeout(() => setCallFlowOpen(true), 1500)`
- Render `<CallFlowDialog>` at the end of the component

This replicates the exact pattern already working in `LeadProfileDialog`.

