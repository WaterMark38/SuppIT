"use client";
// Frontend screens.
import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import OperationsPanel from "./OperationsPanel";
import html2canvas from "html2canvas";


const LOGO_URL = "/logo.png";

const TABS = [
  { id: "orders", label: "Orders", icon: "package" },
  { id: "quotes", label: "Quotes", icon: "file" },
  { id: "suppliers", label: "Suppliers", icon: "truck" },
  { id: "customers", label: "Customers", icon: "users" },
  { id: "stock", label: "Stock", icon: "box" },
  { id: "invoices", label: "Invoices", icon: "file" },
  { id: "payments", label: "Payments", icon: "bank" },
  { id: "reminders", label: "Reminders", icon: "bell" },
  { id: "reports", label: "Reports", icon: "calendar" },
];

const INITIAL_RECORDS = [];
const RECORDS_STORAGE_KEY = "watermark-dev-records-v7";
const RECORDS_SIGNATURE_KEY = "watermark-dev-records-signature-v7";
const INITIAL_RECORDS_SIGNATURE = JSON.stringify(INITIAL_RECORDS);

// The backend handles database requests.
const API_BASE_URL = "/api";
// Sends requests to the backend.
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}


// Shows the signed-in user and role.
function displayUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username || "",
    displayName: user.fullName || user.username || user.email || "User",
    role: user.role === "SuperAdmin" ? "superadmin" : user.role === "Admin" ? "admin" : "user",
  };
}

const EMPTY_LOGIN_FORM = {
  identifier: "",
  password: "",
};

const EMPTY_NEW_USER = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  role: "Staff",
};

const PAGE_COPY = {
  orders: {
    eyebrow: "Sales workflow",
    title: "Orders",
    description:
      "Orders are created only when customers accept quotations. Invoices are generated from those orders.",
    button: "Orders created from accepted quotes",
  },
  quotes: {
    eyebrow: "Sales pipeline",
    title: "Quotes",
    description:
      "Create quotations and convert an accepted quote into an order.",
    button: "Add quote",
  },
  suppliers: {
    eyebrow: "Purchasing",
    title: "Suppliers",
    description: "Store supplier contact, address, and banking information.",
    button: "Add supplier",
  },
  customers: {
    eyebrow: "Customer care",
    title: "Customers",
    description: "Store customer contact, address, and account information.",
    button: "Add customer",
  },
  invoices: {eyebrow:"Billing",title:"Invoices",description:"Invoices generated from customer orders",button:"From orders"},
  payments: {eyebrow:"Receipts",title:"Payments",description:"Record payments against invoices",button:"From invoices"},
  reminders: {eyebrow:"Collections",title:"Reminders",description:"Track upcoming and overdue invoices",button:"Review"},
  reports: {eyebrow:"Performance",title:"Reporting and Business Overview",description:"Live summary of SuppIT business activity",button:"Overview"},
  stock: {
    eyebrow: "Inventory",
    title: "Stock",
    description: "Add, update, and delete stock items and quantities.",
    button: "Add stock",
  },
};

const EMPTY_FORM = {
  reference: "",
  title: "",
  company: "",
  customerEmail: "",
  dueDate: "",
  priority: "Medium",
  notes: "",
  taxRate: 15,
  fullCompanyName: "",
  physicalAddress: "",
  email: "",
  phone: "",
  bankingDetails: "",
  sku: "",
  itemName: "",
  description: "",
  quantity: 0,
  unitCost: 0,
  sellPrice: 0,
  supplier: "",
};

const EMPTY_LINE_ITEM = {
  id: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
};

// Draws the menu icons.
function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    package: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9M8.2 5.1l7.7 4.4" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v5h5M9 13h6M9 17h6" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    box: (
      <>
        <path d="M4 7 12 3l8 4v10l-8 4-8-4Z" />
        <path d="m4 7 8 4 8-4M12 11v10" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    bank: (
      <>
        <path d="m3 10 9-6 9 6" />
        <path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 9-9M16 7l2 2M14 9l2 2" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </>
    ),
    printer: (
      <>
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="7" />
      </>
    ),
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

// Shows the SuppIT logo.
function BrandLogo({ className = "" }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={`logo-fallback ${className}`}>WM</div>;
  }

  return (
    <img
      className={className}
      src={LOGO_URL}
      alt="WaterMark Dev logo"
      onError={() => setFailed(true)}
    />
  );
}

// Formats dates.
function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Formats amounts in rand.
function formatCurrency(value) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(Number(value) || 0);
}

// Formats dates for display.
function getRelativeDate(value) {
  if (!value) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(`${value}T00:00:00`);
  const days = Math.round((date - today) / 86400000);

  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  }

  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";

  return `Due in ${days} days`;
}

// Cleans imported column names.
function cleanHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Finds matching imported fields.
function readColumn(row, possibleNames) {
  const entries = Object.entries(row).map(([key, value]) => [
    cleanHeader(key),
    value,
  ]);

  for (const name of possibleNames) {
    const match = entries.find(([key]) => key === cleanHeader(name));

    if (match) {
      return match[1];
    }
  }

  return "";
}

// Reads CSV contact records.
function parseCsvFile(text) {
  const table = [];
  let currentRow = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
    } else if (
      (character === "\n" || character === "\r") &&
      !insideQuotes
    ) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue.trim());
      currentValue = "";

      if (currentRow.some((value) => value !== "")) {
        table.push(currentRow);
      }

      currentRow = [];
    } else {
      currentValue += character;
    }
  }

  currentRow.push(currentValue.trim());

  if (currentRow.some((value) => value !== "")) {
    table.push(currentRow);
  }

  if (table.length < 2) {
    return [];
  }

  const headings = table[0];

  return table.slice(1).map((values) => {
    const row = {};

    headings.forEach((heading, index) => {
      row[heading] = values[index] ?? "";
    });

    return row;
  });
}

// Reads imported HTML tables.
function parseHtmlFile(text) {
  const documentFile = new DOMParser().parseFromString(text, "text/html");
  const tableElement = documentFile.querySelector("table");

  if (!tableElement) {
    throw new Error("The HTML file does not contain a table.");
  }

  const table = Array.from(tableElement.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) =>
        cell.textContent.trim()
      )
    )
    .filter((row) => row.some((value) => value !== ""));

  if (table.length < 2) {
    return [];
  }

  const headings = table[0];

  return table.slice(1).map((values) => {
    const row = {};

    headings.forEach((heading, index) => {
      row[heading] = values[index] ?? "";
    });

    return row;
  });
}

// Prepares the import file.
function readImportFile(file, text) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCsvFile(text);
  }

  if (extension === "html" || extension === "htm") {
    return parseHtmlFile(text);
  }

  throw new Error("Only CSV and HTML files are allowed.");
}

// Creates the next record reference.
function getNextReference(category, records) {
  const prefix = category === "orders" ? "ORD" : "QUO";

  const numbers = records
    .filter((item) => item.category === category)
    .map((item) => Number(String(item.reference ?? "").match(/\d+/)?.[0] ?? 0));

  const nextNumber = Math.max(0, ...numbers) + 1;

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

// Creates the next stock code.
function getNextStockSku(records) {
  const numbers = records
    .filter((item) => item.category === "stock")
    .map((item) => Number(String(item.sku ?? "").match(/\d+/)?.[0] ?? 0));

  const nextNumber = Math.max(0, ...numbers) + 1;

  return `STK-${String(nextNumber).padStart(4, "0")}`;
}

// Creates an order reference.
function getInvoiceReference(orderReference) {
  const number = String(orderReference ?? "").match(/\d+/)?.[0] ?? "1";
  return `INV-${String(Number(number)).padStart(4, "0")}`;
}

// Keeps usernames consistent.
function normalizeUsername(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

// Formats records for the forms.
function normalizeRecord(record) {
  if (record.category === "orders" || record.category === "quotes") {
    return {
      ...record,
      status:
        record.status ||
        (record.completed ? "Completed" : record.category === "quotes" ? "Pending" : "Open"),
      customerEmail: record.customerEmail || "",
      taxRate: Number(record.taxRate) || 15,
      invoiceReference:
        record.category === "orders"
          ? record.invoiceReference || ""
          : undefined,
      items:
        Array.isArray(record.items) && record.items.length > 0
          ? record.items
          : [
              {
                id: `${record.id}-item-1`,
                description: record.title || "Service",
                quantity: 1,
                unitPrice: 0,
              },
            ],
    };
  }

  return record;
}

// Loads available records.
function loadRecords() {
  try {
    const savedText =
      localStorage.getItem(RECORDS_STORAGE_KEY) ||
      localStorage.getItem("watermark-dev-records-v6") ||
      localStorage.getItem("watermark-dev-records-v5") ||
      localStorage.getItem("watermark-dev-records-v2");
    const savedSignature = localStorage.getItem(RECORDS_SIGNATURE_KEY);

    if (!savedText) {
      return INITIAL_RECORDS.map(normalizeRecord);
    }

    const savedRecords = JSON.parse(savedText);

    if (!Array.isArray(savedRecords)) {
      return INITIAL_RECORDS.map(normalizeRecord);
    }

    if (savedSignature !== INITIAL_RECORDS_SIGNATURE) {
      const starterIds = new Set(INITIAL_RECORDS.map((item) => item.id));
      const userCreatedRecords = savedRecords.filter(
        (item) => !starterIds.has(item.id)
      );

      return [...INITIAL_RECORDS, ...userCreatedRecords].map(normalizeRecord);
    }

    return savedRecords.map(normalizeRecord);
  } catch {
    return INITIAL_RECORDS.map(normalizeRecord);
  }
}

// Calculates item totals and VAT.
function calculateDocumentTotals(record) {
  const items = Array.isArray(record.items) ? record.items : [];
  const subtotal = items.reduce(
    (total, item) =>
      total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const vat = subtotal * ((Number(record.taxRate) || 0) / 100);

  return {
    subtotal,
    vat,
    total: subtotal + vat,
  };
}

// Handles the main SuppIT screen.
function App() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM);
  const [loginError, setLoginError] = useState("");
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [resetPasswords, setResetPasswords] = useState({});
  const [resetCurrentPasswords, setResetCurrentPasswords] = useState({});
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [usernameEdits, setUsernameEdits] = useState({});
  const [accountMessage, setAccountMessage] = useState("");

  const [activeTab, setActiveTab] = useState("quotes");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentType, setDocumentType] = useState("quote");
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [documentRecord, setDocumentRecord] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [transactionItems, setTransactionItems] = useState([
    { ...EMPTY_LINE_ITEM, id: "line-1" },
  ]);
  const fileInputRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [serverError, setServerError] = useState("");
  const [legacyRecords] = useState(loadRecords);
  const [form, setForm] = useState(EMPTY_FORM);

  const currentUser = users.find((user) => user.id === currentUserId) || null;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isContactTab = activeTab === "suppliers" || activeTab === "customers";
  const isTransactionTab = activeTab === "orders" || activeTab === "quotes";
  const isStockTab = activeTab === "stock";
  const isOperationsTab = ["invoices","payments","reminders","reports"].includes(activeTab);
  const stockItems = useMemo(() => records.filter(item => item.category === "stock"), [records]);

  useEffect(() => {
    // Checks the current login.
    async function restoreSession() {
      try {
        const result = await api("/auth/me");
        const user = displayUser(result);
        setUsers([user]);
        setCurrentUserId(user.id);
        const { records: saved } = await api("/records");
        setRecords(saved.map(normalizeRecord));
        if (user.role === "admin" || user.role === "superadmin") {
          const result = await api("/users");
          setUsers(result.map(displayUser));
        }
      } catch (error) {
        if (!error.message.includes("sign in") && !error.message.includes("401")) setServerError(error.message);
      } finally { setLoadingSession(false); }
    }
    restoreSession();
  }, []);

  // Loads business records from Neon.
  async function refreshRecords() {
    const { records: saved } = await api("/records");
    setRecords(saved.map(normalizeRecord));
  }

  // Saves records through the API.
  async function saveToServer(record, editing = false) {
    await api(editing ? `/records/${encodeURIComponent(record.id)}` : "/records", {
      method: editing ? "PUT" : "POST", body: JSON.stringify({ record }),
    });
    await refreshRecords();
  }

  // Imports old local records.
  async function importLegacyRecords() {
    if (!window.confirm(`Import saved customers, suppliers and stock records into the connected database? Review records first; duplicates are not automatically merged.`)) return;
    try {
      const all = legacyRecords.filter(item => ["suppliers","customers","stock"].includes(item.category));
      for (let index = 0; index < all.length; index += 500) {
        await api("/records/import", { method: "POST", body: JSON.stringify({ records: all.slice(index,index+500) }) });
      }
      await refreshRecords();
      setImportMessage("Available customer, supplier and stock records imported. Check for duplicates.");
    } catch(error) { setImportMessage(`Import failed: ${error.message}`); }
  }

  useEffect(() => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setImportMessage("");
  }, [activeTab]);

  const tabRecords = useMemo(
    () => records.filter((item) => item.category === activeTab),
    [records, activeTab]
  );

  const customers = useMemo(
    () => records.filter((item) => item.category === "customers"),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tabRecords
      .filter((item) => {
        let searchableText = "";

        if (isContactTab) {
          searchableText = [
            item.fullCompanyName,
            item.physicalAddress,
            item.email,
            item.phone,
            item.bankingDetails,
            item.notes,
          ]
            .join(" ")
            .toLowerCase();
        } else if (isStockTab) {
          searchableText = [
            item.sku,
            item.itemName,
            item.description,
            item.supplier,
          ]
            .join(" ")
            .toLowerCase();
        } else {
          searchableText = [
            item.reference,
            item.title,
            item.company,
            item.customerEmail,
            item.notes,
            item.status,
          ]
            .join(" ")
            .toLowerCase();
        }

        const matchesSearch = !query || searchableText.includes(query);

        if (!isTransactionTab) {
          return matchesSearch;
        }

        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Open" && !item.completed) ||
          (statusFilter === "Completed" && item.completed);

        const matchesPriority =
          priorityFilter === "All" || item.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        if (isContactTab) {
          return String(a.fullCompanyName).localeCompare(String(b.fullCompanyName));
        }

        if (isStockTab) {
          return String(a.sku).localeCompare(String(b.sku));
        }

        if (a.completed !== b.completed) {
          return Number(a.completed) - Number(b.completed);
        }

        return String(a.reference).localeCompare(String(b.reference));
      });
  }, [
    tabRecords,
    search,
    statusFilter,
    priorityFilter,
    isContactTab,
    isTransactionTab,
    isStockTab,
  ]);

  const stats = useMemo(() => {
    if (isContactTab) {
      return {
        firstLabel: "Total companies",
        firstValue: tabRecords.length,
        secondLabel: "With email",
        secondValue: tabRecords.filter((item) => item.email).length,
        thirdLabel: "With phone",
        thirdValue: tabRecords.filter((item) => item.phone).length,
        fourthLabel: "Banking details",
        fourthValue: tabRecords.filter((item) => item.bankingDetails).length,
      };
    }

    if (isStockTab) {
      return {
        firstLabel: "Stock items",
        firstValue: tabRecords.length,
        secondLabel: "Total quantity",
        secondValue: tabRecords.reduce(
          (total, item) => total + (Number(item.quantity) || 0),
          0
        ),
        thirdLabel: "Low stock",
        thirdValue: tabRecords.filter((item) => Number(item.quantity) <= 5)
          .length,
        fourthLabel: "Stock cost value",
        fourthValue: formatCurrency(
          tabRecords.reduce(
            (total, item) =>
              total +
              (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
            0
          )
        ),
      };
    }

    const open = tabRecords.filter((item) => !item.completed);

    return {
      firstLabel: `Total ${activeTab}`,
      firstValue: tabRecords.length,
      secondLabel: "Open",
      secondValue: open.length,
      thirdLabel: "High priority",
      thirdValue: open.filter((item) => item.priority === "High").length,
      fourthLabel: "Completed",
      fourthValue: tabRecords.filter((item) => item.completed).length,
    };
  }, [tabRecords, activeTab, isContactTab, isStockTab]);

  const copy = PAGE_COPY[activeTab];

  // Sends login details to the backend.
  async function signIn(event) {
    event.preventDefault();
    setLoginError("");
    try {
      const result = await api("/auth/login", { method:"POST", body:JSON.stringify(loginForm) });
      const user = displayUser(result);
      setUsers([user]);
      setCurrentUserId(user.id);
      setLoginForm(EMPTY_LOGIN_FORM);
      await refreshRecords();
      if (user.role === "admin" || user.role === "superadmin") {
        const result = await api("/users");
        setUsers(result.map(displayUser));
      }
      setServerError("");
    } catch(error) { setLoginError(error.message); }
  }

  // Signs out the current user.
  async function signOut() {
    try { await api("/auth/logout", { method:"POST" }); } catch { /* clear UI regardless */ }
    setCurrentUserId("");
    setUsers([]);
    setRecords([]);
    setUserManagementOpen(false);
    setDetailsOpen(false);
    setDocumentOpen(false);
    setModalOpen(false);
  }

  // Opens user management.
  function openUserManagement() {
    if (!isAdmin) return;
    setResetPasswords({});
    setResetCurrentPasswords({});
    setNewUser(EMPTY_NEW_USER);
    setUsernameEdits({});
    setAccountMessage("");
    setUserManagementOpen(true);
  }

  // Loads permitted user accounts.
  async function refreshUsers() {
    const result = await api("/users");
    setUsers(result.map(displayUser));
  }

  // Creates users through the backend.
  async function createUser(event) {
    event.preventDefault();
    if (!isAdmin) return;
    try {
      await api("/users", { method:"POST", body:JSON.stringify({...newUser, email: newUser.email || null}) });
      await refreshUsers();
      setNewUser(EMPTY_NEW_USER);
      setAccountMessage("Account created. The person can sign in using their username and password.");
    } catch(error) { setAccountMessage(error.message); }
  }

  // Updates a username.
  async function saveUsername(userId) {
    if (!isAdmin) return;
    const username = String(usernameEdits[userId] || "").trim();
    try {
      await api(`/users/${encodeURIComponent(userId)}`, {
        method:"PATCH", body:JSON.stringify({username})
      });
      await refreshUsers();
      setUsernameEdits(current => ({...current,[userId]:""}));
      setAccountMessage("Login username saved. This user can now sign in with it.");
    } catch(error) { setAccountMessage(error.message); }
  }

  // Requests a permitted password reset.
  async function resetUserPassword(userId) {
    if (!isAdmin) return;
    const password = String(resetPasswords[userId] ?? "");
    if (password.length < 12) { setAccountMessage("Password must contain at least 12 characters."); return; }
    try {
      const result = await api(`/users/${encodeURIComponent(userId)}/password`, {
        method:"PATCH",
        body:JSON.stringify({password,currentPassword:resetCurrentPasswords[userId] || undefined})
      });
      setResetPasswords(current => ({...current,[userId]:""}));
      setResetCurrentPasswords(current => ({...current,[userId]:""}));
      if (result.signedOut) {
        await signOut();
        return;
      }
      setAccountMessage("Password reset successfully. Previous sessions for that user have been signed out.");
    } catch(error) { setAccountMessage(error.message); }
  }

  // Changes the current page.
  function selectTab(tabId) {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  }

  // Opens the new record form.
  function openAddModal() {
    if (activeTab === "orders" || isOperationsTab) return;
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      reference:
        activeTab === "orders" || activeTab === "quotes"
          ? getNextReference(activeTab, records)
          : "",
      sku: activeTab === "stock" ? getNextStockSku(records) : "",
    });
    setTransactionItems([{ ...EMPTY_LINE_ITEM, id: `line-${Date.now()}` }]);
    setModalOpen(true);
  }

  // Loads a record for editing.
  function openEditModal(record) {
    setEditingId(record.id);
    setForm({
      reference: record.reference ?? "",
      title: record.title ?? "",
      company: record.company ?? "",
      customerEmail: record.customerEmail ?? "",
      dueDate: record.dueDate ?? "",
      priority: record.priority ?? "Medium",
      notes: record.notes ?? "",
      taxRate: Number(record.taxRate) || 15,
      fullCompanyName: record.fullCompanyName ?? "",
      physicalAddress: record.physicalAddress ?? "",
      email: record.email ?? "",
      phone: record.phone ?? "",
      bankingDetails: record.bankingDetails ?? "",
      sku: record.sku ?? "",
      itemName: record.itemName ?? "",
      description: record.description ?? "",
      quantity: Number(record.quantity) || 0,
      unitCost: Number(record.unitCost) || 0,
      sellPrice: Number(record.sellPrice) || 0,
      supplier: record.supplier ?? "",
    });
    setTransactionItems(
      Array.isArray(record.items) && record.items.length > 0
        ? record.items.map((item) => ({ ...item }))
        : [{ ...EMPTY_LINE_ITEM, id: `line-${Date.now()}` }]
    );
    setModalOpen(true);
  }

  // Shows record details.
  function openDetails(record) {
    setSelectedRecord(record);
    setDetailsOpen(true);
  }

  // Edits a quotation item.
  function updateLineItem(itemId, field, value) {
    setTransactionItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]:
                field === "quantity" || field === "unitPrice"
                  ? Number(value)
                  : value,
            }
          : item
      )
    );
  }

  // Uses stock details in the quotation.
  function selectStockForLine(itemId, sku) {
    const selected = stockItems.find(stock => String(stock.sku) === String(sku));
    setTransactionItems(current => current.map(line => {
      if (line.id !== itemId) return line;
      if (!selected) return { ...line, stockSku: "" };
      return {
        ...line,
        stockSku: selected.sku,
        stockItemId: selected.id,
        description: [selected.itemName, selected.description].filter(Boolean).join(" - "),
        unitPrice: Number(selected.sellPrice) || 0,
      };
    }));
  }

  // Adds a quotation item.
  function addLineItem() {
    setTransactionItems((current) => [
      ...current,
      { ...EMPTY_LINE_ITEM, id: `line-${Date.now()}` },
    ]);
  }

  // Removes a quotation item.
  function removeLineItem(itemId) {
    setTransactionItems((current) =>
      current.length === 1
        ? current
        : current.filter((item) => item.id !== itemId)
    );
  }

  // Updates the selected customer.
  function handleCompanyChange(value) {
    const matchedCustomer = customers.find(
      (customer) =>
        customer.fullCompanyName.toLowerCase() === value.trim().toLowerCase()
    );

    setForm({
      ...form,
      company: value,
      customerEmail: matchedCustomer?.email || form.customerEmail,
    });
  }

  // Validates and saves the record.
  async function saveRecord(event) {
    event.preventDefault();

    if (isContactTab && !form.fullCompanyName.trim()) return;
    if (isStockTab && !form.itemName.trim()) return;

    if (
      isTransactionTab &&
      (!form.title.trim() || !form.company.trim() || !form.dueDate)
    ) {
      return;
    }

    if (
      isTransactionTab &&
      transactionItems.some((item) => !item.description.trim())
    ) {
      return;
    }

    try {
      let newRecord;
      if (isContactTab) {
        newRecord = { id: editingId ?? crypto.randomUUID(), category:activeTab,
          fullCompanyName:form.fullCompanyName.trim(),physicalAddress:form.physicalAddress.trim(),
          email:form.email.trim(),phone:form.phone.trim(),bankingDetails:form.bankingDetails.trim(),notes:form.notes.trim() };
      } else if (isStockTab) {
        newRecord = { id:editingId ?? crypto.randomUUID(),category:"stock",
          sku:form.sku.trim() || getNextStockSku(records),itemName:form.itemName.trim(),
          description:form.description.trim(),quantity:Number(form.quantity)||0,
          unitCost:Number(form.unitCost)||0,sellPrice:Number(form.sellPrice)||0,supplier:form.supplier.trim() };
      } else {
        const reference = editingId ? records.find(item=>item.id===editingId)?.reference : getNextReference(activeTab,records);
        const previous = editingId ? records.find(item=>item.id===editingId) : null;
        newRecord = { ...previous,id:editingId ?? crypto.randomUUID(),category:activeTab,reference,
          invoiceReference:activeTab==="orders" ? (previous?.invoiceReference || getInvoiceReference(reference)) : undefined,
          title:form.title.trim(),company:form.company.trim(),customerEmail:form.customerEmail.trim(),
          dueDate:form.dueDate,priority:form.priority,completed:previous?.completed||false,
          status:previous?.status || (activeTab==="quotes"?"Pending":"Open"),notes:form.notes.trim(),
          taxRate:Number(form.taxRate)||0,items:transactionItems.map(line=>({...line})) };
      }
      await saveToServer(newRecord,!!editingId);
    } catch(error) { window.alert(`Save failed: ${error.message}`); return; }

    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // Updates the selected record.
  async function toggleCompleted(id) {
    const item=records.find(r=>r.id===id);
    if(!item) return;
    if(item.category === "quotes") { window.alert("Use the Accept and create order action to finalise a quotation."); return; }
    if(item.category==="quotes" && item.convertedOrderReference) {
      window.alert("Accepted quotes cannot be reopened here."); return;
    }
    try { await saveToServer({...item,completed:!item.completed,status:!item.completed?"Completed":"Open"},true); }
    catch(error) { window.alert(error.message); }
  }

  // Creates an invoice from an order.
  async function generateInvoice(record) {
    if(record.category !== "orders")return;
    if(record.invoiceReference){ window.alert("This order already has an invoice."); return; }
    const issueDate = new Date().toISOString().slice(0,10);
    const dueDate = window.prompt("Enter invoice due date (YYYY-MM-DD)", issueDate);
    if(!dueDate)return;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||dueDate<issueDate){window.alert("Enter a valid date on or after the issue date.");return;}
    try {await api(`/orders/${record.id}/invoice`,{method:"POST",body:JSON.stringify({issueDate,dueDate})});await refreshRecords();window.alert("Invoice created in Neon. Open the order to preview and download it.");}
    catch(e){window.alert(e.message);}
  }

  // Accepts the selected quotation.
  async function confirmQuote(record) {
    if (record.category !== "quotes" || record.convertedOrderReference) return;
    try {
      const {order}=await api(`/quotes/${encodeURIComponent(record.id)}/accept`,{method:"POST"});
      await refreshRecords();
      setDetailsOpen(false);
      setSelectedRecord(null);
      setActiveTab("orders");
      setImportMessage(`${record.reference} was accepted and converted to ${order.reference}.`);
    } catch(error) { window.alert(`Quote conversion failed: ${error.message}`); }
  }

  // Requests a safe record deletion.
  async function deleteRecord(record) {
    const name=record.fullCompanyName||record.reference||record.sku||record.itemName||record.title||"this record";
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await api(`/records/${encodeURIComponent(record.id)}`,{method:"DELETE"});
      await refreshRecords();
      if(selectedRecord?.id===record.id){setDetailsOpen(false);setSelectedRecord(null);}
    } catch(error) { window.alert(`Delete failed: ${error.message}`); }
  }

  // Prepares imported contact records.
  async function importContacts(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImportMessage("Importing file...");

    try {
      const text = await file.text();
      const rows = readImportFile(file, text);

      const importedRecords = rows
        .map((row, index) => {
          const fullCompanyName = readColumn(row, [
            "full company name",
            "company name",
            "company",
            "supplier",
            "customer",
            "business name",
            "name",
          ]);

          if (!String(fullCompanyName).trim()) return null;

          return {
            id: Date.now() + index,
            category: activeTab,
            fullCompanyName: String(fullCompanyName).trim(),
            physicalAddress: String(
              readColumn(row, [
                "physical address",
                "business address",
                "street address",
                "address",
              ])
            ).trim(),
            email: String(
              readColumn(row, ["email", "email address", "company email"])
            ).trim(),
            phone: String(
              readColumn(row, [
                "phone",
                "phone number",
                "telephone",
                "mobile",
                "contact number",
              ])
            ).trim(),
            bankingDetails: String(
              readColumn(row, [
                "banking details",
                "bank details",
                "bank account",
                "account details",
                "payment details",
              ])
            ).trim(),
            notes: String(
              readColumn(row, ["notes", "comments", "details"])
            ).trim(),
          };
        })
        .filter(Boolean);

      if (importedRecords.length === 0) {
        throw new Error(
          'No companies were imported. Add a heading such as "Company Name".'
        );
      }

      await api("/records/import", { method:"POST", body:JSON.stringify({records:importedRecords}) });
      await refreshRecords();
      setImportMessage(
        `${importedRecords.length} ${
          activeTab === "suppliers" ? "supplier" : "customer"
        }${importedRecords.length === 1 ? "" : "s"} imported successfully.`
      );
    } catch (error) {
      setImportMessage(`Import failed: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  // Finds the customer for a document.
  function getCustomerForRecord(record) {
    return customers.find(
      (customer) =>
        customer.fullCompanyName.toLowerCase() ===
        String(record.company || "").trim().toLowerCase()
    );
  }

  // Previews the quotation or invoice.
  function openDocumentPreview(record) {
    if (record.category === "orders" && !record.invoiceReference) {
      window.alert("Generate an invoice for this order first using the invoice API. Phase 4 requires the invoice to be saved in Neon before preview.");
      return;
    }
    setDocumentType(record.category === "quotes" ? "quote" : "invoice");
    setDocumentRecord(record);
    setDetailsOpen(false);
    setDocumentOpen(true);
  }

  // Opens email; the PDF is attached manually.
  function openDefaultEmailApp(record, type) {
    const customer = getCustomerForRecord(record);
    const email = record.customerEmail || customer?.email || "";
    const number =
      type === "quote"
        ? record.reference
        : record.invoiceReference || "";
    const totals = calculateDocumentTotals(record);
    const documentName = type === "quote" ? "quotation" : "invoice";
    const subject = `WaterMark Dev ${documentName} ${number}`;
    const body = [
      `Dear ${record.company || "Customer"},`,
      "",
      `Please review ${documentName} ${number}.`,
      `Total: ${formatCurrency(totals.total)}`,
      "",
      "The document was previewed in the WaterMark Dev Reminder System.",
      "Please attach the saved or printed PDF before sending this email.",
      "",
      "Kind regards,",
      "WaterMark Dev",
    ].join("\n");

    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  if (loadingSession) return <div className="login-page"><section className="login-card"><h2>Loading SuppIT...</h2></section></div>;

  if (!currentUser) {
    return (
      <div className="login-page">
        <section className="login-card">
          <div className="login-brand">
            <BrandLogo className="login-logo" />

            <div>
              <strong>WaterMark Dev</strong>
              <span>Reminder System</span>
            </div>
          </div>

          <div className="login-heading">
            <p className="eyebrow">Secure local access</p>
            <h1>Sign in</h1>
            <p>Sign in with your username and password.</p>
            {serverError && <p className="login-error">Server: {serverError}</p>}
          </div>

          <form className="login-form" onSubmit={signIn}>
            <label className="form-field">
              <span>Username</span>
              <input
                type="text"
                value={loginForm.identifier}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, identifier: event.target.value })
                }
                placeholder="Enter your username"
                autoComplete="username"
                required
                autoFocus
              />
            </label>

            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, password: event.target.value })
                }
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </label>

            {loginError && <p className="login-error">{loginError}</p>}

            <button className="primary-button login-button" type="submit">
              <Icon name="shield" size={18} />
              Sign in
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`}>
        <div className="brand sidebar-brand">
          <BrandLogo className="sidebar-logo" />

          <div className="sidebar-brand-text">
            <strong>WaterMark Dev Team</strong>
            <span>Reminder System</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>

          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${
                activeTab === tab.id ? "nav-item--active" : ""
              }`}
              onClick={() => selectTab(tab.id)}
              type="button"
            >
              <span className="nav-item__icon">
                <Icon name={tab.icon} size={19} />
              </span>
              <span>{tab.label}</span>
              <span className="nav-item__count">
                {records.filter((item) => item.category === tab.id).length}
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar-tip">
            <div className="sidebar-tip__icon">
              <Icon name="bell" size={18} />
            </div>
            <div>
              <strong>Neon PostgreSQL backend</strong>
              <p>
                Records are saved through the secure API.
              </p>
            </div>
          </div>

          {isAdmin && legacyRecords.length > 0 && (
            <button className="sidebar-account-button" onClick={importLegacyRecords} type="button">
              <Icon name="upload" size={17} /> Import old browser records
            </button>
          )}

          {isAdmin && (
            <button
              className="sidebar-account-button"
              onClick={openUserManagement}
              type="button"
            >
              <Icon name="key" size={17} />
              Manage users &amp; passwords
            </button>
          )}

          <button
            className="sidebar-account-button"
            onClick={signOut}
            type="button"
          >
            <Icon name="logout" size={17} />
            Sign out
          </button>

          <div className="user-card">
            <div className="avatar">
              {currentUser.displayName
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <strong>{currentUser.displayName}</strong>
              <span>{isSuperAdmin ? "Super Administrator" : isAdmin ? "Administrator" : "Staff user"}</span>
            </div>
            <Icon name="chevron" size={16} />
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        />
      )}

      <main className="main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
            type="button"
          >
            <Icon name="menu" />
          </button>

          <div className="topbar__search">
            <Icon name="search" size={19} />
            <input
              type="search"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isContactTab && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.html,.htm"
                onChange={importContacts}
                hidden
              />
              <button
                className="secondary-button topbar-import-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Icon name="upload" size={18} />
                Import CSV or HTML
              </button>
            </>
          )}

          <button
            className="notification-button"
            aria-label="Notifications"
            type="button"
          >
            <Icon name="bell" size={20} />
            <span />
          </button>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">{copy.eyebrow}</p>
              <h1>{copy.title}</h1>
              <p className="page-heading__description">{copy.description}</p>
            </div>

            <button
              className="primary-button"
              onClick={openAddModal}
              disabled={activeTab === "orders" || isOperationsTab}
              title={activeTab === "orders" ? "Accept a quotation to create an order" : isOperationsTab ? "Use controls in this module" : undefined}
              type="button"
            >
              <Icon name="plus" size={19} />
              {copy.button}
            </button>
          </section>

          {importMessage && (
            <div
              className={`import-message ${
                importMessage.startsWith("Import failed")
                  ? "import-message--error"
                  : ""
              }`}
            >
              <span>{importMessage}</span>
              <button
                type="button"
                onClick={() => setImportMessage("")}
                aria-label="Close message"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          {isOperationsTab ? <OperationsPanel activeTab={activeTab} /> : (<>
          <section className="stats-grid" aria-label="Statistics">
            {[
              [stats.firstLabel, stats.firstValue, isStockTab ? "box" : isContactTab ? "users" : "calendar", "blue"],
              [stats.secondLabel, stats.secondValue, isStockTab ? "package" : isContactTab ? "mail" : "clock", "amber"],
              [stats.thirdLabel, stats.thirdValue, isStockTab ? "bell" : isContactTab ? "phone" : "bell", "red"],
              [stats.fourthLabel, stats.fourthValue, isStockTab ? "bank" : isContactTab ? "bank" : "check", "green"],
            ].map(([label, value, icon, colour]) => (
              <article className="stat-card" key={label}>
                <div className={`stat-card__icon stat-card__icon--${colour}`}>
                  <Icon name={icon} />
                </div>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="reminders-panel">
            <div className="panel-header">
              <div>
                <h2>
                  {isContactTab
                    ? "Company records"
                    : isStockTab
                    ? "Stock records"
                    : "Business records"}
                </h2>
                <p>
                  {filteredRecords.length} of {tabRecords.length} records shown
                </p>
              </div>

              {isTransactionTab && (
                <div className="filters">
                  <label>
                    <span className="sr-only">Filter by status</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option>All</option>
                      <option>Open</option>
                      <option>Completed</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Filter by priority</span>
                    <select
                      value={priorityFilter}
                      onChange={(event) => setPriorityFilter(event.target.value)}
                    >
                      <option>All</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="reminder-list">
              {filteredRecords.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <Icon
                      name={isContactTab ? "users" : isStockTab ? "box" : "calendar"}
                      size={28}
                    />
                  </div>
                  <h3>No records found</h3>
                  <p>
                    Create a new record
                    {isContactTab ? " or import a CSV or HTML file." : "."}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={openAddModal}
                    disabled={activeTab === "orders"}
                    type="button"
                  >
                    <Icon name="plus" size={18} />
                    {copy.button}
                  </button>
                </div>
              ) : isContactTab ? (
                filteredRecords.map((record) => (
                  <article className="company-card" key={record.id}>
                    <div className="company-card__avatar">
                      {record.fullCompanyName
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="company-card__body">
                      <h3>{record.fullCompanyName}</h3>
                      <div className="company-card__summary">
                        <span>
                          <Icon name="mail" size={15} />
                          {record.email || "No email"}
                        </span>
                        <span>
                          <Icon name="phone" size={15} />
                          {record.phone || "No phone"}
                        </span>
                      </div>
                      {record.physicalAddress && (
                        <p className="company-address">
                          <Icon name="map" size={15} />
                          {record.physicalAddress}
                        </p>
                      )}
                    </div>
                    <RecordActions
                      record={record}
                      onView={openDetails}
                      onEdit={openEditModal}
                      onDelete={deleteRecord}
                    />
                  </article>
                ))
              ) : isStockTab ? (
                filteredRecords.map((record) => (
                  <article className="stock-card" key={record.id}>
                    <div className="stock-card__sku">{record.sku}</div>
                    <div className="stock-card__body">
                      <h3>{record.itemName}</h3>
                      <p>{record.description || "No description"}</p>
                      <div className="stock-card__meta">
                        <span>Quantity: {record.quantity}</span>
                        <span>Cost: {formatCurrency(record.unitCost)}</span>
                        <span>Sell: {formatCurrency(record.sellPrice)}</span>
                        <span>Supplier: {record.supplier || "Not supplied"}</span>
                      </div>
                    </div>
                    <RecordActions
                      record={record}
                      onView={openDetails}
                      onEdit={openEditModal}
                      onDelete={deleteRecord}
                    />
                  </article>
                ))
              ) : (
                filteredRecords.map((record) => (
                  <article
                    className={`reminder-card ${
                      record.completed ? "reminder-card--completed" : ""
                    }`}
                    key={record.id}
                  >
                    <button
                      className={`check-button ${
                        record.completed ? "check-button--checked" : ""
                      }`}
                      onClick={() => toggleCompleted(record.id)}
                      aria-label={
                        record.completed ? "Mark as open" : "Mark as completed"
                      }
                      type="button"
                    >
                      {record.completed && <Icon name="check" size={15} />}
                    </button>

                    <div className="reminder-card__body">
                      <div className="reminder-card__topline">
                        <span className="reference-badge">{record.reference}</span>
                        <h3>{record.title}</h3>
                        <span
                          className={`priority priority--${record.priority.toLowerCase()}`}
                        >
                          {record.priority}
                        </span>
                        <span className="status-badge">{record.status}</span>
                      </div>
                      <p className="contact-name">{record.company}</p>
                      {record.notes && (
                        <p className="reminder-notes">{record.notes}</p>
                      )}
                      <div className="reminder-meta">
                        <span>
                          <Icon name="calendar" size={16} />
                          {formatDate(record.dueDate)}
                        </span>
                        <span className="relative-date">
                          {getRelativeDate(record.dueDate)}
                        </span>
                        {record.convertedOrderReference && (
                          <span>Order: {record.convertedOrderReference}</span>
                        )}
                      </div>
                    </div>

                    <div className="record-actions">
                      {record.category === "orders" && !record.invoiceReference && (
                        <button className="secondary-button compact-button" onClick={() => generateInvoice(record)} type="button">Generate invoice</button>
                      )}
                      <button
                        className="action-button"
                        onClick={() => openDocumentPreview(record)}
                        type="button"
                        title={record.category === "quotes" ? "Preview quote" : "Preview invoice"}
                      >
                        <Icon name="file" size={18} />
                      </button>
                      {record.category === "quotes" &&
                        !record.convertedOrderReference && (
                          <button
                            className="action-button action-button--success"
                            onClick={() => confirmQuote(record)}
                            type="button"
                            title="Accept quote and create order"
                          >
                            <Icon name="arrowRight" size={18} />
                          </button>
                        )}
                      <button
                        className="action-button"
                        onClick={() => openDetails(record)}
                        type="button"
                        title="View details"
                      >
                        <Icon name="eye" size={18} />
                      </button>
                      <button
                        className="action-button"
                        disabled={record.category === "orders" || !!record.convertedOrderReference}
                        onClick={() => openEditModal(record)}
                        type="button"
                        title="Edit"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        className="action-button action-button--danger"
                        disabled={record.category === "orders" || !!record.convertedOrderReference}
                        onClick={() => deleteRecord(record)}
                        type="button"
                        title="Delete"
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
          </>)}
        </div>
      </main>

      {modalOpen && (
        <RecordFormModal
          activeTab={activeTab}
          editingId={editingId}
          form={form}
          setForm={setForm}
          transactionItems={transactionItems}
          customers={customers}
          stockItems={stockItems}
          onSelectStock={selectStockForLine}
          onCompanyChange={handleCompanyChange}
          onUpdateLineItem={updateLineItem}
          onAddLineItem={addLineItem}
          onRemoveLineItem={removeLineItem}
          onClose={() => setModalOpen(false)}
          onSubmit={saveRecord}
        />
      )}

      {detailsOpen && selectedRecord && (
        <DetailsModal
          record={selectedRecord}
          onClose={() => setDetailsOpen(false)}
          onEdit={(record) => {
            setDetailsOpen(false);
            openEditModal(record);
          }}
          onDelete={deleteRecord}
          onPreview={openDocumentPreview}
          onConfirmQuote={confirmQuote}
        />
      )}

      {documentOpen && documentRecord && (
        <DocumentPreviewModal
          record={documentRecord}
          type={documentType}
          customer={getCustomerForRecord(documentRecord)}
          onClose={() => setDocumentOpen(false)}
          onEmail={() => openDefaultEmailApp(documentRecord, documentType)}
        />
      )}

      {userManagementOpen && isAdmin && (
        <UserManagementModal
          users={users}
          currentUserId={currentUserId}
          newUser={newUser}
          setNewUser={setNewUser}
          onCreateUser={createUser}
          usernameEdits={usernameEdits}
          setUsernameEdits={setUsernameEdits}
          onSaveUsername={saveUsername}
          isSuperAdmin={isSuperAdmin}
          resetPasswords={resetPasswords}
          setResetPasswords={setResetPasswords}
          resetCurrentPasswords={resetCurrentPasswords}
          setResetCurrentPasswords={setResetCurrentPasswords}
          accountMessage={accountMessage}
          setAccountMessage={setAccountMessage}
          onResetPassword={resetUserPassword}
          onClose={() => setUserManagementOpen(false)}
        />
      )}
    </div>
  );
}

// Shows the record actions.
function RecordActions({ record, onView, onEdit, onDelete }) {
  return (
    <div className="record-actions">
      <button
        className="action-button"
        onClick={() => onView(record)}
        type="button"
        title="View details"
      >
        <Icon name="eye" size={18} />
      </button>
      <button
        className="action-button"
        onClick={() => onEdit(record)}
        type="button"
        title="Edit"
      >
        <Icon name="edit" size={18} />
      </button>
      <button
        className="action-button action-button--danger"
        onClick={() => onDelete(record)}
        type="button"
        title="Delete"
      >
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}

// Shows the record form.
function RecordFormModal({
  activeTab,
  editingId,
  form,
  setForm,
  transactionItems,
  customers,
  stockItems,
  onSelectStock,
  onCompanyChange,
  onUpdateLineItem,
  onAddLineItem,
  onRemoveLineItem,
  onClose,
  onSubmit,
}) {
  const isContactTab = activeTab === "suppliers" || activeTab === "customers";
  const isStockTab = activeTab === "stock";
  const isTransactionTab = activeTab === "orders" || activeTab === "quotes";

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal record-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal__header">
          <div>
            <p className="eyebrow">
              {editingId ? "Edit" : "New"} {activeTab.slice(0, -1)}
            </p>
            <h2 id="modal-title">
              {editingId ? "Update record" : `Add ${activeTab.slice(0, -1)}`}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close form"
            type="button"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            {isContactTab && (
              <>
                <label className="form-field form-field--full">
                  <span>Full company name</span>
                  <input
                    type="text"
                    value={form.fullCompanyName}
                    onChange={(event) =>
                      setForm({ ...form, fullCompanyName: event.target.value })
                    }
                    required
                    autoFocus
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Physical address</span>
                  <textarea
                    rows="3"
                    value={form.physicalAddress}
                    onChange={(event) =>
                      setForm({ ...form, physicalAddress: event.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Phone number</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Banking details</span>
                  <textarea
                    rows="5"
                    value={form.bankingDetails}
                    onChange={(event) =>
                      setForm({ ...form, bankingDetails: event.target.value })
                    }
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Notes</span>
                  <textarea
                    rows="3"
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                  />
                </label>
              </>
            )}

            {isStockTab && (
              <>
                <label className="form-field">
                  <span>Stock code</span>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(event) =>
                      setForm({ ...form, sku: event.target.value })
                    }
                    readOnly={!editingId}
                  />
                </label>
                <label className="form-field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm({ ...form, quantity: Number(event.target.value) })
                    }
                    required
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Item name</span>
                  <input
                    type="text"
                    value={form.itemName}
                    onChange={(event) =>
                      setForm({ ...form, itemName: event.target.value })
                    }
                    required
                    autoFocus
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Description</span>
                  <textarea
                    rows="3"
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Unit cost</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitCost}
                    onChange={(event) =>
                      setForm({ ...form, unitCost: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Selling price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellPrice}
                    onChange={(event) =>
                      setForm({ ...form, sellPrice: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Supplier</span>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(event) =>
                      setForm({ ...form, supplier: event.target.value })
                    }
                  />
                </label>
              </>
            )}

            {isTransactionTab && (
              <>
                <label className="form-field">
                  <span>
                    {activeTab === "orders" ? "Order number" : "Quote number"}
                  </span>
                  <input type="text" value={form.reference} readOnly />
                </label>
                <label className="form-field">
                  <span>Priority</span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value })
                    }
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>
                <label className="form-field form-field--full">
                  <span>Title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    required
                    autoFocus
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Customer or company</span>
                  <input
                    type="text"
                    list="customer-list"
                    value={form.company}
                    onChange={(event) => onCompanyChange(event.target.value)}
                    required
                  />
                  <datalist id="customer-list">
                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.fullCompanyName}
                      />
                    ))}
                  </datalist>
                </label>
                <label className="form-field">
                  <span>Customer email</span>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(event) =>
                      setForm({ ...form, customerEmail: event.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Due date</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm({ ...form, dueDate: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="form-field">
                  <span>VAT percentage</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.taxRate}
                    onChange={(event) =>
                      setForm({ ...form, taxRate: Number(event.target.value) })
                    }
                  />
                </label>

                <div className="form-field form-field--full line-items-editor">
                  <div className="line-items-editor__header">
                    <span>Quote / invoice items</span>
                    <button
                      className="secondary-button compact-button"
                      onClick={onAddLineItem}
                      type="button"
                    >
                      <Icon name="plus" size={16} />
                      Add item
                    </button>
                  </div>

                  {transactionItems.map((item, index) => (
                    <div className="line-item-row" key={item.id}>
                      <label>
                        <span>Stock item (from Neon database)</span>
                        <select
                          value={item.stockSku || ""}
                          onChange={(event) => onSelectStock(item.id, event.target.value)}
                        >
                          <option value="">Custom item / manual description</option>
                          {stockItems.map(stock => (
                            <option key={stock.id} value={stock.sku}>
                              {stock.sku} - {stock.itemName} (R {Number(stock.sellPrice || 0).toFixed(2)}, {stock.quantity} available)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Description</span>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(event) =>
                            onUpdateLineItem(
                              item.id,
                              "description",
                              event.target.value
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        <span>Quantity</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            onUpdateLineItem(
                              item.id,
                              "quantity",
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Unit price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) =>
                            onUpdateLineItem(
                              item.id,
                              "unitPrice",
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <button
                        className="action-button action-button--danger line-item-delete"
                        onClick={() => onRemoveLineItem(item.id)}
                        type="button"
                        title={`Remove item ${index + 1}`}
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                  ))}
                </div>

                <label className="form-field form-field--full">
                  <span>Notes</span>
                  <textarea
                    rows="4"
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                  />
                </label>
              </>
            )}
          </div>

          <div className="modal__actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" type="submit">
              <Icon name={editingId ? "edit" : "plus"} size={18} />
              {editingId ? "Save changes" : "Save record"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// Shows the selected record.
function DetailsModal({
  record,
  onClose,
  onEdit,
  onDelete,
  onPreview,
  onConfirmQuote,
}) {
  const isContact = record.category === "suppliers" || record.category === "customers";
  const isStock = record.category === "stock";
  const isQuote = record.category === "quotes";
  const isOrder = record.category === "orders";

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
      >
        <div className="modal__header">
          <div>
            <p className="eyebrow">Record details</p>
            <h2 id="details-title">
              {record.fullCompanyName || record.reference || record.sku}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close details"
            type="button"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="detail-content">
          {isContact && (
            <div className="detail-grid">
              <DetailItem label="Full company name" full>
                <strong>{record.fullCompanyName}</strong>
              </DetailItem>
              <DetailItem label="Physical address" full>
                <p>{record.physicalAddress || "Not supplied"}</p>
              </DetailItem>
              <DetailItem label="Email">
                <p>{record.email || "Not supplied"}</p>
              </DetailItem>
              <DetailItem label="Phone">
                <p>{record.phone || "Not supplied"}</p>
              </DetailItem>
              <DetailItem label="Banking details" full>
                <pre>{record.bankingDetails || "Not supplied"}</pre>
              </DetailItem>
              <DetailItem label="Notes" full>
                <p>{record.notes || "No notes"}</p>
              </DetailItem>
            </div>
          )}

          {isStock && (
            <div className="detail-grid">
              <DetailItem label="Stock code">
                <strong>{record.sku}</strong>
              </DetailItem>
              <DetailItem label="Quantity">
                <p>{record.quantity}</p>
              </DetailItem>
              <DetailItem label="Item name" full>
                <strong>{record.itemName}</strong>
              </DetailItem>
              <DetailItem label="Description" full>
                <p>{record.description || "Not supplied"}</p>
              </DetailItem>
              <DetailItem label="Unit cost">
                <p>{formatCurrency(record.unitCost)}</p>
              </DetailItem>
              <DetailItem label="Selling price">
                <p>{formatCurrency(record.sellPrice)}</p>
              </DetailItem>
              <DetailItem label="Supplier" full>
                <p>{record.supplier || "Not supplied"}</p>
              </DetailItem>
            </div>
          )}

          {(isQuote || isOrder) && (
            <div className="detail-grid">
              <DetailItem label="Reference">
                <strong>{record.reference}</strong>
              </DetailItem>
              <DetailItem label="Status">
                <p>{record.status}</p>
              </DetailItem>
              <DetailItem label="Title" full>
                <strong>{record.title}</strong>
              </DetailItem>
              <DetailItem label="Customer or company" full>
                <p>{record.company}</p>
              </DetailItem>
              <DetailItem label="Email">
                <p>{record.customerEmail || "Not supplied"}</p>
              </DetailItem>
              <DetailItem label="Due date">
                <p>{formatDate(record.dueDate)}</p>
              </DetailItem>
              <DetailItem label="Priority">
                <p>{record.priority}</p>
              </DetailItem>
              {isOrder && (
                <DetailItem label="Invoice number">
                  <p>{record.invoiceReference}</p>
                </DetailItem>
              )}
              {record.sourceQuoteReference && (
                <DetailItem label="Source quote">
                  <p>{record.sourceQuoteReference}</p>
                </DetailItem>
              )}
              <DetailItem label="Notes" full>
                <p>{record.notes || "No notes"}</p>
              </DetailItem>
            </div>
          )}

          <div className="modal__actions detail-actions">
            {(isQuote || isOrder) && (
              <button
                className="secondary-button"
                onClick={() => onPreview(record)}
                type="button"
              >
                <Icon name="file" size={18} />
                Preview {isQuote ? "quote" : "invoice"}
              </button>
            )}
            {isQuote && !record.convertedOrderReference && (
              <button
                className="primary-button"
                onClick={() => onConfirmQuote(record)}
                type="button"
              >
                <Icon name="arrowRight" size={18} />
                Accept and create order
              </button>
            )}
            <button
              className="secondary-button"
              onClick={() => onEdit(record)}
              type="button"
            >
              <Icon name="edit" size={18} />
              Edit
            </button>
            <button
              className="danger-button"
              onClick={() => onDelete(record)}
              type="button"
            >
              <Icon name="trash" size={18} />
              Delete
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Shows a record field.
function DetailItem({ label, full = false, children }) {
  return (
    <div className={`detail-item ${full ? "detail-item--full" : ""}`}>
      <span>{label}</span>
      {children}
    </div>
  );
}

// Previews a business document.
function DocumentPreviewModal({ record, type, customer, onClose, onEmail }) {
  const documentRef = useRef(null);
  const [savingPdf, setSavingPdf] = useState(false);

  const totals = calculateDocumentTotals(record);
  const documentNumber =
    type === "quote"
      ? record.reference
      : record.invoiceReference || "";
  const heading = type === "quote" ? "QUOTATION" : "TAX INVOICE";

  // Generates a PDF and opens email.
  async function savePdfAndOpenEmail() {
    if (!documentRef.current || savingPdf) {
      return;
    }

    setSavingPdf(true);

    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = 0;

      pdf.addImage(
        imageData,
        "PNG",
        0,
        position,
        imageWidth,
        imageHeight
      );

      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(
          imageData,
          "PNG",
          0,
          position,
          imageWidth,
          imageHeight
        );
        heightLeft -= pageHeight;
      }

      const documentName = type === "quote" ? "quotation" : "invoice";
      const fileName = `${documentNumber}-${documentName}.pdf`;

      pdf.save(fileName);

      window.setTimeout(() => {
        onEmail();
      }, 700);
    } catch (error) {
      console.error("PDF generation failed:", error);
      window.alert(
        "The PDF could not be created. Please try Print / Save PDF instead."
      );
    } finally {
      setSavingPdf(false);
    }
  }

  return (
    <div className="modal-backdrop document-backdrop" role="presentation">
      <section
        className="modal document-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-title"
      >
        <div className="document-toolbar no-print">
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
          <button
            className="secondary-button"
            onClick={() => window.print()}
            type="button"
          >
            <Icon name="printer" size={18} />
            Print / Save PDF
          </button>
          <button
            className="primary-button"
            onClick={savePdfAndOpenEmail}
            disabled={savingPdf}
            type="button"
          >
            <Icon name="mail" size={18} />
            {savingPdf ? "Creating PDF..." : "Save PDF & Open Email"}
          </button>
          <button className="secondary-button" onClick={onEmail} type="button">
            <Icon name="mail" size={18} />
            Open email only
          </button>
        </div>

        <article
          className="document-sheet"
          id="document-preview"
          ref={documentRef}
        >
          <header className="document-header">
            <div className="document-brand">
              <BrandLogo className="document-logo" />
              <div>
                <strong>WaterMark Dev</strong>
                <span>Reminder System</span>
              </div>
            </div>
            <div className="document-heading">
              <h2 id="document-title">{heading}</h2>
              <strong>{documentNumber}</strong>
            </div>
          </header>

          <section className="document-addresses">
            <div>
              <span>From</span>
              <strong>WaterMark Dev</strong>
              <p>South Africa</p>
            </div>
            <div>
              <span>Bill to</span>
              <strong>{record.company}</strong>
              <p>{customer?.physicalAddress || "Address not supplied"}</p>
              <p>{record.customerEmail || customer?.email || "Email not supplied"}</p>
            </div>
            <div>
              <span>Date</span>
              <strong>{formatDate(new Date().toISOString().slice(0, 10))}</strong>
              <span>Due date</span>
              <strong>{formatDate(record.dueDate)}</strong>
            </div>
          </section>

          <table className="document-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {record.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td>
                    {formatCurrency(
                      (Number(item.quantity) || 0) *
                        (Number(item.unitPrice) || 0)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="document-summary">
            <div className="document-notes">
              <span>Notes</span>
              <p>{record.notes || "Thank you for your business."}</p>
              {type === "quote" && (
                <p>This quotation remains subject to final confirmation.</p>
              )}
            </div>
            <div className="document-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(totals.subtotal)}</strong>
              </div>
              <div>
                <span>VAT ({Number(record.taxRate) || 0}%)</span>
                <strong>{formatCurrency(totals.vat)}</strong>
              </div>
              <div className="document-total-row">
                <span>Total</span>
                <strong>{formatCurrency(totals.total)}</strong>
              </div>
            </div>
          </section>

          <footer className="document-footer">
            <p>Generated by WaterMark Dev Reminder System.</p>
          </footer>
        </article>
      </section>
    </div>
  );
}

// Shows permitted user controls.
function UserManagementModal({
  users,
  currentUserId,
  newUser,
  setNewUser,
  onCreateUser,
  usernameEdits,
  setUsernameEdits,
  onSaveUsername,
  isSuperAdmin,
  resetPasswords,
  setResetPasswords,
  resetCurrentPasswords,
  setResetCurrentPasswords,
  accountMessage,
  setAccountMessage,
  onResetPassword,
  onClose,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal user-management-modal" role="dialog" aria-modal="true" aria-labelledby="user-management-title">
        <div className="modal__header">
          <div>
            <p className="eyebrow">Administrator only</p>
            <h2 id="user-management-title">User and account management</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close user management" type="button">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="user-management-content">
          <p className="user-management-note">
            Create accounts with a username and password. Email is not required.
            Administrators can manage Staff accounts, while only the Super Admin can create Admin accounts or reset Admin passwords.
          </p>

          {accountMessage && (
            <div className="import-message" role="status">
              <span>{accountMessage}</span>
              <button type="button" onClick={() => setAccountMessage("")} aria-label="Dismiss message">
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          <form className="user-create-form" onSubmit={onCreateUser}>
            <h3>Add new user</h3>
            <div className="user-create-grid">
              <label className="form-field">
                <span>Full name</span>
                <input value={newUser.fullName} onChange={e=>setNewUser({...newUser,fullName:e.target.value})}
                  placeholder="e.g. WaterMark Team Member" maxLength={100} required />
              </label>
              <label className="form-field">
                <span>Login username</span>
                <input value={newUser.username} onChange={e=>setNewUser({...newUser,username:e.target.value})}
                  placeholder="e.g. user1" minLength={3} maxLength={40} pattern="[A-Za-z][A-Za-z0-9._-]*" required autoComplete="off" />
              </label>
              <label className="form-field">
                <span>Role</span>
                <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
                  <option value="Staff">Normal user (Staff)</option>
                  {isSuperAdmin && <option value="Admin">Administrator</option>}
                </select>
              </label>
              <label className="form-field user-create-full">
                <span>Temporary password (at least 12 characters)</span>
                <input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}
                  minLength={12} maxLength={72} placeholder="Create a unique temporary password" autoComplete="new-password" required />
              </label>
            </div>
            <button className="primary-button" type="submit"><Icon name="users" size={17} /> Add user</button>
          </form>

          <h3 className="user-list-heading">Existing accounts</h3>
          <div className="user-management-list">
            {users.map(user => (
              <article className="user-management-row" key={user.id}>
                <div className="user-account-details">
                  <strong>{user.displayName} {user.id===currentUserId ? "(you)" : ""}</strong>
                  <span>{user.role === "superadmin" ? "Super Administrator" : user.role === "admin" ? "Administrator" : "Normal user"}{user.email ? ` · ${user.email}` : ""}</span>
                  <span>Username: {user.username || "Not set"}</span>
                </div>
                <div className="user-account-controls">
                  {(isSuperAdmin || user.role === "user" || user.id === currentUserId) && (
                  <div className="user-inline-row">
                    <label className="form-field">
                      <span>Set or change login username</span>
                      <input value={usernameEdits[user.id] ?? ""}
                        onChange={e=>setUsernameEdits({...usernameEdits,[user.id]:e.target.value})}
                        placeholder={user.username || "e.g. admin"}
                        pattern="[A-Za-z][A-Za-z0-9._-]*" minLength={3} maxLength={40} />
                    </label>
                    <button type="button" className="secondary-button" onClick={()=>onSaveUsername(user.id)}>
                      Save username
                    </button>
                  </div>
                  )}
                  {(user.id === currentUserId || user.role === "user" || (isSuperAdmin && user.role === "admin")) && (
                    <div className="user-inline-row">
                      <label className="form-field">
                        <span>{user.id===currentUserId ? "Your new password" : "Reset password"}</span>
                        <input type="password" value={resetPasswords[user.id] ?? ""}
                          onChange={e=>setResetPasswords({...resetPasswords,[user.id]:e.target.value})}
                          placeholder="At least 12 characters" minLength={12} autoComplete="new-password" />
                      </label>
                      {user.id===currentUserId && (
                        <label className="form-field">
                          <span>Your current password</span>
                          <input type="password" value={resetCurrentPasswords[user.id] ?? ""}
                            onChange={e=>setResetCurrentPasswords({...resetCurrentPasswords,[user.id]:e.target.value})}
                            placeholder="Confirm current password" autoComplete="current-password" />
                        </label>
                      )}
                      <button type="button" className="primary-button" onClick={()=>onResetPassword(user.id)}>
                        <Icon name="key" size={17} /> {user.id===currentUserId ? "Change my password" : "Reset password"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
