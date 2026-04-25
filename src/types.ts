export type Money = {
  min: number;
  max: number;
  raw: string;
};

export type Activity = {
  time: string;
  place: string;
  action: string;
  transport: string;
  duration: string;
  cost: Money | null;
  note: string;
  mapsUrl?: string;
  tabelogUrl?: string;
};

export type Day = {
  id: string;
  dayNumber: number;
  dateRaw: string;
  title: string;
  fixed: Activity[];
  main: Activity[];
  alternatives: Activity[];
  meals: Activity[];
  transit?: Activity[];
  budgetSummary: string;
};

export type ReservationStatus = "booked" | "pending" | "research";

export type Reservation = {
  id: string;
  type: "accommodation" | "transport" | "activity";
  title: string;
  city: string;
  dateRaw: string;
  nights: number | null;
  status: ReservationStatus;
  platform: string;
  manageLink: string;
  email: string;
  priceRaw: string;
  note: string;
  dayIds: string[];
  address?: string;
  mapsUrl?: string;
};

export type ShoppingItem = {
  id: string;
  checked: boolean;
  item: string;
  where: string;
  priceRaw: string;
  day: string;
  note: string;
  dayIds: string[];
  mapsUrl?: string;
};

export type Trip = {
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  fx: { from: string; to: string; rate: number; asOf: string };
};

export type Tab = "days" | "reservations" | "shopping";
