// script.js

// Sidebar Navigation Logic
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.target;

        document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-link'));
        link.classList.add('active-link');
    });
});

// Sidebar toggle on small screens
document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('-translate-x-full');
});

// Modal control logic (reusable)
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    document.getElementById(modalId).classList.add('flex');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(modalId).classList.remove('flex');
}

// Attach modal button logic
document.getElementById('add-item-btn')?.addEventListener('click', () => openModal('item-modal'));
document.getElementById('cancel-item-btn')?.addEventListener('click', () => closeModal('item-modal'));

document.getElementById('add-expense-btn')?.addEventListener('click', () => openModal('expense-modal'));
document.getElementById('cancel-expense-btn')?.addEventListener('click', () => closeModal('expense-modal'));

document.getElementById('add-sale-btn')?.addEventListener('click', () => openModal('sales-modal'));
document.getElementById('cancel-sale-btn')?.addEventListener('click', () => closeModal('sales-modal'));

// Sample logic to populate tables (replace with real data fetching)
const sampleItems = [
    { name: 'Coca-Cola', type: 'Soft Drink', quantity: 20, price: 2500, date: '2025-07-04' },
    { name: 'Whiskey', type: 'Hard Drink', quantity: 5, price: 10000, date: '2025-07-04' },
];

const inventoryTable = document.getElementById('inventory-table-body');

function populateInventory(items) {
    inventoryTable.innerHTML = '';
    items.forEach((item, i) => {
        const row = `<tr>
            <td class="py-2 px-4">${item.name}</td>
            <td class="py-2 px-4">${item.type}</td>
            <td class="py-2 px-4">${item.quantity}</td>
            <td class="py-2 px-4">${item.price}</td>
            <td class="py-2 px-4">${item.date}</td>
            <td class="py-2 px-4">
                <button class="text-blue-600 hover:underline">Edit</button>
                <button class="text-red-600 hover:underline ml-2">Delete</button>
            </td>
        </tr>`;
        inventoryTable.insertAdjacentHTML('beforeend', row);
    });
}

// Call populate with sample data
populateInventory(sampleItems);

// Notification (for example, when quantity < 10)
function checkLowStock(items) {
    const lowStockItem = items.find(item => item.quantity < 10);
    if (lowStockItem) {
        document.getElementById('low-stock-message').textContent = `${lowStockItem.name} is low in stock!`;
        document.getElementById('low-stock-notification').classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('low-stock-notification').classList.add('hidden');
        }, 5000);
    }
}

checkLowStock(sampleItems);

// You can expand this code to handle forms, saving to database, and dynamic updates.
