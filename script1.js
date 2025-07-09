const API_BASE = 'https://patrinahhotelmgtsys.onrender.com'; // Replace with your actual Render URL
document.getElementById('add-item-btn-bar').addEventListener('click', async () => {
  const item = prompt('Enter item name:');
  const opening = Number(prompt('Opening stock:'));
  const purchases = Number(prompt('Purchases:'));
  const sales = Number(prompt('Sales:'));
  const spoilage = Number(prompt('Spoilage:'));
  
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ item, opening, purchases, sales, spoilage })
  });

  const data = await res.json();
  alert('Inventory item added!');
  loadInventory(); // Refresh table
});


async function loadInventory() {
  const res = await fetch(`${API_BASE}/inventory`, { headers });
  const inventory = await res.json();

  const tbody = document.getElementById('inventory-table-body-bar');
  tbody.innerHTML = '';

  inventory.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td class="py-2 px-4">${item.item}</td>
        <td class="py-2 px-4">${item.opening}</td>
        <td class="py-2 px-4">${item.purchases}</td>
        <td class="py-2 px-4">${item.opening + item.purchases}</td>
        <td class="py-2 px-4">${item.sales}</td>
        <td class="py-2 px-4">${item.spoilage}</td>
        <td class="py-2 px-4">${item.closing}</td>
      </tr>
    `;
  });
}

// Call on page load or section show
loadInventory();


document.getElementById('add-expense-btn-bar').addEventListener('click', async () => {
  const description = prompt('Description:');
  const amount = Number(prompt('Amount:'));
  const receiptId = prompt('Receipt ID:');
  const source = prompt('Source:');
  const responsible = prompt('Responsible Person:');

  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ description, amount, receiptId, source, responsible })
  });

  alert('Expense added!');
  loadExpenses();
});

async function loadExpenses() {
  const res = await fetch(`${API_BASE}/expenses`, { headers });
  const expenses = await res.json();

  const tbody = document.getElementById('expenses-table-body-bar');
  tbody.innerHTML = '';

  expenses.forEach(exp => {
    tbody.innerHTML += `
      <tr>
        <td class="py-2 px-4">${exp.description}</td>
        <td class="py-2 px-4">${exp.amount}</td>
        <td class="py-2 px-4">${new Date(exp.date).toLocaleDateString()}</td>
        <td class="py-2 px-4">${exp.receiptId}</td>
        <td class="py-2 px-4">${exp.source}</td>
        <td class="py-2 px-4">${exp.responsible}</td>
        <td class="py-2 px-4"><button class="text-red-500" onclick="deleteExpense('${exp._id}')">Delete</button></td>
        <td class="py-2 px-4"><button onclick="editSale('${sale._id}')" class="text-blue-500 hover:underline">Edit</button></td>
      </tr>
    `;
  });
}

async function deleteExpense(id) {
  await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE', headers });
  loadExpenses();
}
document.getElementById('add-sale-btn-bar').addEventListener('click', async () => {
  const item = prompt('Item:');
  const number = Number(prompt('Quantity:'));
  const bp = Number(prompt('Buying Price:'));
  const sp = Number(prompt('Selling Price:'));

  const res = await fetch(`${API_BASE}/sales`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ item, number, bp, sp })
  });

  alert('Sale added!');
  loadSales();
});
async function loadSales() {
  const res = await fetch(`${API_BASE}/sales`, { headers });
  const sales = await res.json();

  const tbody = document.getElementById('sales-table-body-bar');
  tbody.innerHTML = '';

  sales.forEach(sale => {
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
        <td class="py-2 px-4"><button onclick="editSale('${sale._id}')" class="text-blue-500 hover:underline">Edit</button></td>
      </tr>
    `;
  });
}


async function updateBarSummary() {
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
}


window.addEventListener('DOMContentLoaded', () => {
  loadInventory();
  loadExpenses();
  loadSales();
  updateBarSummary();
});

document.getElementById('cash-form-bar').addEventListener('submit', async function (e) {
  e.preventDefault();

  const atHand = Number(document.getElementById('cash-at-hand-bar').value);
  const banked = Number(document.getElementById('cash-banked-bar').value);
  const receiptId = document.getElementById('banked-receipt-id-bar').value;
  const responsible = document.getElementById('responsible-person-bar').value;

  try {
    const res = await fetch(`${API_BASE}/cash`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ atHand, banked, receiptId, responsible })
    });

    if (!res.ok) throw new Error('Failed to save cash record');

    alert('Cash record saved successfully!');
    document.getElementById('cash-form-bar').reset();
  } catch (err) {
    alert('Error: ' + err.message);
  }
});
