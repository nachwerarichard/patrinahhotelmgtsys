// script4.js

document.addEventListener('DOMContentLoaded', () => {
  const pages = document.querySelectorAll('.page-content');
  const navLinks = document.querySelectorAll('.nav-link');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  // Navigation toggle
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-target');

      pages.forEach(page => {
        page.classList.add('hidden');
      });
      document.getElementById(target).classList.remove('hidden');

      navLinks.forEach(l => l.classList.remove('bg-gray-700'));
      link.classList.add('bg-gray-700');
    });
  });

  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
  });

  // Reusable Utility Functions
  const formatUGX = num => `UGX ${num.toLocaleString()}`;

  const updateSummary = (section) => {
    const salesRows = document.querySelectorAll(`#sales-table-body-${section} tr`);
    const expensesRows = document.querySelectorAll(`#expenses-table-body-${section} tr`);

    let totalSales = 0, totalExpenses = 0;

    salesRows.forEach(row => {
      totalSales += parseInt(row.getAttribute('data-sumsp') || 0);
    });

    expensesRows.forEach(row => {
      totalExpenses += parseInt(row.getAttribute('data-amount') || 0);
    });

    const balance = totalSales - totalExpenses;

    const salesEl = document.getElementById(`${section}-total-sales`);
    const expensesEl = document.getElementById(`${section}-total-expenses`);
    const balanceEl = document.getElementById(`${section}-balance`);

    if (salesEl) salesEl.textContent = formatUGX(totalSales);
    if (expensesEl) expensesEl.textContent = formatUGX(totalExpenses);
    if (balanceEl) balanceEl.textContent = formatUGX(balance);
  };

  // Modal Control
  const modals = {
    item: document.getElementById('item-modal'),
    expense: document.getElementById('expense-modal'),
    sale: document.getElementById('sales-modal')
  };

  const openModal = (modal) => modal.classList.add('flex');
  const closeModal = (modal) => modal.classList.remove('flex');

  const sections = ['bar', 'restaurant', 'accommodation', 'conference', 'gardens'];

  // Show Modal Handlers for sections
  sections.forEach(section => {
    const itemBtn = document.getElementById(`add-item-btn-${section}`);
    const expenseBtn = document.getElementById(`add-expense-btn-${section}`);
    const saleBtn = document.getElementById(`add-sale-btn-${section}`);

    if (itemBtn) itemBtn.addEventListener('click', () => openModal(modals.item));
    if (expenseBtn) expenseBtn.addEventListener('click', () => openModal(modals.expense));
    if (saleBtn) saleBtn.addEventListener('click', () => openModal(modals.sale));
  });

  // Cancel Modal Buttons
  document.getElementById('cancel-item-btn').addEventListener('click', () => closeModal(modals.item));
  document.getElementById('cancel-expense-btn').addEventListener('click', () => closeModal(modals.expense));
  document.getElementById('cancel-sale-btn').addEventListener('click', () => closeModal(modals.sale));

  // Add Inventory Item
  document.getElementById('item-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('item-name').value;
    const type = document.getElementById('item-type').value;
    const qty = document.getElementById('item-quantity').value;
    const price = document.getElementById('item-price').value;
    const date = new Date().toISOString().split('T')[0];

    sections.forEach(section => {
      const tbody = document.getElementById(`inventory-table-body-${section}`);
      if (tbody) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="py-2 px-4">${name}</td>
          <td class="py-2 px-4">${type}</td>
          <td class="py-2 px-4">${qty}</td>
          <td class="py-2 px-4">${formatUGX(parseInt(price))}</td>
          <td class="py-2 px-4">${date}</td>
          <td class="py-2 px-4"><button class="text-red-500 delete-btn">Delete</button></td>
        `;
        tbody.appendChild(row);
      }
    });
    closeModal(modals.item);
    e.target.reset();
  });

  // Add Expense
  document.getElementById('expense-form').addEventListener('submit', e => {
    e.preventDefault();
    const desc = document.getElementById('expense-description').value;
    const amount = parseInt(document.getElementById('expense-amount').value);
    const date = new Date().toISOString().split('T')[0];
    const receipt = document.getElementById('expense-receipt').value;
    const source = document.getElementById('expense-source').value;
    const responsible = document.getElementById('expense-responsible').value;

    const tbody = document.getElementById(`expenses-table-body-${source}`);
    if (tbody) {
      const row = document.createElement('tr');
      row.setAttribute('data-amount', amount);
      row.innerHTML = `
        <td class="py-2 px-4">${desc}</td>
        <td class="py-2 px-4">${formatUGX(amount)}</td>
        <td class="py-2 px-4">${date}</td>
        <td class="py-2 px-4">${receipt}</td>
        <td class="py-2 px-4">${source}</td>
        <td class="py-2 px-4">${responsible}</td>
        <td class="py-2 px-4"><button class="text-red-500 delete-btn">Delete</button></td>
      `;
      tbody.appendChild(row);
      updateSummary(source);
    }
    closeModal(modals.expense);
    e.target.reset();
  });

  // Add Sale
  document.getElementById('sale-form').addEventListener('submit', e => {
    e.preventDefault();
    const item = document.getElementById('sale-item').value;
    const number = parseInt(document.getElementById('sale-number').value);
    const bp = parseInt(document.getElementById('sale-buying-price').value);
    const sp = parseInt(document.getElementById('sale-selling-price').value);
    const sumBP = number * bp;
    const sumSP = number * sp;
    const profit = sumSP - sumBP;
    const profitPercent = ((profit / sumBP) * 100).toFixed(2);
    const receipt = document.getElementById('sale-receipt-id').value;
    const responsible = document.getElementById('sale-responsible').value;

    sections.forEach(section => {
      const tbody = document.getElementById(`sales-table-body-${section}`);
      if (tbody) {
        const row = document.createElement('tr');
        row.setAttribute('data-sumsp', sumSP);
        row.innerHTML = `
          <td class="py-2 px-4">${item}</td>
          <td class="py-2 px-4">${number}</td>
          <td class="py-2 px-4">${formatUGX(bp)}</td>
          <td class="py-2 px-4">${formatUGX(sp)}</td>
          <td class="py-2 px-4">${formatUGX(sumBP)}</td>
          <td class="py-2 px-4">${formatUGX(sumSP)}</td>
          <td class="py-2 px-4">${formatUGX(profit)}</td>
          <td class="py-2 px-4">${profitPercent}%</td>
        `;
        tbody.appendChild(row);
        updateSummary(section);
      }
    });
    closeModal(modals.sale);
    e.target.reset();
  });

  // Dynamic delete button handler
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const row = e.target.closest('tr');
      const tableId = row.closest('tbody').id;
      const section = tableId.split('-').slice(-1)[0];
      row.remove();
      updateSummary(section);
    }
  });
});


// script4.js

// ... existing code (DOM loaded listener, modal handling, forms, etc.)

// Add this to the end of the DOMContentLoaded block

const updateDashboardPerformance = () => {
  const sections = ['bar', 'restaurant', 'accommodation', 'gardens', 'conference'];
  let totalBalance = 0;
  const sectionBalances = {};

  sections.forEach(section => {
    const salesRows = document.querySelectorAll(`#sales-table-body-${section} tr`);
    const expensesRows = document.querySelectorAll(`#expenses-table-body-${section} tr`);

    let totalSales = 0;
    salesRows.forEach(row => {
      totalSales += parseInt(row.getAttribute('data-sumsp') || 0);
    });

    let totalExpenses = 0;
    expensesRows.forEach(row => {
      const source = row.getAttribute('data-source');
      if (source === section) {
        totalExpenses += parseInt(row.getAttribute('data-amount') || 0);
      }
    });

    const balance = totalSales - totalExpenses;
    sectionBalances[section] = balance;
    totalBalance += balance;
  });

  // Now update each section's percentage of total performance
  sections.forEach(section => {
    const balance = sectionBalances[section];
    const percentage = totalBalance > 0 ? ((balance / totalBalance) * 100).toFixed(1) : 0;
    const elem = document.getElementById(`dashboard-${section}-performance`);
    if (elem) {
      elem.textContent = `${section.charAt(0).toUpperCase() + section.slice(1)}: ${percentage}%`;
    }
  });

  // Update total balance
  const balanceElem = document.getElementById('dashboard-total-balance');
  if (balanceElem) balanceElem.textContent = formatUGX(totalBalance);
};

// Ensure the performance is updated after summary changes
const originalUpdateSummary = updateSummary;
updateSummary = (section) => {
  originalUpdateSummary(section);
  updateDashboardPerformance();
};
