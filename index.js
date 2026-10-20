"use strict";

// ============================================
// PERSONAL BUDGET TRACKER
// Built by Riha Begum
// HTML + CSS + Vanilla JavaScript
// ============================================

const $ = (id) => document.getElementById(id);

const elements = {
  form: $("budgetForm"),
  name: $("userName"),
  income: $("income"),
  count: $("numExpenses"),
  expenseSection: $("expenseSection"),
  expenseInputs: $("expenseInputs"),
  calculate: $("calculateBudget"),
  clear: $("clearBudget"),
  message: $("formMessage"),
  saveStatus: $("saveStatus"),
  subtitle: $("summarySubtitle"),

  totalIncome: $("totalIncome"),
  totalExpenses: $("totalExpenses"),
  totalTax: $("totalTax"),
  netIncome: $("netIncome"),
  balance: $("balance"),
  savings: $("savings"),

  statusCard: $("statusCard"),
  statusIcon: $("statusIcon"),
  statusTitle: $("statusTitle"),
  financialStatus: $("financialStatus"),

  breakdown: $("expenseBreakdown"),
};

const STORAGE_KEY = "budgetWiseData";
const TAX_RATE = 0.1;
const SAVINGS_RATE = 0.2;
const MAX_EXPENSES = 20;

const COLORS = [
  "#398df0",
  "#20b486",
  "#ffb547",
  "#f45b91",
  "#a66bf5",
  "#14b8a6",
  "#fb7185",
  "#6366f1",
  "#f97316",
  "#06b6d4",
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function money(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function setMessage(message = "") {
  elements.message.textContent = message;
}

function setSaveStatus(message) {
  elements.saveStatus.textContent = message;
}

function isValidNumber(value) {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// ============================================
// VALIDATION
// ============================================

function validateSetup() {
  const name = elements.name.value.trim();
  const incomeValue = elements.income.value;
  const countValue = elements.count.value;

  if (!name) {
    setMessage("Please enter your name.");
    elements.name.focus();
    return false;
  }

  if (name.length > 60) {
    setMessage("Your name must be 60 characters or fewer.");
    elements.name.focus();
    return false;
  }

  if (!isValidNumber(incomeValue) || Number(incomeValue) <= 0) {
    setMessage("Please enter a valid income greater than zero.");
    elements.income.focus();
    return false;
  }

  if (
    !isValidNumber(countValue) ||
    !Number.isInteger(Number(countValue)) ||
    Number(countValue) < 0 ||
    Number(countValue) > MAX_EXPENSES
  ) {
    setMessage("Enter a whole number of expenses between 0 and 20.");
    elements.count.focus();
    return false;
  }

  setMessage();
  return true;
}

// ============================================
// CREATE EXPENSE INPUTS
// ============================================

function createExpenseFields(savedExpenses = []) {
  const count = Number(elements.count.value);

  elements.expenseInputs.replaceChildren();

  for (let i = 0; i < count; i++) {
    const expense = savedExpenses[i] || {};

    const row = makeElement("div", "expense-row");

    const label = makeElement("label", "", `${i + 1}. Expense ${i + 1}`);

    const nameInput = document.createElement("input");

    nameInput.type = "text";
    nameInput.id = `expenseName${i}`;
    nameInput.className = "expense-name";
    nameInput.maxLength = 60;
    nameInput.placeholder = [
      "Food",
      "Transportation",
      "Bills",
      "Shopping",
      "Entertainment",
    ][i % 5];

    nameInput.value = expense.name || "";
    nameInput.setAttribute("aria-label", `Expense ${i + 1} name`);

    label.htmlFor = nameInput.id;

    const amountInput = document.createElement("input");

    amountInput.type = "number";
    amountInput.id = `expenseAmount${i}`;
    amountInput.className = "expense-amount";
    amountInput.min = "0";
    amountInput.step = "0.01";
    amountInput.placeholder = "Amount ($)";

    amountInput.value =
      expense.amount !== undefined && expense.amount !== ""
        ? String(expense.amount)
        : "";

    amountInput.setAttribute("aria-label", `Expense ${i + 1} amount`);

    const removeButton = makeElement("button", "remove-expense", "×");

    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove expense ${i + 1}`);
    removeButton.title = "Remove expense";

    removeButton.addEventListener("click", () => {
      const remaining = collectExpenseValues();

      remaining.splice(i, 1);

      elements.count.value = remaining.length;

      createExpenseFields(remaining);
      setMessage();
    });

    row.append(label, nameInput, amountInput, removeButton);

    elements.expenseInputs.appendChild(row);
  }

  elements.expenseSection.classList.remove("hidden");
}

function collectExpenseValues() {
  const names = [...elements.expenseInputs.querySelectorAll(".expense-name")];

  const amounts = [
    ...elements.expenseInputs.querySelectorAll(".expense-amount"),
  ];

  return names.map((input, index) => ({
    name: input.value,
    amount: amounts[index].value,
  }));
}

// ============================================
// SET UP BUDGET
// ============================================

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateSetup()) {
    return;
  }

  createExpenseFields();

  setMessage();
  setSaveStatus("● Add expenses");

  elements.expenseSection.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
});

// ============================================
// COLLECT AND VALIDATE EXPENSES
// ============================================

function collectExpenses() {
  const names = [...elements.expenseInputs.querySelectorAll(".expense-name")];

  const amounts = [
    ...elements.expenseInputs.querySelectorAll(".expense-amount"),
  ];

  const expenses = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i].value.trim();
    const rawAmount = amounts[i].value;

    if (!name) {
      setMessage(`Please enter a name for expense ${i + 1}.`);
      names[i].focus();
      return null;
    }

    if (name.length > 60) {
      setMessage("Expense names must be 60 characters or fewer.");
      names[i].focus();
      return null;
    }

    if (!isValidNumber(rawAmount)) {
      setMessage(`Enter an amount for ${name}. Zero is allowed.`);
      amounts[i].focus();
      return null;
    }

    const amount = Number(rawAmount);

    if (amount < 0) {
      setMessage("Expense amounts cannot be negative.");
      amounts[i].focus();
      return null;
    }

    expenses.push({
      name,
      amount,
    });
  }

  return expenses;
}

// ============================================
// BUDGET CALCULATIONS
// ============================================

function calculateTotalExpenses(expenses) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function getFinancialStatus(savings, balance) {
  if (balance < 0) {
    return {
      title: "Overspending Alert",
      message:
        "Your expenses exceed your after-tax income. Review your spending and reduce non-essential costs.",
      icon: "!",
      type: "status-danger",
    };
  }

  if (savings >= 1000) {
    return {
      title: "Excellent Financial Habits",
      message:
        "Excellent! You are building a healthy projected savings habit. Keep going!",
      icon: "✦",
      type: "",
    };
  }

  if (savings >= 500) {
    return {
      title: "Good Progress",
      message:
        "You have a decent projected savings amount. Keep tracking your expenses.",
      icon: "✓",
      type: "",
    };
  }

  if (savings >= 100) {
    return {
      title: "Room to Improve",
      message:
        "Consider reducing unnecessary expenses to improve your potential savings.",
      icon: "↗",
      type: "status-warning",
    };
  }

  return {
    title: "Start Small, Save Smart",
    message:
      "Your projected savings are low. Review your spending and set a realistic goal.",
    icon: "!",
    type: "status-warning",
  };
}

function calculateBudget(income, expenses) {
  const totalExpenses = calculateTotalExpenses(expenses);
  const tax = income * TAX_RATE;
  const netIncome = income - tax;
  const balance = netIncome - totalExpenses;

  // Never display negative savings.
  const savings = Math.max(0, balance) * SAVINGS_RATE;

  return {
    userName: elements.name.value.trim(),
    income,
    expenses,
    numberOfExpenses: expenses.length,
    totalExpenses,
    tax,
    netIncome,
    balance,
    savings,
    finalStatus: getFinancialStatus(savings, balance),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================
// DISPLAY FINANCIAL SUMMARY
// ============================================

function displayResults(data) {
  elements.totalIncome.textContent = money(data.income);
  elements.totalExpenses.textContent = money(data.totalExpenses);
  elements.totalTax.textContent = money(data.tax);
  elements.netIncome.textContent = money(data.netIncome);
  elements.balance.textContent = money(data.balance);
  elements.savings.textContent = money(data.savings);

  elements.balance.style.color = data.balance < 0 ? "#dc2626" : "";

  elements.subtitle.textContent = `Here's the financial summary for ${data.userName}.`;

  elements.statusTitle.textContent = data.finalStatus.title;

  elements.financialStatus.textContent = data.finalStatus.message;

  elements.statusIcon.textContent = data.finalStatus.icon;

  elements.statusCard.className = `status-card ${data.finalStatus.type}`.trim();

  displayBreakdown(data.expenses, data.totalExpenses);
}

// ============================================
// EXPENSE BREAKDOWN WITH PIE CHART
// ============================================

function displayBreakdown(expenses, totalExpenses) {
  elements.breakdown.replaceChildren();

  if (expenses.length === 0) {
    const empty = makeElement(
      "p",
      "empty-state",
      "No expenses added. Your balance is based on income after tax.",
    );

    elements.breakdown.appendChild(empty);
    return;
  }

  const chartLayout = makeElement("div", "chart-layout");

  const chart = makeElement("div", "expense-pie-chart");
  chart.setAttribute("role", "img");
  chart.setAttribute(
    "aria-label",
    "Pie chart showing the distribution of expenses",
  );

  const legend = makeElement("div", "chart-legend");

  let currentAngle = 0;

  const segments = expenses.map((expense, index) => {
    const percentage =
      totalExpenses > 0 ? (expense.amount / totalExpenses) * 100 : 0;

    const startAngle = currentAngle;

    currentAngle += percentage * 3.6;

    return {
      ...expense,
      percentage,
      startAngle,
      endAngle: currentAngle,
      color: COLORS[index % COLORS.length],
    };
  });

  if (totalExpenses > 0) {
    const gradient = segments
      .map(
        (segment) =>
          `${segment.color} ${segment.startAngle}deg ${segment.endAngle}deg`,
      )
      .join(", ");

    chart.style.background = `conic-gradient(${gradient})`;
  } else {
    chart.style.background = "#e5edf7";
  }

  segments.forEach((expense) => {
    const item = makeElement("div", "legend-item");

    const left = makeElement("div", "legend-label");

    const dot = makeElement("span", "legend-dot");

    dot.style.backgroundColor = expense.color;

    const name = makeElement("span", "legend-name", expense.name);

    left.append(dot, name);

    const details = makeElement("div", "legend-details");

    const amount = makeElement(
      "strong",
      "legend-amount",
      money(expense.amount),
    );

    const percent = makeElement(
      "span",
      "legend-percent",
      `${expense.percentage.toFixed(0)}%`,
    );

    details.append(amount, percent);
    item.append(left, details);
    legend.appendChild(item);
  });

  chartLayout.append(chart, legend);
  elements.breakdown.appendChild(chartLayout);
}

// ============================================
// SAVE DATA TO LOCAL STORAGE
// ============================================

function saveBudget(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    setSaveStatus("● Saved to Local Storage");
    return true;
  } catch (error) {
    console.error("Unable to save budget:", error);

    setSaveStatus("● Save unavailable");

    setMessage(
      "Results are displayed, but your budget could not be saved in this browser.",
    );

    return false;
  }
}

// ============================================
// CALCULATE BUTTON
// ============================================

elements.calculate.addEventListener("click", () => {
  if (!validateSetup()) {
    return;
  }

  const expenses = collectExpenses();

  if (expenses === null) {
    return;
  }

  const income = Number(elements.income.value);
  const budget = calculateBudget(income, expenses);

  displayResults(budget);
  saveBudget(budget);

  setMessage();
});

// ============================================
// RESTORE SAVED BUDGET
// ============================================

function restoreBudget() {
  let saved;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Unable to access Local Storage:", error);
    setSaveStatus("● Storage unavailable");
    return;
  }

  if (!saved) {
    return;
  }

  try {
    const data = JSON.parse(saved);

    const validData =
      data &&
      typeof data.userName === "string" &&
      data.userName.trim().length > 0 &&
      Number.isFinite(data.income) &&
      data.income > 0 &&
      Array.isArray(data.expenses) &&
      data.expenses.length <= MAX_EXPENSES &&
      data.expenses.every(
        (expense) =>
          expense &&
          typeof expense.name === "string" &&
          expense.name.trim().length > 0 &&
          expense.name.length <= 60 &&
          Number.isFinite(expense.amount) &&
          expense.amount >= 0,
      );

    if (!validData) {
      throw new Error("Saved budget has an invalid structure.");
    }

    elements.name.value = data.userName;
    elements.income.value = String(data.income);
    elements.count.value = String(data.expenses.length);

    createExpenseFields(data.expenses);

    // Recalculate values instead of trusting stored totals.
    const budget = calculateBudget(data.income, data.expenses);

    displayResults(budget);

    setSaveStatus("● Budget restored");
  } catch (error) {
    console.error("Unable to restore budget:", error);

    setSaveStatus("● Unable to restore");

    setMessage(
      "Saved data could not be restored. You can create a new budget.",
    );
  }
}

// ============================================
// CLEAR BUDGET
// ============================================

elements.clear.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Are you sure you want to clear your budget and saved data?",
  );

  if (!confirmed) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Unable to clear saved data:", error);
  }

  elements.form.reset();
  elements.count.value = "3";

  elements.expenseInputs.replaceChildren();
  elements.expenseSection.classList.add("hidden");

  elements.totalIncome.textContent = money(0);
  elements.totalExpenses.textContent = money(0);
  elements.totalTax.textContent = money(0);
  elements.netIncome.textContent = money(0);
  elements.balance.textContent = money(0);
  elements.savings.textContent = money(0);

  elements.balance.style.color = "";

  elements.subtitle.textContent = "Your financial story starts here.";

  elements.statusTitle.textContent = "Ready to plan?";
  elements.statusIcon.textContent = "✦";

  elements.financialStatus.textContent =
    "Complete your budget to see your financial health.";

  elements.statusCard.className = "status-card";

  elements.breakdown.replaceChildren();

  elements.breakdown.appendChild(
    makeElement(
      "p",
      "empty-state",
      "Your expense breakdown will appear here after calculation.",
    ),
  );

  setMessage();
  setSaveStatus("● Ready");
});

// ============================================
// INITIALIZE APPLICATION
// ============================================

function initializeBudgetTracker() {
  // Set initial summary values.
  [
    elements.totalIncome,
    elements.totalExpenses,
    elements.totalTax,
    elements.netIncome,
    elements.balance,
    elements.savings,
  ].forEach((element) => {
    element.textContent = money(0);
  });

  restoreBudget();
}

initializeBudgetTracker();
