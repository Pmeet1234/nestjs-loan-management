const express = require('express');
const app = express();
app.use(express.json());
const multer = require('multer');
const upload = multer();

// Mock extractDataBank API
app.post('/api/v1/statement/extractDataBank', upload.any(), (req, res) => {
  res.json({
    request_id: 'REQ' + Date.now(),
    status: 'success',
    message: 'Bank statement extracted successfully',
  });
});

// Mock getExtractSummary API
app.post('/api/v1/statement/getExtractSummary', (req, res) => {
  res.json({
    request_id: req.body.request_id,
    account_number: '3311137410',
    account_holder_name: 'MOHIT KUMAR TRIPATHI',
    total_credit: 394354.05,
    total_debit: 379250.73,
    closing_balance: 15075.87,
    opening_balance: 972.55,
    period_from: '01/04/2024',
    period_to: '31/03/2025',
    currency: 'INR',
    bank_name: 'Kotak Mahindra Bank',
    branch: 'NEW DELHI - NEHRU PLACE',
    transactions: [
      {
        sl_no: 1,
        date: '31/03/2025',
        description: 'Int.Pd:3311137410:01-01-2025 to 31-03-2025',
        ref_number: '',
        amount: 58.0,
        dr_cr: 'CR',
        balance: 15075.87,
      },
      {
        sl_no: 2,
        date: '31/03/2025',
        description: 'UPI/9935290289@/009118143938/Payment fro',
        ref_number: 'UPI-009106981792',
        amount: 15000.0,
        dr_cr: 'CR',
        balance: 15017.87,
      },
      {
        sl_no: 3,
        date: '27/03/2025',
        description: 'UPI/9935290289@/008736483286/Payment fro',
        ref_number: 'UPI-008712354876',
        amount: 4450.0,
        dr_cr: 'DR',
        balance: 17.87,
      },
      {
        sl_no: 4,
        date: '25/03/2025',
        description: 'UPI/paytm50741/008584750102/On tapping',
        ref_number: 'UPI-008521516180',
        amount: 99.0,
        dr_cr: 'DR',
        balance: 4467.87,
      },
      {
        sl_no: 5,
        date: '20/03/2025',
        description: 'OS 3311137410 291628637944284',
        ref_number: 'KPG-0107257035',
        amount: 1000.0,
        dr_cr: 'DR',
        balance: 4566.87,
      },
      {
        sl_no: 6,
        date: '20/03/2025',
        description: 'Received from NIPP XX9608 IMPS REF 008010685769',
        ref_number: 'IMPS-008010976452',
        amount: 2500.0,
        dr_cr: 'CR',
        balance: 5566.87,
      },
      {
        sl_no: 7,
        date: '20/03/2025',
        description: 'Received from NIPP XX9608 IMPS REF 008009662073',
        ref_number: 'IMPS-008009957735',
        amount: 2000.0,
        dr_cr: 'CR',
        balance: 3066.87,
      },
      {
        sl_no: 8,
        date: '19/03/2025',
        description: 'MB:PAID CARD NUMBER XX8187',
        ref_number: 'VPI-999468115063',
        amount: 11681.05,
        dr_cr: 'DR',
        balance: 1066.87,
      },
      {
        sl_no: 9,
        date: '18/03/2025',
        description: 'Chrg: ECSMDTCHRKB5490205-KKBK7000000003854132',
        ref_number: 'TBMS-507295173',
        amount: 59.0,
        dr_cr: 'DR',
        balance: 12747.92,
      },
      {
        sl_no: 10,
        date: '17/03/2025',
        description: 'Cash Deposit at/BKNBH032/Meghdoot Hotel Building',
        ref_number: '007710473492',
        amount: 5600.0,
        dr_cr: 'CR',
        balance: 12806.92,
      },
    ],
    status: 'success',
  });
});

app.listen(9000, () => {
  console.log('Mock server running on port 9000');
});
