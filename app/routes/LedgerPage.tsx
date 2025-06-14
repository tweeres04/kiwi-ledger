import { format } from "date-fns";
import { useLoaderData } from "react-router";
import {
  getLedgerData,
  type LedgerEntry,
} from "~/services/googleSheetsService";

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
      error: error.message ?? "Failed to load ledger data.",
    };
  }
}

const people = ["Tyler", "Melissa"];

function formattedAmountToNumber(amount: string): number {
  return parseFloat(amount.replace(/[$,]/g, ""));
}

export function LedgerPage() {
  const { ledgerData, error } = useLoaderData() as LedgerLoaderData;

  const totals = ledgerData.reduce<Record<string, number>>(
    (acc, entry) => {
      if (entry.Who && people.includes(entry.Who)) {
        acc[entry.Who] =
          acc[entry.Who] + (formattedAmountToNumber(entry.Amount) ?? 0);
      }
      return acc;
    },
    people.reduce<Record<string, number>>((acc, person) => {
      acc[person] = 0;
      return acc;
    }, {})
  );

  const totalAmount = ledgerData.reduce(
    (acc, entry) => acc + (formattedAmountToNumber(entry.Amount) || 0),
    0
  );

  return (
    <div className="max-w-[600px] mx-auto px-2 py-5 space-y-10">
      {ledgerData && ledgerData.length > 0 ? (
        <>
          <h1 className="text-xl">Kiwi Ledger</h1>
          <table className="w-full sm:w-auto">
            <thead>
              <tr>
                <th className="text-left">Person</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals).map(([person, total]) => (
                <tr key={person}>
                  <th className="text-left">{person}</th>
                  <td className="text-right">
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(total)}
                  </td>
                  <td className="text-right">
                    {((total / totalAmount) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="w-full overflow-x-auto">
            <table className="w-full sm:w-auto">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Description</th>
                  <th className="text-left">Who</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.map((entry, index) => (
                  <tr key={index}>
                    <td>{format(new Date(entry.Date), "d MMM yyyy")}</td>
                    <td>{entry.Notes}</td>
                    <td>{entry.Who}</td>
                    <td className="text-right">{entry.Amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>No ledger data found.</p>
      )}
      {error && <p>An unexpected error occurred: {error}</p>}
    </div>
  );
}

export default LedgerPage;
