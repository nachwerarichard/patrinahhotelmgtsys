// script4.js

// Utility: format number to UGX string
function formatUGX(num) {
  return `UGX ${Number(num).toLocaleString()}`;
}

// Departmental Data
const departments = ['bar', 'restaurant'];
const dataStore = {
  bar: { sales: 0, expenses: 0, profit: 0 },
  restaurant: { sales: 0, expenses: 0, profit: 0 },
};

// Update performance cards
function updateDashboard() {
  const totalSales = departments.reduce((sum, d) => sum + dataStore[d].sales, 0);
  const totalExpenses = departments.reduce((sum, d) => sum + dataStore[d].expenses, 0);
  const totalProfit = departments.reduce((sum, d) => sum + dataStore[d].profit, 0);

  document.getElementById('dashboard-total-balance').textContent = formatUGX(totalProfit);

  // Performance per department (expense-based share)
  departments.forEach((dep) => {
    const share = totalExpenses ? ((dataStore[dep].expenses / totalExpenses) * 100).toFixed(1) : 0;
    document.getElementById(`dashboard-${dep}-performance`).textContent = `${dep.charAt(0).toUpperCase() + dep.slice(1)}: ${share}% expenses`;
  });
}

// Simulated: Save Sale
function addSale(department, number, bp, sp) {
  const sumBP = number * bp;
  const sumSP = number * sp;
  const profit = sumSP - sumBP;

  dataStore[department].sales += sumSP;
  dataStore[department].profit += profit;

  updateCards(department);
  updateDashboard();
}

// Simulated: Save Expense
function addExpense(department, amount) {
  dataStore[department].expenses += amount;
  dataStore[department].profit -= amount;

  updateCards(department);
  updateDashboard();
}

// Update section totals
function updateCards(department) {
  document.getElementById(`${department}-total-sales`).textContent = formatUGX(dataStore[department].sales);
  document.getElementById(`${department}-total-expenses`).textContent = formatUGX(dataStore[department].expenses);
  document.getElementById(`${department}-balance`).textContent = formatUGX(dataStore[department].profit);
}

// Dummy Initializations
addSale('bar', 10, 2000, 3000); // profit = 10 * (3000-2000) = 10,000
addSale('restaurant', 5, 1000, 2000);
addExpense('bar', 5000);
addExpense('restaurant', 3000);

// Navigation toggle
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.forEach(l => l.classList.remove('bg-gray-700'));
    link.classList.add('bg-gray-700');

    const targetId = link.getAttribute('data-target');
    document.querySelectorAll('.page-content').forEach(section => {
      section.classList.add('hidden');
    });
    document.getElementById(targetId).classList.remove('hidden');
  });
});
