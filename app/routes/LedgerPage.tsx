import { useLoaderData } from "react-router";
import { getLedgerData } from "~/services/googleSheetsService";

interface LedgerEntry {
  Date: string;
  Amount: string;
  Who: string;
  Notes: string;
}

interface LedgerLoaderData {
  ledgerData: LedgerEntry[];
  error?: string;
}

export async function loader() {
  try {
    const data = await getLedgerData();
    return { ledgerData: data };
  } catch (error: any) {
    console.error("Error in ledger route loader:", error);
    return {
      ledgerData: [],
      error: error.message || "Failed to load ledger data.",
    };
  }
}

export function LedgerPage() {
  const { ledgerData, error } = useLoaderData() as LedgerLoaderData;

  return (
    <div>
      <h1>Ledger Data</h1>
      {ledgerData && ledgerData.length > 0 ? (
        <pre>{JSON.stringify(ledgerData, null, 2)}</pre>
      ) : (
        <p>No ledger data found.</p>
      )}
      {error && <p>An unexpected error occurred: {error}</p>}
    </div>
  );
}

export default LedgerPage;
