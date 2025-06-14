import { google, Auth } from "googleapis";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { parse as parseDate } from "date-fns";
import invariant from "tiny-invariant";

invariant(
  process.env.SERVICE_ACCOUNT_KEY_PATH,
  "SERVICE_ACCOUNT_KEY_PATH must be set"
);

const SERVICE_ACCOUNT_KEY_PATH = path.resolve(
  process.cwd(),
  process.env.SERVICE_ACCOUNT_KEY_PATH
);

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

invariant(SPREADSHEET_ID, "SPREADSHEET_ID must be set");

const RANGE = "Sheet1!A:D";

const LedgerEntrySchema = z.object({
  Date: z
    .string()
    .min(1, "Date cannot be empty")
    .transform((dateStr, ctx) => {
      const parsedDate = parseDate(dateStr, "d MMM yyyy", new Date());
      if (isNaN(parsedDate.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid date: ${dateStr}. Could not parse with format 'd MMM yyyy'.`,
        });
        return z.NEVER;
      }
      return parsedDate;
    }),
  Amount: z.string().min(1, "Amount cannot be empty"),
  Who: z.string().min(1, "Who cannot be empty"),
  Notes: z.string().optional(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

async function getAuthClient(): Promise<Auth.GoogleAuth> {
  if (!fs.existsSync(SERVICE_ACCOUNT_KEY_PATH)) {
    throw new Error(
      `Service account key file not found at ${SERVICE_ACCOUNT_KEY_PATH}. Please ensure it exists and the path is correct.`
    );
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Changed from .readonly
  });
  return auth;
}

export async function getLedgerData(): Promise<LedgerEntry[]> {
  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;
    if (rows && rows.length > 0) {
      const dataRows = rows.slice(1);

      const parsedEntries: LedgerEntry[] = [];
      const parsingErrors: unknown[] = [];

      dataRows.forEach((row: unknown[], index: number) => {
        const entryData = {
          Date: row[0],
          Amount: row[1],
          Who: row[2],
          Notes: row[3],
        };
        const parseResult = LedgerEntrySchema.safeParse(entryData);
        if (parseResult.success) {
          parsedEntries.push(parseResult.data);
        } else {
          parsingErrors.push({
            rowIndex: index + 1,
            rowData: entryData,
            errors: parseResult.error.flatten(),
          });
        }
      });

      if (parsingErrors.length > 0) {
        console.warn(
          "Errors encountered while parsing Google Sheet data:",
          JSON.stringify(parsingErrors, null, 2)
        );
      }
      return parsedEntries;
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching data from Google Sheets:", error);
    let errorMessage = "Failed to fetch data from Google Sheets. ";
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage += `Google API Error: ${error.response.data.error.message}`;
    } else if (error.message) {
      errorMessage += error.message;
    }
    throw new Error(errorMessage);
  }
}

export async function addLedgerEntry(
  date: string,
  amount: string,
  who: string,
  notes?: string
): Promise<void> {
  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient });

    const values = [[date, amount, who, notes || ""]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: values,
      },
    });
  } catch (error: any) {
    console.error("Error adding data to Google Sheets:", error);
    let errorMessage = "Failed to add data to Google Sheets. ";
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage += `Google API Error: ${error.response.data.error.message}`;
    } else if (error.message) {
      errorMessage += error.message;
    }
    throw new Error(errorMessage);
  }
}
