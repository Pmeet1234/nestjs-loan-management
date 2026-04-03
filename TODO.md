# Payment Link Frontend Access Fix

Status: In Progress

## Steps:

- [ ] Step 1: Update src/main.ts to serve static files with '/static/' prefix
- [ ] Step 2: Update src/payment/payment.service.ts generated URL to use /static/pay.html
- [ ] Step 3: Restart app (npm run start:dev)
- [ ] Step 4: Generate new payment link
- [ ] Step 5: Open the new URL in browser - should load without 404
- [ ] Step 6: Verify /payment/details fetches EMI data, payment button works

## Current Error
404 on /pay.html?token=... (static + query conflict)

## Expected Result
/static/pay.html?token=... serves HTML + JS fetches API successfully
