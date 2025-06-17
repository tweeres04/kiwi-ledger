import { format } from "date-fns";
import {
  useLoaderData,
  Form,
  useNavigation,
  useActionData,
  useRevalidator,
} from "react-router";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  addLedgerEntry,
  getLedgerData,
  type LedgerEntry,
} from "~/services/googleSheetsService";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const date = formData.get("date") as string;
  const amount = formData.get("amount") as string;
  const who = formData.get("who") as string;
  const notes = formData.get("notes") as string;

  try {
    // Format date to match the format used in Google Sheets ("d MMM yyyy")
    const dateObj = new Date(date);
    const formattedDate = format(dateObj, "d MMM yyyy");

    await addLedgerEntry(formattedDate, amount, who, notes);
    return { success: true };
  } catch (error: any) {
    console.error("Error adding ledger entry:", error);
    return { error: error.message ?? "Failed to add ledger entry." };
  }
}

const people = ["Tyler", "Melissa"];

function formattedAmountToNumber(amount: string): number {
  return parseFloat(amount.replace(/[$,]/g, ""));
}

export function LedgerPage() {
  const { ledgerData, error } = useLoaderData() as LedgerLoaderData;
  const navigation = useNavigation();
  const actionData = useActionData();
  const revalidator = useRevalidator();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setIsDialogOpen(false);
    }
  }, [actionData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        revalidator.revalidate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidator]);

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

  const isSubmitting = navigation.state === "submitting";

  const handleRowClick = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setIsSplitDialogOpen(true);
  };

  const getOneThirdAmount = (amount: string) => {
    const numericAmount = formattedAmountToNumber(amount);
    return numericAmount / 3;
  };

  const getTwoThirdsAmount = (amount: string) => {
    const numericAmount = formattedAmountToNumber(amount);
    return (numericAmount * 2) / 3;
  };

  return (
    <div className="max-w-[600px] mx-auto px-2 py-5 space-y-10 relative">
      {ledgerData && ledgerData.length > 0 ? (
        <>
          <h1 className="text-xl">
            <img
              src="/kiwi-ledger.png"
              alt="Kiwi Ledger"
              className="inline-block size-16"
            />
            Kiwi Ledger
          </h1>
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
                {ledgerData
                  .toSorted(
                    (a, b) =>
                      new Date(b.Date).getTime() - new Date(a.Date).getTime()
                  )
                  .map((entry, index) => (
                    <tr
                      key={index}
                      onClick={() => handleRowClick(entry)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td>{format(entry.Date, "d MMM yyyy")}</td>
                      <td>{entry.Notes}</td>
                      <td>{entry.Who}</td>
                      <td className="text-right">{entry.Amount}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold">Total Paid</h2>
            <p className="text-2xl font-bold">
              {Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totalAmount)}
            </p>
          </div>
        </>
      ) : (
        <p>No ledger data found.</p>
      )}
      {error && <p>An unexpected error occurred: {error}</p>}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="size-16 fixed bottom-20 rounded-full shadow-2xl"
            style={{
              right:
                "max(calc(var(--spacing) * 3), calc(50% - 300px + calc(var(--spacing) * 3)))",
            }}
          >
            <Plus className="size-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Entry</DialogTitle>
          </DialogHeader>
          <Form method="post">
            <div className="space-y-4 [&>div]:space-y-2">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  type="date"
                  id="date"
                  name="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  type="text"
                  id="amount"
                  name="amount"
                  required
                  placeholder="$0.00"
                  inputMode="decimal"
                />
              </div>
              <div>
                <Label>Who</Label>
                <Select name="who" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((person) => (
                      <SelectItem key={person} value={person}>
                        {person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  type="text"
                  id="notes"
                  name="notes"
                  placeholder="Add notes here"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Entry"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entry info</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-5">
              <div>
                {selectedEntry.Notes ? (
                  <p>
                    <strong>Entry:</strong> {selectedEntry.Notes}
                  </p>
                ) : null}
                <p>
                  <strong>Date:</strong>{" "}
                  {format(selectedEntry.Date, "d MMM yyyy")}
                </p>
                <p>
                  <strong>Who:</strong> {selectedEntry.Who}
                </p>
                <p>
                  <strong>Amount:</strong> {selectedEntry.Amount}
                </p>
              </div>
              <div>
                <p className="font-semibold">
                  One third:{" "}
                  <span className="text-green-600">
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(getOneThirdAmount(selectedEntry.Amount))}
                  </span>
                </p>
                <p className="font-semibold">
                  Two thirds:{" "}
                  <span className="text-green-600">
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(getTwoThirdsAmount(selectedEntry.Amount))}
                  </span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LedgerPage;
