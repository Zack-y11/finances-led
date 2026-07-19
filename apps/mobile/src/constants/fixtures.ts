export type MobileTransaction = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  status?: "review";
};

export const mobileTransactions: MobileTransaction[] = [
  {
    id: "1",
    merchant: "Super Selectos",
    category: "Groceries",
    amount: 82.45,
    type: "expense",
    date: "Today",
  },
  {
    id: "2",
    merchant: "Starbucks",
    category: "Dining",
    amount: 5.4,
    type: "expense",
    date: "Today",
    status: "review",
  },
  {
    id: "3",
    merchant: "Salary",
    category: "Income",
    amount: 2380,
    type: "income",
    date: "Jul 15",
  },
  {
    id: "4",
    merchant: "Uber",
    category: "Transport",
    amount: 8.15,
    type: "expense",
    date: "Jul 14",
  },
];

export const mobileGroups = [
  { id: "weekday", name: "Weekday spending", total: 146.25, entries: 7 },
  { id: "trip", name: "August trip", total: 780.4, entries: 5 },
  { id: "home", name: "Home updates", total: 214.8, entries: 4 },
];

export const currency = (value: number) => "$" + value.toFixed(2);
