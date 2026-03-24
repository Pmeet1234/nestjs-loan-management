/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express'; // express response object → used for download
import { EmiPayment } from 'src/emi/entities/emi-payment.entity';
import { User } from 'src/user/entities/user.entity';
import { Loan } from 'src/loan/entities/loan.entity';
import { UserLoanEmiReportDto } from './dto/user-loan-emi-report.dto';

@Injectable() // nestjs register this class so it become provider and can be injected anywhere(controller)
export class ReportService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>, // typescript autocomplete works, catches typos
    @InjectRepository(Loan) private loanRepo: Repository<Loan>, // gives access to loan table methods
    @InjectRepository(EmiPayment) private emiRepo: Repository<EmiPayment>, // gives access to emi table methods
  ) {}

  // async → because we use await inside (DB queries are async)
  // filters → query params from request
  // res → express response object (needed for download)
  async getAllUserLoanAndEmiData(filters: UserLoanEmiReportDto, res: Response) {
    // destructure all filters from DTO
    const { search, startDate, endDate, emiNumber, showAll, download } =
      filters;
    const page = filters.page ?? 1; // ?? 1 → if page is undefined use 1
    const limit = filters.limit ?? 10; // ?? 10 → if limit is undefined use 10

    console.log('filters', filters);

    // createQueryBuilder → builds SQL query step by step
    // 'loan' → alias for loan table (like SELECT * FROM loan AS loan)
    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user') // JOIN user table + load user data into loan object
      .leftJoinAndSelect('loan.emiPayments', 'emi'); // JOIN emi table + load emi data into loan object

    // search filter → only add WHERE if search param exists
    if (search) {
      console.log('🔍 Search filter applied:', search);
      const isNumber = !isNaN(Number(search)); // check if search is number → to search by id
      console.log('🔍 Is search a number?', isNumber);
      qb.andWhere(
        `(
      user.username ILIKE :search        
      or user.mobile_no = :exact         
      or loan.status ILIKE :search       
      ${isNumber ? 'or loan.id = :numSearch' : ''}  
      ${isNumber ? 'or user.id = :numSearch' : ''})`,
        // ILIKE → case insensitive search (PostgreSQL)
        // :search → named param (prevents SQL injection)
        // %search% → wildcard (matches anywhere in string)
        {
          search: `%${search}%`,
          exact: search,
          ...(isNumber && { numSearch: Number(search) }), // spread only if isNumber true
        },
      );
    }

    // date range filter → filter EMIs by dueDate
    if (startDate) {
      console.log('📅 StartDate filter:', startDate);
      qb.andWhere('emi.dueDate >= :startDate', {
        startDate: new Date(startDate), // convert string to Date object
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // set to end of day so full day is included
      console.log('📅 EndDate filter:', end);
      qb.andWhere('emi.dueDate <= :endDate', {
        endDate: end,
      });
    }

    // emiNumber filter → filter by specific EMI number
    if (emiNumber !== undefined) {
      // !== undefined because 0 is falsy but valid
      console.log('🔢 EmiNumber filter:', emiNumber);
      qb.andWhere('emi.emiNumber = :emiNumber', {
        emiNumber,
      });
    }

    // orderBy → sort loans by id ASC, then EMIs by number ASC
    qb.orderBy('loan.id', 'ASC').addOrderBy('emi.emiNumber', 'ASC');
    console.log('🔑 Params:', qb.getParameters());

    // declare variables outside try/catch so accessible after
    let loans: Loan[] = [];
    let totalCounts: number = 0;

    try {
      // Promise.all → runs both queries at SAME TIME (parallel = faster)
      // await → pauses function here, releases thread to handle other requests
      // Event Loop → handles other requests while DB queries run
      [loans, totalCounts] = await Promise.all([qb.getMany(), qb.getCount()]);

      console.log('📦 Total loans fetched:', loans.length);
      console.log('📦 Loans count:', totalCounts);
    } catch (err) {
      const error = err as Error; // cast to Error type → so .message works
      // runs when DB query fails (connection error, wrong SQL etc)
      console.error('❌ DB Query Error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    // if no loans found → throw 404 (stops execution)
    if (!loans.length) {
      throw new NotFoundException({
        message: 'No loan history found.',
      });
    }

    // Map → key=userId, value=userObject with loans[]
    // faster than plain object for large data
    const userMap = new Map<number, any>(); // create empty map(key,value) and group loan by user
    console.log('🗺️  Building userMap...');

    for (const loan of loans) {
      // Loops through every loan fetched from DB one by one
      const userId = loan.user.id;
      console.log(`  → Processing loan.id=${loan.id}, userId=${userId}`);

      // shape loan data → clean response object
      const loanData = {
        loanId: loan.id,
        requestedAmount: `₹${loan.requestedAmount}`,
        approvedAmount: `₹${loan.approvedAmount}`,
        totalPayable: `₹${loan.totalPayable}`,
        status: loan.status,
        // .map() → transform raw EMI entity into clean response object
        emiPayments: loan.emiPayments.map((e) => ({
          emiId: e.id,
          emiNumber: e.emiNumber,
          emiAmount: `₹${e.emiAmount}`,
          penaltyAmount: `₹${e.penaltyAmount}`,
          totalPaid: `₹${e.totalPaid}`,
          dueDate: this.formatDate(e.dueDate),
          paidDate: this.formatDate(e.paidDate),
          status: e.status,
        })),
      };
      console.log(
        `  → EMI count for loan ${loan.id}:`,
        loan.emiPayments.length,
      );

      // If NO  → create a new entry for this user with an empty loans[] array
      // If YES → skip, user entry already exists
      // ── Iteration 1: loan.id=1, userId=51 ──
      // userMap.has(51) → false
      // userMap.set(51, { userId:51, username:'John', loans:[] })
      // userMap.get(51).loans.push(loan1)
      // userMap = { 51 → { username:'John', loans:[loan1] } }
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: loan.user.id,
          username: loan.user.username,
          mobile_no: loan.user.mobile_no,
          loans: [], // empty array → loans pushed below
        });
      }
      console.log(`  → User ${userId} already exists, pushing loan`);
      userMap.get(userId).loans.push(loanData); // push loan into user's loans array
    }

    console.log('🗺️  UserMap size:', userMap.size); // total unique users
    console.log('🗺️  UserMap values:', [...userMap.values()]);

    const allUsers = [...userMap.values()]; // converts the Map values into a plain array
    const totalRecords = allUsers.length; // total unique users count
    const totalPages = Math.ceil(totalRecords / limit); // Math.ceil → round up (7/2 = 3.5 → 4)

    // showAll=true → return all users, skip pagination
    // showAll=false → slice array to return only current page
    const paginatedUsers =
      showAll === 'true'
        ? allUsers
        : allUsers.slice((page - 1) * limit, page * limit);
    // slice formula: page=2, limit=5 → slice(5, 10) → users 6-10

    // pagination meta → sent to frontend for UI pagination buttons
    const pagination =
      showAll === 'true'
        ? {
            totalRecords,
            showAll: true,
          }
        : {
            totalRecords,
            totalPages,
            currentPage: page,
            limit,
            // hasNextPage: page < totalPages,
            // hasPrevPage: page > 1,
          };

    // final response shape
    const responseData = {
      message: 'Loan history found.',
      data: {
        pagination,
        users: paginatedUsers,
      },
    };

    // CSV download → build csv string → send as file
    if (download === 'csv') {
      try {
        console.log('📥 CSV download requested...');
        const csv = await this.buildCsvPromise(paginatedUsers); // await Promise → build csv string
        this.sendFile(res, csv, 'text/csv', 'loan-report'); // send file to client
        console.log('✅ CSV sent');
        return; // stop here → don't return responseData
      } catch (err) {
        const error = err as Error;
        // runs when CSV build fails
        console.error('❌ CSV Error:', error.message);
        throw new Error(`CSV generation failed: ${error.message}`);
      }
    }

    // JSON download → build json string → send as file
    if (download === 'json') {
      try {
        console.log('📥 JSON download requested...');
        const json = await this.buildJsonPromise(responseData); // await Promise → stringify data
        this.sendFile(res, json, 'application/json', 'loan-report'); // send file to client
        console.log('✅ JSON sent');
        return; // stop here → don't return responseData
      } catch (err) {
        const error = err as Error;
        // runs when JSON build fails
        console.error('❌ JSON Error:', error.message);
        throw new Error(`JSON generation failed: ${error.message}`);
      }
    }

    // no download param → return normal JSON response
    return responseData;
  }

  // private → only used inside this class
  // formats Date object → '04-Mar-2024' string
  private formatDate(date: Date | null): string {
    if (!date) return ''; // if null → return empty string (avoid crash)
    return new Date(date)
      .toLocaleDateString('en-GB', {
        // en-GB → day/month/year format
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .replace(/ /g, '-'); // replace spaces with dashes → '04 Mar 2024' → '04-Mar-2024'
  }

  // builds CSV string from users array
  // returns Promise<string> → so we can await it
  private buildCsvPromise(users: any[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        console.log('⚙️  Building CSV...');

        // CSV column headers → first row of CSV file
        const headers = [
          'User ID',
          'Username',
          'Mobile No',
          'Loan ID',
          'Requested Amount',
          'Approved Amount',
          'Total Payable',
          'Loan Status',
          'EMI ID',
          'EMI Number',
          'EMI Amount',
          'Penalty Amount',
          'Total Paid',
          'Due Date',
          'Paid Date',
          'EMI Status',
        ];

        const rows: string[][] = []; // 2D array → each row is array of strings

        for (const user of users) {
          for (const loan of user.loans) {
            // baseRow → user + loan data (same for every EMI row)
            const baseRow = [
              user.userId,
              user.username,
              user.mobile_no,
              loan.loanId,
              loan.requestedAmount,
              loan.approvedAmount,
              loan.totalPayable,
              loan.status,
            ].map(String); // convert all values to string

            if (!loan.emiPayments.length) {
              // no EMIs → push empty EMI columns
              rows.push([...baseRow, '', '', '', '', '', '', '', '']);
            } else {
              // one row per EMI → repeat user+loan data for each EMI
              for (const emi of loan.emiPayments) {
                rows.push(
                  [
                    ...baseRow, // spread base row
                    emi.emiId,
                    emi.emiNumber,
                    emi.emiAmount,
                    emi.penaltyAmount,
                    emi.totalPaid,
                    emi.dueDate,
                    emi.paidDate,
                    emi.status,
                  ].map(String),
                );
              }
            }
          }
        }

        // join headers + rows into CSV string
        // wrap each cell in quotes → handles commas inside values
        const csv = [
          headers.join(','), // header row
          ...rows.map(
            (row) =>
              row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','),
            // replace " with "" → escape quotes inside cell values
          ),
        ].join('\n'); // each row on new line

        console.log(`✅ CSV ready: ${rows.length} rows`);
        resolve(csv); // success → Promise fulfilled → await gets csv string
      } catch (err) {
        const error = err as Error;
        console.error('❌ CSV build error:', error.message);
        reject(err); // failure → Promise rejected → caught by try/catch in main method
      }
    });
  }

  // builds JSON string from data object
  // returns Promise<string> → so we can await it
  private buildJsonPromise(data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        console.log('⚙️  Building JSON...');
        const json = JSON.stringify(data, null, 2); // null=no replacer, 2=indent spaces
        console.log('✅ JSON ready');
        resolve(json); // success → Promise fulfilled → await gets json string
      } catch (err) {
        const error = err as Error;
        console.error('❌ JSON build error:', error.message);
        reject(err); // failure → Promise rejected → caught by try/catch in main method
      }
    });
  }

  // sends file to client as download
  // res → express response object
  // content → csv or json string
  // contentType → 'text/csv' or 'application/json'
  // baseName → base filename without extension
  private sendFile(
    res: Response,
    content: string,
    contentType: string,
    baseName: string,
  ): void {
    try {
      const ext = contentType === 'text/csv' ? 'csv' : 'json'; // file extension
      const filename = `${baseName}-${new Date().toISOString().split('T')[0]}.${ext}`;
      // toISOString().split('T')[0] → '2024-03-23' (date only, no time)
      console.log(`📥 Sending file: ${filename}`);
      res.setHeader('Content-Type', contentType); // tell browser what type of file
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`, // attachment → force download (not open in browser)
      );
      res.send(content); // send file content to client
    } catch (err) {
      const error = err as Error;
      console.error('❌ File send error:', error.message);
      throw new Error(`File send failed: ${error.message}`);
    }
  }
}
