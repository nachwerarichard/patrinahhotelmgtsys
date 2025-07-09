const API_BASE = 'https://patrinahhotelmgtsys.onrender.com';
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + btoa('admin:123') // Change credentials as needed
};

// Sidebar navigation
document.querySelectorAll('[data-target]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const targetId = link.dataset.target;
    document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
    const targetPage = document.getElementById(targetId);
    if(targetPage) targetPage.classList.remove('hidden');
  });
});

// Modal helpers
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Load Inventory
async function loadInventory() {
  try {
    const res = await fetch(`${API_BASE}/inventory`, { headers });
    const inventory = await res.json();
    const tbody = document.getElementById('inventory-table-body-bar');
    tbody.innerHTML = '';
    let lowStockItem = null;

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
      `;
      tbody.appendChild(tr);

      // Check for low stock
      if (closing < 10 && !lowStockItem) {
        lowStockItem = { name: item.item, qty: closing };
      }
    });

    if(lowStockItem){
      const notif = document.getElementById('low-stock-notification');
      document.getElementById('low-stock-message').textContent = `${lowStockItem.name} stock is low (${lowStockItem.qty})!`;
      notif.classList.remove('hidden');
      setTimeout(() => notif.classList.add('hidden'), 4000);
    }
  } catch (err) {
    console.error('Error loading inventory:', err);
  }
}

// Load Expenses
async function loadExpenses() {
  try {
    const res = await fetch(`${API_BASE}/expenses`, { headers });
    const expenses = await res.json();
    const tbody = document.getElementById('expenses-table-body-bar');
    tbody.innerHTML = '';
    expenses.forEach(exp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border px-2 py-1">${exp.description}</td>
        <td class="border px-2 py-1">${exp.amount}</td>
        <td class="border px-2 py-1">${new Date(exp.date).toLocaleDateString()}</td>
        <td class="border px-2 py-1">${exp.receiptId || ''}</td>
        <td class="border px-2 py-1">${exp.source || ''}</td>
        <td class="border px-2 py-1">${exp.responsible || ''}</td>
        <td class="border px-2 py-1">
          <button class="text-red-600 hover:underline" onclick="deleteExpense('${exp._id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading expenses:', err);
  }
}

// Delete Expense
async function deleteExpense(id) {
  if(!confirm('Are you sure you want to delete this expense?')) return;
  try {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers
    });
    if(res.ok) {
      alert('Expense deleted');
      await loadExpenses();
      await updateBarSummary();
    } else {
      alert('Failed to delete expense');
    }
  } catch (err) {
    console.error('Delete expense error:', err);
  }
}
window.deleteExpense = deleteExpense; // expose for onclick

// Load Sales
async function loadSales() {
  try {
    const res = await fetch(`${API_BASE}/sales`, { headers });
    const sales = await res.json();
    const tbody = document.getElementById('sales-table-body-bar');
    tbody.innerHTML = '';
    sales.forEach(sale => {
      const sumBP = sale.bp * sale.number;
      const sumSP = sale.sp * sale.number;
      const profit = sumSP - sumBP;
      const percent = sumBP ? ((profit / sumBP) * 100).toFixed(2) : '0.00';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border px-2 py-1">${sale.item}</td>
        <td class="border px-2 py-1">${sale.number}</td>
        <td class="border px-2 py-1">${sale.bp}</td>
        <td class="border px-2 py-1">${sale.sp}</td>
        <td class="border px-2 py-1">${sumBP}</td>
        <td class="border px-2 py-1">${sumSP}</td>
        <td class="border px-2 py-1">${profit}</td>
        <td class="border px-2 py-1">${percent}%</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading sales:', err);
  }
}

// Update Summary Cards (Total Sales, Expenses, Balance)
async function updateBarSummary() {
  try {
    const [expensesRes, salesRes] = await Promise.all([
      fetch(`${API_BASE}/expenses`, { headers }),
      fetch(`${API_BASE}/sales`, { headers })
    ]);
    const expenses = await expensesRes.json();
    const sales = await salesRes.json();

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = sales.reduce((sum, s) => sum + (s.sp * s.number), 0);

    document.getElementById('bar-total-sales').innerText = `UGX ${totalSales.toLocaleString()}`;
    document.getElementById('bar-total-expenses').innerText = `UGX ${totalExpenses.toLocaleString()}`;
    document.getElementById('bar-balance').innerText = `UGX ${(totalSales - totalExpenses).toLocaleString()}`;
  } catch (err) {
    console.error('Error updating summary:', err);
  }
}

// Event Listeners for Add Buttons to open modals
document.getElementById('add-item-btn-bar').addEventListener('click', () => openModal('inventory-modal'));
document.getElementById('add-expense-btn-bar').addEventListener('click', () => openModal('expense-modal'));
document.getElementById('add-sale-btn-bar').addEventListener('click', () => openModal('sale-modal'));

// Inventory form submission
document.getElementById('inventory-form').addEventListener('submit', async e => {
  e.preventDefault();
  const item = document.getElementById('inv-item').value.trim();
  const opening = parseInt(document.getElementById('inv-open').value);
  const purchases = parseInt(document.getElementById('inv-purchase').value);
  const sales = parseInt(document.getElementById('inv-sales').value);
  const spoilage = parseInt(document.getElementById('inv-spoilage').value);

  try {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ item, opening, purchases, sales, spoilage })
    });
    if(res.ok) {
      alert('Inventory added');
      closeModal('inventory-modal');
      await loadInventory();
    } else {
      alert('Failed to add inventory');
    }
  } catch (err) {
    console.error('Add inventory error:', err);
  }
  e.target.reset();
});

// Expense form submission
document.getElementById('expense-form').addEventListener('submit', async e => {
  e.preventDefault();
  const description = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amt').value);
  const receiptId = document.getElementById('exp-receipt').value.trim();
  const source = document.getElementById('exp-source').value.trim();
  const responsible = document.getElementById('exp-person').value.trim();

  try {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ description, amount, receiptId, source, responsible })
    });
    if(res.ok) {
      alert('Expense added');
      closeModal('expense-modal');
      await loadExpenses();
      await updateBarSummary();
    } else {
      alert('Failed to add expense');
    }
  } catch (err) {
    console.error('Add expense error:', err);
  }
  e.target.reset();
});

// Sale form submission
document.getElementById('sale-form').addEventListener('submit', async e => {
  e.preventDefault();
  const item = document.getElementById('sale-item').value.trim();
  const number = parseInt(document.getElementById('sale-number').value);
  const bp = parseFloat(document.getElementById('sale-bp').value);
  const sp = parseFloat(document.getElementById('sale-sp').value);

  try {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ item, number, bp, sp })
    });
    if(res.ok) {
      alert('Sale added');
      closeModal('sale-modal');
      await loadSales();
      await updateBarSummary();
    } else {
      alert('Failed to add sale');
    }
  } catch (err) {
    console.error('Add sale error:', err);
  }
  e.target.reset();
});

// On page load, show Bar page and load data
window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-target="bar"]').click();
  loadInventory();
  loadExpenses();
  loadSales();
  updateBarSummary();
});
