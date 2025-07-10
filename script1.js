// script1.js
const API_BASE = 'https://patrinahhotelmgtsys.onrender.com';
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + btoa('admin:123')
};

// Navigation
const navLinks = document.querySelectorAll('[data-target]');
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
    document.getElementById(link.dataset.target).classList.remove('hidden');
  });
});

// Utility Functions
const openModal = id => document.getElementById(id).classList.remove('hidden');
const closeModal = id => document.getElementById(id).classList.add('hidden');
const formatUGX = n => `UGX ${Number(n).toLocaleString()}`;

// Load Inventory
async function loadInventory() {
  try {
    const res = await fetch(`${API_BASE}/inventory`, { headers });
    const inventory = await res.json();
    const tbody = document.getElementById('inventory-table-body-bar');
    tbody.innerHTML = '';
    inventory.forEach(item => {
      const total = item.opening + item.purchases;
      const closing = total - item.sales - item.spoilage;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border px-2 py-1">${item.item}</td>
        <td class="border px-2 py-1">${item.opening}</td>
        <td class="border px-2 py-1">${item.purchases}</td>
        <td class="border px-2 py-1">${total}</td>
        <td class="border px-2 py-1">${item.sales}</td>
        <td class="border px-2 py-1">${item.spoilage}</td>
        <td class="border px-2 py-1">${closing}</td>
        <td class="border px-2 py-1">
          <button onclick="editInventory('${item._id}')" class="text-blue-600">Edit</button>
          <button onclick="deleteInventory('${item._id}')" class="text-red-600 ml-2">Delete</button>
        </td>`;
      tbody.appendChild(tr);

      if (closing < 10) {
        document.getElementById('low-stock-message').textContent = `${item.item} stock is low (${closing})!`;
        document.getElementById('low-stock-notification').classList.remove('hidden');
        setTimeout(() => document.getElementById('low-stock-notification').classList.add('hidden'), 4000);
      }
    });
  } catch (err) {
    console.error('Inventory Error:', err);
  }
}

// Load Sales
async function loadSales(date = '') {
  try {
    const url = date ? `${API_BASE}/sales?date=${date}` : `${API_BASE}/sales`;
    const res = await fetch(url, { headers });
    const sales = await res.json();
    const tbody = document.getElementById('sales-table-body-bar');
    tbody.innerHTML = '';
    sales.forEach(sale => {
      const sumBP = sale.bp * sale.number;
      const sumSP = sale.sp * sale.number;
      const profit = sumSP - sumBP;
      const percent = ((profit / sumBP) * 100).toFixed(2);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border px-2 py-1">${sale.item}</td>
        <td class="border px-2 py-1">${sale.number}</td>
        <td class="border px-2 py-1">${sale.bp}</td>
        <td class="border px-2 py-1">${sale.sp}</td>
        <td class="border px-2 py-1">${sumBP}</td>
        <td class="border px-2 py-1">${sumSP}</td>
        <td class="border px-2 py-1">${profit}</td>
        <td class="border px-2 py-1">${percent}%</td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Sales Error:', err);
  }
}

// Load Expenses
async function loadExpenses(date = '') {
  try {
    const url = date ? `${API_BASE}/expenses?date=${date}` : `${API_BASE}/expenses`;
    const res = await fetch(url, { headers });
    const expenses = await res.json();
    const tbody = document.getElementById('expenses-table-body-bar');
    tbody.innerHTML = '';
    expenses.forEach(exp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border px-2 py-1">${exp.description}</td>
        <td class="border px-2 py-1">${exp.amount}</td>
        <td class="border px-2 py-1">${new Date(exp.date).toLocaleDateString()}</td>
        <td class="border px-2 py-1">${exp.receiptId}</td>
        <td class="border px-2 py-1">${exp.source}</td>
        <td class="border px-2 py-1">${exp.responsible}</td>
        <td class="border px-2 py-1">
          <button onclick="deleteExpense('${exp._id}')" class="text-red-600">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Expenses Error:', err);
  }
}

// Summary
async function updateBarSummary() {
  try {
    const [expRes, saleRes] = await Promise.all([
      fetch(`${API_BASE}/expenses`, { headers }),
      fetch(`${API_BASE}/sales`, { headers })
    ]);
    const expenses = await expRes.json();
    const sales = await saleRes.json();
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = sales.reduce((sum, s) => sum + (s.sp * s.number), 0);
    document.getElementById('bar-total-sales').innerText = formatUGX(totalSales);
    document.getElementById('bar-total-expenses').innerText = formatUGX(totalExp);
    document.getElementById('bar-balance').innerText = formatUGX(totalSales - totalExp);
  } catch (err) {
    console.error('Summary Error:', err);
  }
}

// Add Inventory
const invForm = document.getElementById('inventory-form');
invForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    item: invForm.inv-item.value.trim(),
    opening: +invForm["inv-open"].value,
    purchases: +invForm["inv-purchase"].value,
    sales: +invForm["inv-sales"].value,
    spoilage: +invForm["inv-spoilage"].value,
  };
  try {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (res.ok) {
      alert('Inventory Added');
      closeModal('inventory-modal');
      loadInventory();
    }
  } catch (err) {
    console.error('Add Inventory Error:', err);
  }
  invForm.reset();
});

// Add Expense
const expForm = document.getElementById('expense-form');
expForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    description: expForm["exp-desc"].value.trim(),
    amount: +expForm["exp-amt"].value,
    receiptId: expForm["exp-receipt"].value.trim(),
    source: expForm["exp-source"].value.trim(),
    responsible: expForm["exp-person"].value.trim(),
  };
  try {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (res.ok) {
      alert('Expense Added');
      closeModal('expense-modal');
      loadExpenses();
      updateBarSummary();
    }
  } catch (err) {
    console.error('Add Expense Error:', err);
  }
  expForm.reset();
});

// Add Sale
const saleForm = document.getElementById('sale-form');
saleForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    item: saleForm["sale-item"].value.trim(),
    number: +saleForm["sale-number"].value,
    bp: +saleForm["sale-bp"].value,
    sp: +saleForm["sale-sp"].value,
  };
  try {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (res.ok) {
      alert('Sale Added');
      closeModal('sale-modal');
      loadSales();
      updateBarSummary();
    }
  } catch (err) {
    console.error('Add Sale Error:', err);
  }
  saleForm.reset();
});

// Delete Expense
async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  try {
    await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE', headers });
    loadExpenses();
    updateBarSummary();
  } catch (err) {
    console.error('Delete Expense Error:', err);
  }
}
window.deleteExpense = deleteExpense;

// Delete Inventory
async function deleteInventory(id) {
  if (!confirm('Delete this inventory item?')) return;
  try {
    await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE', headers });
    loadInventory();
  } catch (err) {
    console.error('Delete Inventory Error:', err);
  }
}
window.deleteInventory = deleteInventory;

// Load everything on start
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-target="bar"]').click();
  loadSales();
  loadExpenses();
  loadInventory();
  updateBarSummary();
});
