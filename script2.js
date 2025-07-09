// COMBINED JS FILE - All functionality consolidated and refactored

const API_BASE = 'https://patrinahhotelmgtsys.onrender.com';
let authHeader = localStorage.getItem('authHeader') || '';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': authHeader
};

// ---------- Sidebar Navigation ----------
document.querySelectorAll('[data-target]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const targetId = link.dataset.target;
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.getElementById(targetId)?.classList.remove('hidden');
  });
});

// ---------- Toggle Sub-Inventory ----------
function toggleSubInventory() {
  const links = document.getElementById('sub-inventory-links');
  const icon = document.getElementById('inventory-toggle-icon');
  links.classList.toggle('hidden');
  icon.classList.toggle('fa-chevron-down');
  icon.classList.toggle('fa-chevron-up');
}

// ---------- Authentication ----------
function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const encoded = btoa(`${username}:${password}`);
  authHeader = `Basic ${encoded}`;

  fetch(`${API_BASE}/sales`, { headers: { 'Authorization': authHeader } })
    .then(res => {
      if (!res.ok) throw new Error('Unauthorized');
      localStorage.setItem('authHeader', authHeader);
      location.reload();
    })
    .catch(() => document.getElementById('login-error').classList.remove('hidden'));
}

document.addEventListener('DOMContentLoaded', () => {
  if (authHeader) {
    headers['Authorization'] = authHeader;
    fetch(`${API_BASE}/sales`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        loadInventory();
        loadExpenses();
        loadSales();
        updateBarTotals();
      });
  }
});

// ---------- Modal Toggle ----------
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ---------- Inventory CRUD ----------
document.getElementById("inventory-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const item = document.getElementById("inv-item").value;
  const opening = parseInt(document.getElementById("inv-open").value);
  const purchases = parseInt(document.getElementById("inv-purchase").value);
  const sales = parseInt(document.getElementById("inv-sales").value);
  const spoilage = parseInt(document.getElementById("inv-spoilage").value);
  const totalStock = opening + purchases;
  const closing = totalStock - sales - spoilage;

  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ item, opening, purchases, sales, spoilage, totalStock, closing })
  });

  if (res.ok) {
    this.reset();
    closeModal('inventory-modal');
    loadInventory();
  }
});

async function loadInventory() {
  const res = await fetch(`${API_BASE}/inventory`, { headers });
  const data = await res.json();
  const tbody = document.getElementById("inventory-table-body-bar");
  tbody.innerHTML = '';
  data.forEach(({ item, opening, purchases, totalStock, sales, spoilage, closing }) => {
    tbody.innerHTML += `
      <tr>
        <td class="py-2 px-4">${item}</td>
        <td class="py-2 px-4">${opening}</td>
        <td class="py-2 px-4">${purchases}</td>
        <td class="py-2 px-4">${totalStock}</td>
        <td class="py-2 px-4">${sales}</td>
        <td class="py-2 px-4">${spoilage}</td>
        <td class="py-2 px-4">${closing}</td>
      </tr>
    `;
  });
}

// ---------- Expense CRUD ----------
document.getElementById("expense-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const description = document.getElementById("exp-desc").value;
  const amount = parseFloat(document.getElementById("exp-amt").value);
  const receiptId = document.getElementById("exp-receipt").value;
  const source = document.getElementById("exp-source").value;
  const responsible = document.getElementById("exp-person").value;

  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ description, amount, receiptId, source, responsible, date: new Date() })
  });

  if (res.ok) {
    this.reset();
    closeModal('expense-modal');
    loadExpenses();
  }
});

async function loadExpenses() {
  const res = await fetch(`${API_BASE}/expenses`, { headers });
  const data = await res.json();
  const tbody = document.getElementById("expenses-table-body-bar");
  tbody.innerHTML = '';
  data.forEach(e => {
    tbody.innerHTML += `
      <tr>
        <td class="py-2 px-4">${e.description}</td>
        <td class="py-2 px-4">${e.amount}</td>
        <td class="py-2 px-4">${new Date(e.date).toISOString().split('T')[0]}</td>
        <td class="py-2 px-4">${e.receiptId}</td>
        <td class="py-2 px-4">${e.source}</td>
        <td class="py-2 px-4">${e.responsible}</td>
        <td class="py-2 px-4 text-red-500 cursor-pointer" onclick="deleteExpense('${e._id}')">Delete</td>
      </tr>`;
  });
}

async function deleteExpense(id) {
  await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE', headers });
  loadExpenses();
}

// ---------- Sales CRUD ----------
document.getElementById("sale-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const item = document.getElementById("sale-item").value;
  const number = parseInt(document.getElementById("sale-number").value);
  const bp = parseFloat(document.getElementById("sale-bp").value);
  const sp = parseFloat(document.getElementById("sale-sp").value);

  const res = await fetch(`${API_BASE}/sales`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ item, number, bp, sp })
  });

  if (res.ok) {
    this.reset();
    closeModal('sale-modal');
    loadSales();
  }
});

async function loadSales() {
  const res = await fetch(`${API_BASE}/sales`, { headers });
  const data = await res.json();
  const tbody = document.getElementById("sales-table-body-bar");
  tbody.innerHTML = '';

  data.forEach(sale => {
    const sumBP = sale.bp * sale.number;
    const sumSP = sale.sp * sale.number;
    const profit = sumSP - sumBP;
    const percent = ((profit / sumBP) * 100).toFixed(2);

    tbody.innerHTML += `
      <tr>
        <td class="py-2 px-4">${sale.item}</td>
        <td class="py-2 px-4">${sale.number}</td>
        <td class="py-2 px-4">${sale.bp}</td>
        <td class="py-2 px-4">${sale.sp}</td>
        <td class="py-2 px-4">${sumBP}</td>
        <td class="py-2 px-4">${sumSP}</td>
        <td class="py-2 px-4">${profit}</td>
        <td class="py-2 px-4">${percent}%</td>
      </tr>`;
  });
}

// ---------- Summary Cards ----------
async function updateBarTotals() {
  const [salesRes, expensesRes] = await Promise.all([
    fetch(`${API_BASE}/sales`, { headers }),
    fetch(`${API_BASE}/expenses`, { headers })
  ]);

  const sales = await salesRes.json();
  const expenses = await expensesRes.json();

  const totalSales = sales.reduce((acc, s) => acc + s.sp * s.number, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const balance = totalSales - totalExpenses;

  document.getElementById('bar-total-sales').innerText = `UGX ${totalSales.toLocaleString()}`;
  document.getElementById('bar-total-expenses').innerText = `UGX ${totalExpenses.toLocaleString()}`;
  document.getElementById('bar-balance').innerText = `UGX ${balance.toLocaleString()}`;
}
