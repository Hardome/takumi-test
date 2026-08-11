import type { StatusKey } from "./tokens.js";

export interface Customer {
  id: number;
  name: string;
  plan: "Free" | "Pro" | "Team" | "Enterprise";
  mrr: number;
  seats: number;
  status: StatusKey;
}

/** A small synthetic dataset — enough rows to demonstrate pagination. */
export const customers: Customer[] = [
  { id: 1001, name: "Aoi Studio", plan: "Pro", mrr: 49, seats: 3, status: "active" },
  { id: 1002, name: "Brightloop", plan: "Team", mrr: 199, seats: 12, status: "active" },
  { id: 1003, name: "Corvid Labs", plan: "Enterprise", mrr: 1200, seats: 80, status: "active" },
  { id: 1004, name: "Deepfield", plan: "Pro", mrr: 49, seats: 2, status: "pending" },
  { id: 1005, name: "Emberline", plan: "Free", mrr: 0, seats: 1, status: "churned" },
  { id: 1006, name: "Fathom & Co", plan: "Team", mrr: 199, seats: 9, status: "active" },
  { id: 1007, name: "Glasshouse", plan: "Pro", mrr: 49, seats: 4, status: "pending" },
  { id: 1008, name: "Hinterland", plan: "Enterprise", mrr: 2400, seats: 150, status: "active" },
  { id: 1009, name: "Ionwave", plan: "Team", mrr: 199, seats: 15, status: "churned" },
  { id: 1010, name: "Junction 9", plan: "Pro", mrr: 49, seats: 2, status: "active" },
  { id: 1011, name: "Kestrel", plan: "Free", mrr: 0, seats: 1, status: "pending" },
  { id: 1012, name: "Lumen Bay", plan: "Team", mrr: 199, seats: 7, status: "active" },
  { id: 1013, name: "Meridian", plan: "Enterprise", mrr: 3600, seats: 220, status: "active" },
  { id: 1014, name: "Northwind", plan: "Pro", mrr: 49, seats: 5, status: "pending" },
  { id: 1015, name: "Oxbow", plan: "Free", mrr: 0, seats: 1, status: "churned" },
  { id: 1016, name: "Parallax", plan: "Team", mrr: 199, seats: 11, status: "active" },
  { id: 1017, name: "Quillfox", plan: "Pro", mrr: 49, seats: 3, status: "active" },
  { id: 1018, name: "Redshift", plan: "Enterprise", mrr: 1800, seats: 95, status: "pending" },
  { id: 1019, name: "Solaris", plan: "Team", mrr: 199, seats: 6, status: "active" },
  { id: 1020, name: "Tidewell", plan: "Pro", mrr: 49, seats: 2, status: "churned" },
];

/** Split an array into fixed-size pages. */
export function paginate<T>(items: T[], pageSize: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}

export const currency = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US")}`;
