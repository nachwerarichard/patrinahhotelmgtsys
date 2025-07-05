// script2.js

const API_BASE = 'http://localhost:5000/api'; // Node.js backend base URL

// ----- Sidebar Navigation -----
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget.dataset.target;

        // Toggle active link
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-link'));
        e.currentTarget.classList.add('active-link');

        // Show target page
        document.querySelectorAll('.page-content').forEach(pc => pc.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
    });
});

// ----- Modal Management -----
function openModal(id) {
    document.getElementById(id).classList.remove('hidden', 'opacity-0');
    document.getElementById(id).classList.add('flex');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

// ----- Event Listeners for Buttons -----
document.getElementById('add-item-btn-bar').addEventListener('click', () => openModal('item-modal'));
document.getElementById('cancel-item-btn').addEventListener('click', () => closeModal('item-modal'));

document.getElementById('add-expense-btn-bar').addEventListener('click', () => openModal('expense-modal'));
document.getElementById('cancel-expense-btn').addEventListener('click', () => closeModal('expense-modal'));

document.getElementById('add-sale-btn-bar').addEventListener('click', () => openModal('sales-modal'));
document.getElementById('cancel-sale-btn').addEventListener('click', () => closeModal('sales-modal'));

// ----- Submit Handlers -----

document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = {
        name: document.getElementById('item-name').value,
        type: document.getElementById('item-type').value,
        quantity: +document.getElementById('item-quantity').value,
        price: +document.getElementById('item-price').value,
        dateAdded: new Date().toISOString().split('T')[0]
    };
    await fetch(`${API_BASE}/bar/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    closeModal('item-modal');
    loadInventory();
});

document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const expense = {
        description: document.getElementById('expense-description').value,
        amount: +document.getElementById('expense-amount').value,
        date: new Date().toISOString().split('T')[0],
        receiptId: document.getElementById('expense-receipt').value,
        source: document.getElementById('expense-source').value,
        responsible: document.getElementById('expense-responsible').value,
    };
    await fetch(`${API_BASE}/bar/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
    });
    closeModal('expense-modal');
    loadExpenses();
});

document.getElementById('sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = +document.getElementById('sale-number').value;
    const bp = +document.getElementById('sale-buying-price').value;
    const sp = +document.getElementById('sale-selling-price').value;
    const sale = {
        item: document.getElementById('sale-item').value,
        number: num,
        buyingPrice: bp,
        sellingPrice: sp,
        sumBP: num * bp,
        sumSP: num * sp,
        profit: (num * sp) - (num * bp),
        percentProfit: (((sp - bp) / bp) * 100).toFixed(2),
        receiptId: document.getElementById('sale-receipt-id').value,
        responsible: document.getElementById('sale-responsible').value,
    };
    await fetch(`${API_BASE}/bar/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
    });
    closeModal('sales-modal');
    loadSales();
});

// ----- Data Loaders -----

async function loadInventory() {
    const res = await fetch(`${API_BASE}/bar/inventory`);
    const data = await res.json();
    const tbody = document.getElementById('inventory-table-body-bar');
    tbody.innerHTML = data.map(item => `
        <tr>
            <td class="py-2 px-4">${item.name}</td>
            <td class="py-2 px-4">${item.type}</td>
            <td class="py-2 px-4">${item.quantity}</td>
            <td class="py-2 px-4">${item.price}</td>
            <td class="py-2 px-4">${item.dateAdded}</td>
            <td class="py-2 px-4">---</td>
        </tr>`).join('');
}

async function loadExpenses() {
    const res = await fetch(`${API_BASE}/bar/expenses`);
    const data = await res.json();
    const tbody = document.getElementById('expenses-table-body-bar');
    tbody.innerHTML = data.map(exp => `
        <tr>
            <td class="py-2 px-4">${exp.description}</td>
            <td class="py-2 px-4">${exp.amount}</td>
            <td class="py-2 px-4">${exp.date}</td>
            <td class="py-2 px-4">${exp.receiptId}</td>
            <td class="py-2 px-4">${exp.source}</td>
            <td class="py-2 px-4">${exp.responsible}</td>
            <td class="py-2 px-4">---</td>
        </tr>`).join('');
}

async function loadSales() {
    const res = await fetch(`${API_BASE}/bar/sales`);
    const data = await res.json();
    const tbody = document.getElementById('sales-table-body-bar');
    tbody.innerHTML = data.map(sale => `
        <tr>
            <td class="py-2 px-4">${sale.item}</td>
            <td class="py-2 px-4">${sale.number}</td>
            <td class="py-2 px-4">${sale.buyingPrice}</td>
            <td class="py-2 px-4">${sale.sellingPrice}</td>
            <td class="py-2 px-4">${sale.sumBP}</td>
            <td class="py-2 px-4">${sale.sumSP}</td>
            <td class="py-2 px-4">${sale.profit}</td>
            <td class="py-2 px-4">${sale.percentProfit}%</td>
        </tr>`).join('');
}

// ----- Init Load -----
loadInventory();
loadExpenses();
loadSales();
