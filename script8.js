// script4.js

function formatUGX(num) {
  return `UGX ${Number(num).toLocaleString()}`;
}

const departments = ['bar', 'restaurant'];
const dataStore = {
  bar: { sales: 0, expenses: 0, profit: 0 },
  restaurant: { sales: 0, expenses: 0, profit: 0 },
};

function updateDashboard() {
  const totalSales = departments.reduce((sum, d) => sum + dataStore[d].sales, 0);
  const totalExpenses = departments.reduce((sum, d) => sum + dataStore[d].expenses, 0);
  const totalProfit = departments.reduce((sum, d) => sum + dataStore[d].profit, 0);

  document.getElementById('dashboard-total-balance').textContent = formatUGX(totalProfit);

  departments.forEach((dep) => {
    const share = totalExpenses ? ((dataStore[dep].expenses / totalExpenses) * 100).toFixed(1) : 0;
    document.getElementById(`dashboard-${dep}-performance`).textContent = `${dep.charAt(0).toUpperCase() + dep.slice(1)}: ${share}% expenses`;
  });
}

function addSale(department, number, bp, sp) {
  const sumBP = number * bp;
  const sumSP = number * sp;
  const profit = sumSP - sumBP;

  dataStore[department].sales += sumSP;
  dataStore[department].profit += profit;

  updateCards(department);
  updateDashboard();
}

function addExpense(department, amount) {
  dataStore[department].expenses += amount;
  dataStore[department].profit -= amount;

  updateCards(department);
  updateDashboard();
}

function updateCards(department) {
  document.getElementById(`${department}-total-sales`).textContent = formatUGX(dataStore[department].sales);
  document.getElementById(`${department}-total-expenses`).textContent = formatUGX(dataStore[department].expenses);
  document.getElementById(`${department}-balance`).textContent = formatUGX(dataStore[department].profit);
}

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

function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden', 'invisible');
  document.getElementById(modalId).classList.add('flex');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  document.getElementById(modalId).classList.remove('flex');
}

// Attach open modal buttons
['bar', 'restaurant'].forEach(dep => {
  document.getElementById(`add-item-btn-${dep}`).addEventListener('click', () => showModal('item-modal'));
  document.getElementById(`add-expense-btn-${dep}`).addEventListener('click', () => showModal('expense-modal'));
  document.getElementById(`add-sale-btn-${dep}`).addEventListener('click', () => showModal('sales-modal'));
});

// Close modals
['cancel-item-btn', 'cancel-expense-btn', 'cancel-sale-btn'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    if (id.includes('item')) hideModal('item-modal');
    if (id.includes('expense')) hideModal('expense-modal');
    if (id.includes('sale')) hideModal('sales-modal');
  });
});

// Handle sale form submission
const saleForm = document.getElementById('sale-form');
saleForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const item = document.getElementById('sale-item').value;
  const number = parseInt(document.getElementById('sale-number').value);
  const bp = parseInt(document.getElementById('sale-buying-price').value);
  const sp = parseInt(document.getElementById('sale-selling-price').value);
  const responsible = document.getElementById('sale-responsible').value;

  const activeTab = document.querySelector('.page-content:not(.hidden)').id;
  if (departments.includes(activeTab)) addSale(activeTab, number, bp, sp);

  hideModal('sales-modal');
  saleForm.reset();
});

// Handle expense form submission
const expenseForm = document.getElementById('expense-form');
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseInt(document.getElementById('expense-amount').value);
  const department = document.getElementById('expense-source').value;

  if (departments.includes(department)) addExpense(department, amount);

  hideModal('expense-modal');
  expenseForm.reset();
});

updateDashboard();

  // Navigation click handler for inventory dropdown items
  document.querySelectorAll('[data-target]').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('data-target');

      // Hide all sections
      document.querySelectorAll('.page-content').forEach(section => {
        section.classList.add('hidden');
      });

      // Show the selected section
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.remove('hidden');
      }
    });
  });
</script>


  function toggleSubInventory() {
    const submenu = document.getElementById("sub-inventory-links");
    const icon = document.getElementById("inventory-toggle-icon");
    submenu.classList.toggle("hidden");
    icon.classList.toggle("fa-chevron-down");
    icon.classList.toggle("fa-chevron-up");
  }
    
