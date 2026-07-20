export type Transaction = {
  id: string;
  merchant: string;
  category: string;
  account: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  group?: string;
  status?: "posted" | "review";
};

export const transactions: Transaction[] = [
  {
    id: "tx-01",
    merchant: "Salary",
    category: "Income",
    account: "BAC Checking",
    amount: 2380,
    type: "income",
    date: "Jul 15, 2026",
  },
  {
    id: "tx-02",
    merchant: "Super Selectos",
    category: "Groceries",
    account: "BAC Checking",
    amount: 82.45,
    type: "expense",
    date: "Jul 16, 2026",
  },
  {
    id: "tx-03",
    merchant: "Starbucks",
    category: "Dining",
    account: "Cash",
    amount: 5.4,
    type: "expense",
    date: "Jul 16, 2026",
    status: "review",
  },
  {
    id: "tx-04",
    merchant: "Uber",
    category: "Transport",
    account: "BAC Checking",
    amount: 8.15,
    type: "expense",
    date: "Jul 14, 2026",
    group: "Weekday spending",
  },
  {
    id: "tx-05",
    merchant: "Freelance design",
    category: "Income",
    account: "BAC Checking",
    amount: 340,
    type: "income",
    date: "Jul 12, 2026",
  },
  {
    id: "tx-06",
    merchant: "Claro",
    category: "Utilities",
    account: "Credit card",
    amount: 32.9,
    type: "expense",
    date: "Jul 10, 2026",
  },
];

export const groups = [
  {
    id: "weekday-spending",
    name: "Weekday spending",
    type: "Expense",
    description: "Daily costs while working from the office.",
    total: 146.25,
    entries: 7,
  },
  {
    id: "trip-august",
    name: "August trip",
    type: "Mixed",
    description: "Travel, accommodation, and reimbursements.",
    total: 780.4,
    entries: 5,
  },
  {
    id: "home-updates",
    name: "Home updates",
    type: "Expense",
    description: "Furniture and small repairs for the apartment.",
    total: 214.8,
    entries: 4,
  },
];

export const categoryExpenses = [
  { category: "Groceries", amount: 242.8 },
  { category: "Transport", amount: 139.55 },
  { category: "Dining", amount: 96.4 },
  { category: "Utilities", amount: 62.3 },
];
export const accounts = ["BAC Checking", "Cash", "Credit card"];
export const categories = [
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Income",
];
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
