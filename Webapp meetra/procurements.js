// procurements.js - Logic for the Order/Procurement Module

let allProcurements = [];
let currentProcurement = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch if the view is active or on load
    if (window.location.hash === '#procurements') {
        fetchProcurements();
    }
});

// Detect hash change to load data
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#procurements') {
        fetchProcurements();
    }
});

async function fetchProcurements() {
    try {
        const { data, error } = await window.supabaseClient
            .from('procurements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProcurements = data || [];
        renderProcurements(allProcurements);
    } catch (err) {
        console.error('Error fetching procurements:', err);
        alert('Fehler beim Laden der Bestellungen: ' + err.message);
    }
}

function renderProcurements(procurements) {
    const listBody = document.getElementById('procurement-list');
    const emptyState = document.getElementById('procurement-empty-state');

    if (!listBody) return;

    listBody.innerHTML = '';

    if (procurements.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    // Group procurements by status category
    const groups = {
        offen: procurements.filter(p => ['new', 'in_progress'].includes(p.status)),
        bestellt: procurements.filter(p => p.status === 'ordered'),
        erledigt: procurements.filter(p => ['received', 'cancelled'].includes(p.status))
    };

    const groupConfig = [
        { key: 'offen', label: '📋 Offen', color: '#60a5fa' },
        { key: 'bestellt', label: '📦 Bestellt', color: '#a78bfa' },
        { key: 'erledigt', label: '✅ Erledigt', color: '#34d399' }
    ];

    groupConfig.forEach(group => {
        const items = groups[group.key];
        if (items.length === 0) return;

        // Create group header row
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = 'background: rgba(255, 255, 255, 0.03);';
        headerRow.innerHTML = `
            <td colspan="8" style="padding: 12px 20px; font-weight: 700; font-size: 1.1rem; color: ${group.color}; border-top: 2px solid ${group.color};">
                ${group.label} <span style="opacity: 0.6; font-size: 0.9rem;">(${items.length})</span>
            </td>
        `;
        listBody.appendChild(headerRow);

        // Render items in this group
        items.forEach(proc => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td><span style="font-family: monospace; opacity: 0.8;">${proc.order_number}</span></td>
                <td>${getCategoryBadge(proc.category)}</td>
                <td style="font-weight: 600;">${proc.title}</td>
                <td>${getStatusBadge(proc.status)}</td>
                <td>${getPriorityBadge(proc.priority)}</td>
                <td>${proc.created_by_user?.email || 'Unbekannt'}</td>
                <td>${new Date(proc.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="icon-btn" onclick="event.stopPropagation(); openProcurementModal('${proc.id}')" title="Bearbeiten">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="icon-btn" onclick="event.stopPropagation(); deleteProcurement('${proc.id}')" title="Löschen" style="color: #ef4444;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            `;

            // Add click handler for quick status update
            tr.addEventListener('click', () => showStatusUpdateMenu(proc.id, tr));

            listBody.appendChild(tr);
        });
    });
}

function showStatusUpdateMenu(procId, rowElement) {
    const proc = allProcurements.find(p => p.id === procId);
    if (!proc) return;

    // Remove any existing menu
    const existingMenu = document.querySelector('.status-update-menu');
    if (existingMenu) existingMenu.remove();

    // Create status update menu
    const menu = document.createElement('div');
    menu.className = 'status-update-menu';
    menu.style.cssText = `
        position: absolute;
        background: rgba(15, 23, 42, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        backdrop-filter: blur(20px);
    `;

    const statuses = [
        { value: 'new', label: '📋 Neu', group: 'offen' },
        { value: 'in_progress', label: '⏳ In Bearbeitung', group: 'offen' },
        { value: 'ordered', label: '📦 Bestellt', group: 'bestellt' },
        { value: 'received', label: '✅ Erhalten', group: 'erledigt' },
        { value: 'cancelled', label: '❌ Storniert', group: 'erledigt' }
    ];

    statuses.forEach(status => {
        const btn = document.createElement('button');
        btn.textContent = status.label;
        btn.style.cssText = `
            display: block;
            width: 100%;
            padding: 8px 12px;
            margin: 2px 0;
            background: ${proc.status === status.value ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            text-align: left;
            font-size: 0.9rem;
            transition: background 0.2s;
        `;
        btn.onmouseover = () => btn.style.background = 'rgba(59, 130, 246, 0.3)';
        btn.onmouseout = () => btn.style.background = proc.status === status.value ? 'rgba(59, 130, 246, 0.2)' : 'transparent';
        btn.onclick = (e) => {
            e.stopPropagation();
            updateProcurementStatus(procId, status.value);
            menu.remove();
        };
        menu.appendChild(btn);
    });

    // Position menu near the row
    const rect = rowElement.getBoundingClientRect();
    menu.style.left = `${rect.left + 20}px`;
    menu.style.top = `${rect.bottom + 5}px`;

    document.body.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
}

async function updateProcurementStatus(id, newStatus) {
    try {
        const { error } = await window.supabaseClient
            .from('procurements')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;

        // Update local data
        const proc = allProcurements.find(p => p.id === id);
        if (proc) proc.status = newStatus;

        renderProcurements(allProcurements);
    } catch (err) {
        console.error('Error updating status:', err);
        alert('Fehler beim Aktualisieren: ' + err.message);
    }
}

function getCategoryBadge(category) {
    const map = {
        'machine_part': '🔧 Maschinenersatzteil',
        'workshop_supplies': 'Werkstattbedarf',
        'tools': '🔨 Werkzeug',
        'office_supplies': '✏️ Bürobedarf',
        'other': '📦 Sonstiges'
    };
    return map[category] || category;
}

function getStatusBadge(status) {
    const map = {
        'new': { label: 'Neu', class: 'status-new' },
        'in_progress': { label: 'In Bearbeitung', class: 'status-in-progress' },
        'ordered': { label: 'Bestellt', class: 'status-ordered' },
        'received': { label: 'Erhalten', class: 'status-received' },
        'cancelled': { label: 'Storniert', class: 'status-cancelled' }
    };
    const conf = map[status] || { label: status, class: '' };
    // Using inline styles for simplicity based on existing pills if classes aren't defined
    let style = 'padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;';
    if (status === 'new') style += 'background: rgba(59, 130, 246, 0.15); color: #60a5fa;';
    if (status === 'in_progress') style += 'background: rgba(245, 158, 11, 0.15); color: #fbbf24;';
    if (status === 'ordered') style += 'background: rgba(139, 92, 246, 0.15); color: #a78bfa;';
    if (status === 'received') style += 'background: rgba(16, 185, 129, 0.15); color: #34d399;';
    if (status === 'cancelled') style += 'background: rgba(239, 68, 68, 0.15); color: #ef4444;';

    return `<span style="${style}">${conf.label}</span>`;
}

function getPriorityBadge(priority) {
    let style = 'padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase;';
    if (priority === 'high') style += 'background: rgba(239, 68, 68, 0.1); color: #ef4444;';
    if (priority === 'normal') style += 'background: rgba(59, 130, 246, 0.1); color: #60a5fa;';
    if (priority === 'low') style += 'background: rgba(16, 185, 129, 0.1); color: #34d399;';

    const label = priority === 'high' ? 'Hoch' : priority === 'normal' ? 'Normal' : 'Niedrig';
    return `<span style="${style}">${label}</span>`;
}

// Modal Logic
window.openProcurementModal = async function (id = null) {
    const modal = document.getElementById('procurement-modal');
    if (!modal) return;

    // Reset form
    document.getElementById('procurement-form').reset();
    document.getElementById('procurement-id').value = '';

    if (id) {
        // Edit Mode
        const proc = allProcurements.find(p => p.id === id);
        if (proc) {
            document.getElementById('procurement-id').value = proc.id;
            document.getElementById('proc-title').value = proc.title;
            document.getElementById('proc-description').value = proc.description || '';
            document.getElementById('proc-category').value = proc.category;
            document.getElementById('proc-quantity').value = proc.quantity;
            document.getElementById('proc-priority').value = proc.priority;
            document.getElementById('proc-delivery-date').value = proc.delivery_date || '';
            document.getElementById('proc-link').value = proc.product_link || '';
            document.getElementById('proc-location').value = proc.location_ref || '';
            document.getElementById('proc-remarks').value = proc.remarks || '';
            document.getElementById('procurement-modal-title').textContent = `Bestellung ${proc.order_number} bearbeiten`;
        }
    } else {
        // New Mode
        document.getElementById('procurement-modal-title').textContent = 'Neue Bestellung';
        // Auto-select current user isn't needed visually as we use auth.uid() in DB, but we could show it.
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
};

window.closeProcurementModal = function () {
    const modal = document.getElementById('procurement-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
        setTimeout(() => modal.style.display = 'none', 300); // Wait for transition
    }
};

window.deleteProcurement = async function (id) {
    const proc = allProcurements.find(p => p.id === id);
    if (!proc) return;

    const confirmMsg = `Bestellung "${proc.order_number}" wirklich löschen?\n\nTitel: ${proc.title}`;

    if (!confirm(confirmMsg)) return;

    try {
        const { error } = await window.supabaseClient
            .from('procurements')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Bestellung erfolgreich gelöscht!');
        fetchProcurements(); // Refresh list
    } catch (err) {
        console.error('Error deleting procurement:', err);
        alert('Fehler beim Löschen: ' + err.message);
    }
};

window.saveProcurement = async function () {
    const id = document.getElementById('procurement-id').value;
    const title = document.getElementById('proc-title').value;
    const category = document.getElementById('proc-category').value;
    const description = document.getElementById('proc-description').value;
    const quantity = document.getElementById('proc-quantity').value;
    const priority = document.getElementById('proc-priority').value;
    const delivery_date = document.getElementById('proc-delivery-date').value || null;
    const product_link = document.getElementById('proc-link').value;
    const location_ref = document.getElementById('proc-location').value;
    const remarks = document.getElementById('proc-remarks').value;

    const status = 'new'; // Default for new

    try {
        // Use activeUser directly, no alert if not found (or handle gracefully)
        const user = window.activeUser || (await window.supabaseClient.auth.getUser()).data.user;

        // If no user is selected/logged in, we might want to allow it or warn effectively.
        // The user requested to remove the "Bitte melden Sie sich an" check.
        // We will proceed. If user is null, created_by might be null (if DB allows) or we handle it.
        // Ideally we should have a fallback system user or just proceed.

        let order_number = null;
        if (!id) {
            // Generate Order Number logic (Simplified: Count + 1 or Random for now, ideally DB trigger)
            // We'll fetch the last order number to increment
            const { data: lastOrder } = await window.supabaseClient
                .from('procurements')
                .select('order_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            let nextNum = 1;
            if (lastOrder && lastOrder.order_number) {
                const parts = lastOrder.order_number.split('-');
                if (parts.length === 3) {
                    nextNum = parseInt(parts[2]) + 1;
                }
            }
            const year = new Date().getFullYear();
            order_number = `BW-${year}-${String(nextNum).padStart(6, '0')}`;
        }

        const payload = {
            title,
            category,
            description,
            quantity: parseInt(quantity),
            priority,
            delivery_date,
            product_link,
            location_ref,
            remarks,
            // status is only set on creation or separate status update
        };

        if (!id) {
            payload.order_number = order_number;
            payload.status = 'new';
            // Use user.id if available, otherwise null. 
            // NOTE: If DB requires created_by, this might still fail on insert, but won't crash JS.
            payload.created_by = user ? user.id : null;

            const { error } = await window.supabaseClient.from('procurements').insert(payload);
            if (error) throw error;
        } else {
            const { error } = await window.supabaseClient.from('procurements').update(payload).eq('id', id);
            if (error) throw error;
        }

        closeProcurementModal();
        fetchProcurements();
        alert('Bestellung gespeichert!');

    } catch (err) {
        console.error('Save error:', err);
        alert('Fehler beim Speichern: ' + err.message);
    }
};

window.filterProcurements = function (status = 'all') {
    const term = document.getElementById('procurement-search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#procurement-list tr');

    // Update pill active state
    if (status !== 'all' && typeof status === 'string') { // check if it's a status button click
        document.querySelectorAll('#procurements .filter-pill').forEach(btn => {
            btn.classList.remove('active');
            if (btn.onclick.toString().includes(status)) btn.classList.add('active');
        });
    } else if (status === 'all') {
        document.querySelectorAll('#procurements .filter-pill').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent === 'Alle') btn.classList.add('active');
        });
    }

    // Filter logic currently only visual filtering of loaded list. For styling consistency.
    // Ideally we re-fetch with filters for large datasets.
    // Here we filter allProcurements array and re-render
    let filtered = allProcurements;

    if (status !== 'all' && ['new', 'in_progress', 'ordered', 'received'].includes(status)) {
        filtered = filtered.filter(p => p.status === status);
    }

    if (term) {
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(term) ||
            p.order_number.toLowerCase().includes(term) ||
            (p.description && p.description.toLowerCase().includes(term))
        );
    }

    renderProcurements(filtered);
};

// --- Custom Dropdown Logic for Procurement Modal ---

document.addEventListener('DOMContentLoaded', () => {
    setupProcurementDropdown('proc-category-dropdown');
    setupProcurementDropdown('proc-priority-dropdown');
});

function setupProcurementDropdown(id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    dropdown.addEventListener('click', function (e) {
        // Toggle active class
        const isActive = this.classList.toggle('active');
        e.stopPropagation();

        // Handle parent z-index to avoid overlap issues
        const parentGroup = this.closest('.form-group');
        if (parentGroup) {
            parentGroup.style.zIndex = isActive ? '100' : '';
        }

        // Close other dropdowns
        document.querySelectorAll('.custom-filter-dropdown').forEach(d => {
            if (d !== this) {
                d.classList.remove('active');
                const p = d.closest('.form-group');
                if (p) p.style.zIndex = '';
            }
        });
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('.custom-filter-dropdown')) {
        document.querySelectorAll('.custom-filter-dropdown').forEach(d => {
            d.classList.remove('active');
            const p = d.closest('.form-group');
            if (p) p.style.zIndex = '';
        });
    }
});

window.selectProcurementCategory = function (event) {
    const li = event.target.closest('li');
    if (!li) return;

    const value = li.dataset.value;
    const text = li.textContent;

    document.getElementById('proc-category').value = value;
    document.getElementById('proc-category-label').textContent = text;
    document.getElementById('proc-category-label').style.color = '#fff'; // Highlight selected
}

window.selectProcurementPriority = function (event) {
    const li = event.target.closest('li');
    if (!li) return;

    const value = li.dataset.value;
    const text = li.textContent;

    document.getElementById('proc-priority').value = value;
    document.getElementById('proc-priority-label').textContent = text;
    document.getElementById('proc-priority-label').style.color = '#fff';
}
