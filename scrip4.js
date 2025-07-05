// script2.js

// Utility Functions
function UGX(amount) {
  return `UGX ${parseInt(amount).toLocaleString()}`;
}

function showPage(targetId) {
  document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(targetId).classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('bg-gray-700'));
  document.querySelector(`[data-target="${targetId}"]`).classList.add('bg-gray-700');
}

// Sidebar navigation
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.getAttribute('data-target');
    showPage(target);
  });
});

// Modal handling
const itemModal = document.getElementById('item-modal');
const expenseModal = document.getElementById('expense-modal');
const salesModal = document.getElementById('sales-modal');

function showModal(modal) {
  modal.classList.remove('hidden', 'invisible');
  modal.classList.add('flex');
}
function hideModal(modal) {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Sample dynamic data storage
const data = {
  bar: {
    inventory: [],
    expenses: [],
    sales: [],
  },
  restaurant: {
    inventory: [],
    expenses: [],
    sales: [],
  }
};

function updateSummary(section) {
  const totalSales = data[section].sales.reduce((sum, s) => sum + (s.sellingPrice * s.number), 0);
  const totalExpenses = data[section].expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalSales - totalExpenses;

  document.getElementById(`${section}-total-sales`).textContent = UGX(totalSales);
  document.getElementById(`${section}-total-expenses`).textContent = UGX(totalExpenses);
  document.getElementById(`${section}-balance`).textContent = UGX(balance);
}

function renderTable(section, type) {
  const tbody = document.getElementById(`${type}-table-body-${section}`);
  tbody.innerHTML = '';

  data[section][type].forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b';

    if (type === 'inventory') {
      tr.innerHTML = `
        <td class="py-2 px-4">${item.name}</td>
        <td class="py-2 px-4">${item.type}</td>
        <td class="py-2 px-4">${item.quantity}</td>
        <td class="py-2 px-4">${UGX(item.price)}</td>
        <td class="py-2 px-4">${item.date}</td>
        <td class="py-2 px-4">-</td>
      `;
    } else if (type === 'expenses') {
      tr.innerHTML = `
        <td class="py-2 px-4">${item.description}</td>
        <td class="py-2 px-4">${UGX(item.amount)}</td>
        <td class="py-2 px-4">${item.date}</td>
        <td class="py-2 px-4">${item.receipt}</td>
        <td class="py-2 px-4">${item.source}</td>
        <td class="py-2 px-4">${item.responsible}</td>
        <td class="py-2 px-4">-</td>
      `;
    } else if (type === 'sales') {
      const sumBP = item.buyingPrice * item.number;
      const sumSP = item.sellingPrice * item.number;
      const profit = sumSP - sumBP;
      const percentProfit = ((profit / sumBP) * 100).toFixed(1);
      tr.innerHTML = `
        <td class="py-2 px-4">${item.item}</td>
        <td class="py-2 px-4">${item.number}</td>
        <td class="py-2 px-4">${UGX(item.buyingPrice)}</td>
        <td class="py-2 px-4">${UGX(item.sellingPrice)}</td>
        <td class="py-2 px-4">${UGX(sumBP)}</td>
        <td class="py-2 px-4">${UGX(sumSP)}</td>
        <td class="py-2 px-4">${UGX(profit)}</td>
        <td class="py-2 px-4">${percentProfit}%</td>
      `;
    }

    tbody.appendChild(tr);
  });
}

// Button bindings
['bar', 'restaurant'].forEach(section => {
  document.getElementById(`add-item-btn-${section}`).addEventListener('click', () => {
    document.getElementById('item-form').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('item-name').value;
      const type = document.getElementById('item-type').value;
      const quantity = parseInt(document.getElementById('item-quantity').value);
      const price = parseInt(document.getElementById('item-price').value);
      const date = new Date().toISOString().split('T')[0];
      data[section].inventory.push({ name, type, quantity, price, date });
      renderTable(section, 'inventory');
      hideModal(itemModal);
    };
    showModal(itemModal);
  });

  document.getElementById(`add-expense-btn-${section}`).addEventListener('click', () => {
    document.getElementById('expense-form').onsubmit = (e) => {
      e.preventDefault();
      const description = document.getElementById('expense-description').value;
      const amount = parseInt(document.getElementById('expense-amount').value);
      const receipt = document.getElementById('expense-receipt').value;
      const source = document.getElementById('expense-source').value;
      const responsible = document.getElementById('expense-responsible').value;
      const date = new Date().toISOString().split('T')[0];
      data[section].expenses.push({ description, amount, receipt, source, responsible, date });
      renderTable(section, 'expenses');
      updateSummary(section);
      hideModal(expenseModal);
    };
    showModal(expenseModal);
  });

  document.getElementById(`add-sale-btn-${section}`).addEventListener('click', () => {
    document.getElementById('sale-form').onsubmit = (e) => {
      e.preventDefault();
      const item = document.getElementById('sale-item').value;
      const number = parseInt(document.getElementById('sale-number').value);
      const buyingPrice = parseInt(document.getElementById('sale-buying-price').value);
      const sellingPrice = parseInt(document.getElementById('sale-selling-price').value);
      const responsible = document.getElementById('sale-responsible').value;
      const receipt = document.getElementById('sale-receipt-id').value;
      const date = new Date().toISOString().split('T')[0];
      data[section].sales.push({ item, number, buyingPrice, sellingPrice, responsible, receipt, date });
      renderTable(section, 'sales');
      updateSummary(section);
      hideModal(salesModal);
    };
    showModal(salesModal);
  });
});

// Cancel buttons
['cancel-item-btn', 'cancel-expense-btn', 'cancel-sale-btn'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    hideModal(document.getElementById(id.replace('cancel-', '').split('-')[0] + '-modal'));
  });
});

// Initialize default visible page
showPage('dashboard');
