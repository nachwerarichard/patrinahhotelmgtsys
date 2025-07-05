// script4.js

document.addEventListener('DOMContentLoaded', () => {
  const sections = ['bar', 'restaurant', 'accommodation', 'gardens', 'conference'];

  const formatUGX = (amount) => `UGX ${amount.toLocaleString()}`;

  // Simulated Data (replace with backend or storage logic if needed)
  const data = {
    bar: { sales: [], expenses: [] },
    restaurant: { sales: [], expenses: [] },
    accommodation: { sales: [], expenses: [] },
    gardens: { sales: [], expenses: [] },
    conference: { sales: [], expenses: [] },
  };

  // Navigation Logic
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
      const target = link.dataset.target;
      document.getElementById(target).classList.remove('hidden');
      document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active-link'));
      link.classList.add('active-link');
    });
  });

  // Add Sale Button Listeners
  sections.forEach(section => {
    const btn = document.getElementById(`add-sale-btn-${section}`);
    if (btn) {
      btn.addEventListener('click', () => {
        openSaleModal(section);
      });
    }
  });

  // Open Sale Modal
  const openSaleModal = (section) => {
    const modal = document.getElementById('sales-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.dataset.section = section;
    }
  };

  // Close Sale Modal
  const cancelSaleBtn = document.getElementById('cancel-sale-btn');
  if (cancelSaleBtn) {
    cancelSaleBtn.addEventListener('click', () => {
      document.getElementById('sales-modal').classList.add('hidden');
      document.getElementById('sale-form').reset();
    });
  }

  // Sale Form Submission
  const saleForm = document.getElementById('sale-form');
  if (saleForm) {
    saleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const section = document.getElementById('sales-modal').dataset.section;
      const item = document.getElementById('sale-item').value;
      const number = parseInt(document.getElementById('sale-number').value);
      const bp = parseInt(document.getElementById('sale-buying-price').value);
      const sp = parseInt(document.getElementById('sale-selling-price').value);

      const sumBP = bp * number;
      const sumSP = sp * number;
      const profit = sumSP - sumBP;
      const percentProfit = bp > 0 ? ((profit / sumBP) * 100).toFixed(1) : '0';

      const row = document.createElement('tr');
      row.setAttribute('data-sumsp', sumSP);
      row.innerHTML = `
        <td class="py-2 px-4">${item}</td>
        <td class="py-2 px-4">${number}</td>
        <td class="py-2 px-4">${bp}</td>
        <td class="py-2 px-4">${sp}</td>
        <td class="py-2 px-4">${sumBP}</td>
        <td class="py-2 px-4">${sumSP}</td>
        <td class="py-2 px-4">${profit}</td>
        <td class="py-2 px-4">${percentProfit}%</td>
      `;
      document.getElementById(`sales-table-body-${section}`).appendChild(row);
      document.getElementById('sales-modal').classList.add('hidden');
      e.target.reset();
      updateSummary(section);
    });
  }

  // Add Expense Button Listeners
  sections.forEach(section => {
    const btn = document.getElementById(`add-expense-btn-${section}`);
    if (btn) {
      btn.addEventListener('click', () => {
        openExpenseModal(section);
      });
    }
  });

  const openExpenseModal = (section) => {
    const modal = document.getElementById('expense-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.getElementById('expense-source').value = section;
    }
  };

  const cancelExpenseBtn = document.getElementById('cancel-expense-btn');
  if (cancelExpenseBtn) {
    cancelExpenseBtn.addEventListener('click', () => {
      document.getElementById('expense-modal').classList.add('hidden');
      document.getElementById('expense-form').reset();
    });
  }

  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const source = document.getElementById('expense-source').value;
      const description = document.getElementById('expense-description').value;
      const amount = parseInt(document.getElementById('expense-amount').value);

      const row = document.createElement('tr');
      row.setAttribute('data-source', source);
      row.setAttribute('data-amount', amount);
      row.innerHTML = `
        <td class="py-2 px-4">${description}</td>
        <td class="py-2 px-4">${amount}</td>
        <td class="py-2 px-4">-</td>
        <td class="py-2 px-4">-</td>
        <td class="py-2 px-4">${source}</td>
        <td class="py-2 px-4">-</td>
        <td class="py-2 px-4">-</td>
      `;
      document.getElementById(`expenses-table-body-${source}`).appendChild(row);
      document.getElementById('expense-modal').classList.add('hidden');
      e.target.reset();
      updateSummary(source);
    });
  }

  const updateSummary = (section) => {
    let totalSales = 0;
    let totalExpenses = 0;

    document.querySelectorAll(`#sales-table-body-${section} tr`).forEach(row => {
      totalSales += parseInt(row.getAttribute('data-sumsp') || 0);
    });

    document.querySelectorAll(`#expenses-table-body-${section} tr`).forEach(row => {
      const source = row.getAttribute('data-source');
      if (source === section) {
        totalExpenses += parseInt(row.getAttribute('data-amount') || 0);
      }
    });

    const balance = totalSales - totalExpenses;
    document.getElementById(`${section}-total-sales`).textContent = formatUGX(totalSales);
    document.getElementById(`${section}-total-expenses`).textContent = formatUGX(totalExpenses);
    document.getElementById(`${section}-balance`).textContent = formatUGX(balance);

    updateDashboardPerformance();
  };

  const updateDashboardPerformance = () => {
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

    sections.forEach(section => {
      const balance = sectionBalances[section];
      const percentage = totalBalance > 0 ? ((balance / totalBalance) * 100).toFixed(1) : 0;
      const elem = document.getElementById(`dashboard-${section}-performance`);
      if (elem) {
        elem.textContent = `${section.charAt(0).toUpperCase() + section.slice(1)}: ${percentage}%`;
      }
    });

    const balanceElem = document.getElementById('dashboard-total-balance');
    if (balanceElem) balanceElem.textContent = formatUGX(totalBalance);
  };
});
