 // --- Utility Functions (update showSection) ---
    function showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionId}-section`).classList.add('active');

        // Fetch data when a section is made active
        if (sectionId === 'inventory') {
            fetchInventory();
        } else if (sectionId === 'sales') {
            fetchSales();
        } else if (sectionId === 'expenses') {
            fetchExpenses();
        } else if (sectionId === 'reports') {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);

            const startInput = document.getElementById('report-start-date');
            const endInput = document.getElementById('report-end-date');

            if (!startInput.value) {
                startInput.value = thirtyDaysAgo.toISOString().split('T')[0];
            }
            if (!endInput.value) {
                endInput.value = today.toISOString().split('T')[0];
            }
            generateReports();
        } else if (sectionId === 'cash-management') { // NEW: Cash Management
            // Set default date filter for cash management to today
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            document.getElementById('cash-date').value = `${yyyy}-${mm}-${dd}`; // Default for new entry form
            document.getElementById('cash-filter-date').value = `${yyyy}-${mm}-${dd}`; // Default for filter
            fetchCashJournal();
        }
    }

    // --- NEW: Cash Management Functions ---

    /**
     * Fetches and displays cash journal records. Supports filtering by date and responsible person.
     */
    async function fetchCashJournal() {
        try {
            const dateFilter = document.getElementById('cash-filter-date').value;
            const responsibleFilter = document.getElementById('cash-filter-responsible').value;

            let url = `${API_BASE_URL}/cash-journal`;
            const params = new URLSearchParams();
            if (dateFilter) params.append('date', dateFilter);
            if (responsibleFilter) params.append('responsiblePerson', responsibleFilter);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await authenticatedFetch(url);
            if (!response) return;
            const records = await response.json();
            renderCashJournalTable(records);
        } catch (error) {
            console.error('Error fetching cash journal:', error);
            alert('Failed to fetch cash journal: ' + error.message);
        }
    }

    /**
     * Renders the fetched cash journal records into the cash management table.
     * @param {Array} records An array of cash journal objects.
     */
    function renderCashJournalTable(records) {
        const tbody = document.querySelector('#cash-journal-table tbody');
        tbody.innerHTML = ''; // Clear existing rows
        if (records.length === 0) {
            const row = tbody.insertRow();
            row.insertCell().colSpan = 6;
            row.insertCell().textContent = 'No cash records found for the selected filters.';
            return;
        }

        records.forEach(record => {
            const row = tbody.insertRow();
            row.insertCell().textContent = new Date(record.date).toLocaleDateString();
            row.insertCell().textContent = record.cashAtHand.toFixed(2);
            row.insertCell().textContent = record.cashBanked.toFixed(2);
            row.insertCell().textContent = record.bankReceiptId;
            row.insertCell().textContent = record.responsiblePerson;
            const actionsCell = row.insertCell();
            actionsCell.className = 'actions';

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit';
            editButton.onclick = () => populateCashJournalForm(record);
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete';
            deleteButton.onclick = () => deleteCashJournal(record._id);
            actionsCell.appendChild(deleteButton);
        });
    }

    /**
     * Handles the submission of the cash journal form (add or update).
     * @param {Event} event The form submission event.
     */
    async function submitCashJournalForm(event) {
        event.preventDefault();

        const id = document.getElementById('cash-journal-id').value;
        const cashAtHand = parseFloat(document.getElementById('cash-at-hand').value);
        const cashBanked = parseFloat(document.getElementById('cash-banked').value);
        const bankReceiptId = document.getElementById('bank-receipt-id').value;
        const responsiblePerson = document.getElementById('responsible-person').value;
        const date = document.getElementById('cash-date').value;

        const cashData = { cashAtHand, cashBanked, bankReceiptId, responsiblePerson, date };

        try {
            let response;
            if (id) { // If ID exists, it's an update operation
                response = await authenticatedFetch(`${API_BASE_URL}/cash-journal/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(cashData)
                });
            } else { // Otherwise, it's a new entry creation
                response = await authenticatedFetch(`${API_BASE_URL}/cash-journal`, {
                    method: 'POST',
                    body: JSON.stringify(cashData)
                });
            }
            if (response) {
                await response.json();
                alert(`Cash entry ${id ? 'updated' : 'added'} successfully!`);
                document.getElementById('cash-journal-form').reset(); // Clear the form
                document.getElementById('cash-journal-id').value = ''; // Clear ID for next new entry
                // Reset date to today for new entry after submission
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                document.getElementById('cash-date').value = `${yyyy}-${mm}-${dd}`;
                fetchCashJournal(); // Refresh the table
            }
        } catch (error) {
            console.error('Error saving cash entry:', error);
            alert('Failed to save cash entry: ' + error.message);
        }
    }

    /**
     * Populates the cash journal form with data from an existing record for editing.
     * @param {object} record The cash journal record object.
     */
    function populateCashJournalForm(record) {
        document.getElementById('cash-journal-id').value = record._id;
        document.getElementById('cash-at-hand').value = record.cashAtHand;
        document.getElementById('cash-banked').value = record.cashBanked;
        document.getElementById('bank-receipt-id').value = record.bankReceiptId;
        document.getElementById('responsible-person').value = record.responsiblePerson;
        // Format date for input[type="date"] (YYYY-MM-DD)
        document.getElementById('cash-date').value = new Date(record.date).toISOString().split('T')[0];
    }

    /**
     * Deletes a cash journal record by its ID.
     * @param {string} id The ID of the record to delete.
     */
    async function deleteCashJournal(id) {
        if (!confirm('Are you sure you want to delete this cash journal entry?')) {
            return; // User cancelled
        }
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/cash-journal/${id}`, {
                method: 'DELETE'
            });
            if (response && response.status === 204) { // 204 No Content indicates successful deletion
                alert('Cash entry deleted successfully!');
                fetchCashJournal(); // Refresh the table
            } else if (response) {
                const errorData = await response.json();
                alert('Failed to delete cash entry: ' + errorData.error);
            }
        } catch (error) {
            console.error('Error deleting cash entry:', error);
            alert('Failed to delete cash entry: ' + error.message);
        }
    }

    // --- Event Listeners (update DOMContentLoaded) ---
    document.addEventListener('DOMContentLoaded', () => {
        // ... existing DOMContentLoaded code ...

        // Attach new form submission handler
        document.getElementById('cash-journal-form').addEventListener('submit', submitCashJournalForm);

        // Set initial date filter for sales/expenses/cash management to today
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayString = `${yyyy}-${mm}-${dd}`;
        document.getElementById('sales-date-filter').value = todayString;
        document.getElementById('expenses-date-filter').value = todayString;
        document.getElementById('cash-date').value = todayString; // For new cash entry form
        document.getElementById('cash-filter-date').value = todayString; // For cash filter
    });
