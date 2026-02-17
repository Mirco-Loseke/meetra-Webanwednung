
// ==========================================
// TASKS MODULE
// ==========================================
// Handles Kanban board, Task lists, Subtasks, 
// Comments, History and Time Tracking.

(function () {
    'use strict';

    console.log('Loading tasks module...');

    // ==========================================
    // GLOBAL STATE
    // ==========================================
    let allTasks = [];
    let currentTask = null;
    let viewMode = 'board'; // 'board' or 'list'
    let filters = {
        project: 'all',
        priority: 'all',
        search: ''
    };

    // ==========================================
    // INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        initTasksModule();
    });

    async function initTasksModule() {
        console.log('Initializing Tasks Module...');

        // Navigation Listeners (Sidebar)
        const tasksNavLink = document.querySelector('.nav-link[data-target="tasks"]');
        if (tasksNavLink) {
            tasksNavLink.addEventListener('click', (e) => {
                // Ensure the view is switched before fetching
                setTimeout(() => {
                    fetchTasks();
                    fetchProjects();
                }, 50);
            });
        }

        // Search Input
        const searchInput = document.getElementById('task-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filters.search = e.target.value.toLowerCase();
                renderTasks();
            });
        }

        // Dropdown triggers
        setupFilterDropdowns();

        // Initial fetch if already on tasks view
        if (document.getElementById('tasks') && !document.getElementById('tasks').classList.contains('hidden')) {
            fetchTasks();
            fetchProjects();
        }

        // Setup Drag & Drop
        setupDragAndDrop();
    }

    function setupFilterDropdowns() {
        const triggers = {
            'task-project-filter-trigger': 'task-project-filter-menu',
            'task-priority-filter-trigger': 'task-priority-filter-menu',
            'task-user-select-trigger': 'task-user-select-menu'
        };

        Object.keys(triggers).forEach(id => {
            const trigger = document.getElementById(id);
            const menu = document.getElementById(triggers[id]);
            if (trigger && menu) {
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    const isVisible = menu.style.display === 'block';
                    // Close others
                    document.querySelectorAll('.custom-filter-menu').forEach(m => m.style.display = 'none');
                    menu.style.display = isVisible ? 'none' : 'block';
                };
            }
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-filter-menu').forEach(m => m.style.display = 'none');
        });
    }

    // ==========================================
    // DATA FETCHING
    // ==========================================
    window.fetchTasks = async function () {
        try {
            const { data, error } = await window.supabaseClient
                .from('tasks')
                .select(`
                    *,
                    projects(name),
                    subtasks(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            allTasks = data || [];
            renderTasks();
        } catch (err) {
            console.error('Error fetching tasks:', err);
        }
    };

    window.fetchProjects = async function () {
        try {
            const { data, error } = await window.supabaseClient
                .from('projects')
                .select('*')
                .order('name');

            if (error) throw error;
            populateProjectFilters(data || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    // ==========================================
    // RENDERING
    // ==========================================
    function renderTasks() {
        const filteredTasks = allTasks.filter(task => {
            const title = task.title ? task.title.toLowerCase() : '';
            const desc = task.description ? task.description.toLowerCase() : '';
            const matchesSearch = title.includes(filters.search) || desc.includes(filters.search);
            const matchesProject = filters.project === 'all' || task.project_id === filters.project;
            const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;

            return matchesSearch && matchesProject && matchesPriority;
        });

        if (viewMode === 'board') {
            renderBoard(filteredTasks);
        } else {
            renderList(filteredTasks);
        }
    }

    function renderBoard(tasks) {
        document.getElementById('tasks-board').classList.remove('hidden');
        document.getElementById('tasks-list').classList.add('hidden');

        const columns = {
            'open': document.getElementById('list-open'),
            'in_progress': document.getElementById('list-in-progress'),
            'completed': document.getElementById('list-completed')
        };

        // Clear existing
        Object.values(columns).forEach(col => {
            if (col) col.innerHTML = '';
        });

        tasks.forEach(task => {
            const column = columns[task.status] || columns['open'];
            if (column) {
                const card = createTaskCard(task);
                column.appendChild(card);
            }
        });

        // Update counts
        Object.keys(columns).forEach(status => {
            const colElem = document.querySelector(`.kanban-column[data-status="${status}"]`);
            if (colElem) {
                const countLabel = colElem.querySelector('.task-count');
                if (countLabel) {
                    const count = tasks.filter(t => t.status === status).length;
                    countLabel.textContent = count;
                }
            }
        });
    }

    function renderList(tasks) {
        document.getElementById('tasks-board').classList.add('hidden');
        document.getElementById('tasks-list').classList.remove('hidden');

        const tbody = document.getElementById('task-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        tasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="status-pill status-${task.status}">${formatStatus(task.status)}</span></td>
                <td style="font-weight: 600;">${task.title}</td>
                <td><span class="priority-badge p-${task.priority}">${formatPriority(task.priority)}</span></td>
                <td>${task.projects?.name || '-'}</td>
                <td>${task.end_date ? new Date(task.end_date).toLocaleDateString() : '-'}</td>
                <td>${renderAvatars(task.assigned_to)}</td>
                <td>${renderProgress(task)}</td>
                <td>
                    <button class="icon-btn" onclick="openTaskModal('${task.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                </td>
            `;
            tr.onclick = () => openTaskModal(task.id);
            tbody.appendChild(tr);
        });
    }

    function createTaskCard(task) {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.draggable = true;
        div.id = `task-${task.id}`;
        div.dataset.id = task.id;

        const subtasksTotal = task.subtasks?.length || 0;
        const subtasksDone = task.subtasks?.filter(s => s.status === 'completed').length || 0;
        const progress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

        div.innerHTML = `
            <div class="task-card-header">
                <span class="priority-badge p-${task.priority}">${formatPriority(task.priority)}</span>
                ${task.projects?.name ? `<span class="project-tag">${task.projects.name}</span>` : ''}
            </div>
            <div class="task-card-title">${task.title}</div>
            ${task.description ? `<div class="task-card-desc">${task.description.substring(0, 60)}${task.description.length > 60 ? '...' : ''}</div>` : ''}
            
            <div class="task-card-footer">
                <div class="task-progress-mini">
                    <div class="progress-bar-bg"><div class="progress-bar-fg" style="width: ${progress}%"></div></div>
                    <span>${subtasksDone}/${subtasksTotal}</span>
                </div>
                <div class="assigned-users-mini">
                    ${renderAvatars(task.assigned_to)}
                </div>
            </div>
        `;

        div.onclick = (e) => {
            e.stopPropagation();
            openTaskModal(task.id);
        };

        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            div.classList.add('dragging');
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
        });

        return div;
    }

    // ==========================================
    // MODAL & ACTIONS
    // ==========================================
    window.openAddTaskModal = function () {
        openTaskModal(null);
    };

    window.openTaskModal = async function (taskId = null) {
        const modal = document.getElementById('task-modal');
        if (!modal) return;

        // Ensure user list is available
        if (!window.userList || window.userList.length === 0) {
            if (typeof window.fetchUsers === 'function') {
                await window.fetchUsers();
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';

        if (taskId) {
            const task = allTasks.find(t => t.id === taskId);
            currentTask = task;
            document.getElementById('task-modal-title').textContent = 'Aufgabe bearbeiten';
            fillModal(task);
        } else {
            currentTask = null;
            document.getElementById('task-modal-title').textContent = 'Neue Aufgabe';
            resetModal();
        }
    };

    window.closeTaskModal = function () {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            modal.classList.add('hidden');
        }
    };

    function fillModal(task) {
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-status').value = task.status || 'open';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-project').value = task.project_id || '';
        document.getElementById('task-deadline').value = task.end_date ? task.end_date.split('T')[0] : '';

        renderSubtasks(task.subtasks || []);
        renderComments(task.id);
        renderAssignedUsers(task.assigned_to || []);
    }

    function resetModal() {
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-status').value = 'open';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-project').value = '';
        document.getElementById('task-deadline').value = '';
        document.getElementById('subtask-list').innerHTML = '';
        document.getElementById('comment-list').innerHTML = '';
        window.tempAssigned = [];
        window.tempSubtasks = [];
        renderSubtasks([]);
        renderAssignedUsers([]);
    }

    window.saveTask = async function () {
        const title = document.getElementById('task-title').value.trim();
        if (!title) {
            alert('Bitte einen Titel eingeben.');
            return;
        }

        const taskData = {
            title: title,
            description: document.getElementById('task-description').value,
            status: document.getElementById('task-status').value,
            priority: document.getElementById('task-priority').value,
            project_id: document.getElementById('task-project').value || null,
            end_date: document.getElementById('task-deadline').value || null,
            updated_at: new Date().toISOString()
        };

        try {
            let error;
            if (currentTask) {
                const res = await window.supabaseClient.from('tasks').update(taskData).eq('id', currentTask.id);
                error = res.error;
            } else {
                taskData.created_by = window.activeUser?.id;
                taskData.assigned_to = window.tempAssigned || [];
                const { data, error: insertError } = await window.supabaseClient.from('tasks').insert([taskData]).select();
                error = insertError;

                if (!error && data && data[0] && window.tempSubtasks && window.tempSubtasks.length > 0) {
                    const taskId = data[0].id;
                    const subtasksToInsert = window.tempSubtasks.map(st => ({
                        task_id: taskId,
                        title: st.title,
                        status: st.status || 'open'
                    }));
                    const { error: stError } = await window.supabaseClient.from('subtasks').insert(subtasksToInsert);
                    if (stError) throw stError;
                }
            }

            if (error) {
                console.error('Task Save Error:', error);
                throw error;
            }

            closeTaskModal();
            fetchTasks();
        } catch (err) {
            console.error('Error in saveTask:', err);
            const msg = err.message || err.details || 'Unbekannter Fehler';
            alert('Fehler beim Speichern: ' + msg);
        }
    };

    // ==========================================
    // SUBTASKS
    // ==========================================
    window.addSubtask = async function () {
        const input = document.getElementById('new-subtask-input');
        const title = input.value.trim();
        if (!title) return;

        if (currentTask) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('subtasks')
                    .insert([{ task_id: currentTask.id, title: title }])
                    .select();

                if (error) throw error;
                input.value = '';
                input.focus();

                if (!currentTask.subtasks) currentTask.subtasks = [];
                currentTask.subtasks.push(data[0]);
                renderSubtasks(currentTask.subtasks);
                fetchTasks();
            } catch (err) {
                console.error('Error adding subtask:', err);
            }
        } else {
            // Temp subtask for new task
            if (!window.tempSubtasks) window.tempSubtasks = [];
            window.tempSubtasks.push({
                id: 'temp-' + Date.now(),
                title: title,
                status: 'open'
            });
            input.value = '';
            input.focus();
            renderSubtasks(window.tempSubtasks);
        }
    };

    function renderSubtasks(subtasks) {
        const container = document.getElementById('subtask-list');
        if (!container) return;
        container.innerHTML = '';
        subtasks.forEach(st => {
            const div = document.createElement('div');
            div.className = 'subtask-item';
            div.innerHTML = `
                <input type="checkbox" ${st.status === 'completed' ? 'checked' : ''} onchange="toggleSubtask('${st.id}', this.checked)">
                <span class="${st.status === 'completed' ? 'done' : ''}">${st.title}</span>
                <button class="delete-st" onclick="deleteSubtask('${st.id}')">&times;</button>
            `;
            container.appendChild(div);
        });
    }

    window.toggleSubtask = async function (id, isChecked) {
        const status = isChecked ? 'completed' : 'open';

        if (id.startsWith('temp-')) {
            const st = window.tempSubtasks.find(s => s.id === id);
            if (st) st.status = status;
            renderSubtasks(window.tempSubtasks);
            return;
        }

        try {
            await window.supabaseClient.from('subtasks').update({ status }).eq('id', id);

            // Local state update
            if (currentTask && currentTask.subtasks) {
                const st = currentTask.subtasks.find(s => s.id === id);
                if (st) st.status = status;
                renderSubtasks(currentTask.subtasks);
            }
            fetchTasks();
        } catch (err) {
            console.error(err);
        }
    };

    window.deleteSubtask = async function (id) {
        if (!confirm('Unteraufgabe löschen?')) return;

        if (id.startsWith('temp-')) {
            window.tempSubtasks = window.tempSubtasks.filter(s => s.id !== id);
            renderSubtasks(window.tempSubtasks);
            return;
        }

        try {
            await window.supabaseClient.from('subtasks').delete().eq('id', id);

            if (currentTask && currentTask.subtasks) {
                currentTask.subtasks = currentTask.subtasks.filter(s => s.id !== id);
                renderSubtasks(currentTask.subtasks);
            }
            fetchTasks();
        } catch (err) {
            console.error(err);
        }
    };

    // ==========================================
    // COMMENTS
    // ==========================================
    window.addComment = async function () {
        const input = document.getElementById('new-comment-input');
        const content = input.value.trim();
        if (!content || !currentTask) return;

        try {
            const { error } = await window.supabaseClient
                .from('task_comments')
                .insert([{
                    task_id: currentTask.id,
                    user_id: window.activeUser?.id,
                    content: content
                }]);

            if (error) throw error;
            input.value = '';
            renderComments(currentTask.id);
        } catch (err) {
            console.error('Error adding comment:', err);
        }
    };

    async function renderComments(taskId) {
        const container = document.getElementById('comment-list');
        if (!container) return;

        try {
            const { data, error } = await window.supabaseClient
                .from('task_comments')
                .select(`
                    *,
                    users(name)
                `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            container.innerHTML = '';
            data.forEach(comment => {
                const div = document.createElement('div');
                div.className = 'comment-item';
                const date = new Date(comment.created_at).toLocaleString();
                div.innerHTML = `
                    <div class="comment-meta">
                        <span class="comment-author">${comment.users?.name || 'Unbekannt'}</span>
                        <span class="comment-date">${date}</span>
                    </div>
                    <div class="comment-text">${comment.content}</div>
                `;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        } catch (err) {
            console.error(err);
        }
    }

    // ==========================================
    // ASSIGNMENTS
    // ==========================================
    function renderAssignedUsers(assignedIds) {
        const container = document.getElementById('task-user-options');
        const label = document.getElementById('task-assigned-users-label');
        if (!container || !label) return;

        container.innerHTML = '';
        if (window.userList && window.userList.length > 0) {
            window.userList.forEach(user => {
                const isChecked = assignedIds.includes(user.id);
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.gap = '12px';
                li.style.padding = '10px 15px';
                li.style.cursor = 'pointer';

                li.innerHTML = `
                    <input type="checkbox" id="user-cb-${user.id}" ${isChecked ? 'checked' : ''} style="pointer-events: none;">
                    <label style="margin: 0; cursor: pointer; flex: 1;">${user.name}</label>
                `;

                li.onclick = (e) => {
                    e.stopPropagation();
                    toggleUserAssignmentCheckbox(user.id);
                };
                container.appendChild(li);
            });

            // Update label
            const assignedNames = assignedIds.map(uid => window.userList.find(u => u.id === uid)?.name).filter(Boolean);
            label.textContent = assignedNames.length > 0 ? assignedNames.join(', ') : 'Niemand zugewiesen';
        } else {
            container.innerHTML = '<li style="padding: 10px; opacity: 0.5;">Keine Benutzer gefunden</li>';
        }
    }

    async function toggleUserAssignmentCheckbox(userId) {
        const cb = document.getElementById(`user-cb-${userId}`);
        if (!cb) return;

        // Note: Task modal handles temporary selection IF it's a new task, 
        // OR updates database directly if editing.
        // For simplicity, let's keep direct updates if currentTask exists.

        let currentAssigned = currentTask ? (currentTask.assigned_to || []) : (window.tempAssigned || []);

        if (currentAssigned.includes(userId)) {
            currentAssigned = currentAssigned.filter(id => id !== userId);
        } else {
            currentAssigned.push(userId);
        }

        if (currentTask) {
            try {
                const { error } = await window.supabaseClient
                    .from('tasks')
                    .update({ assigned_to: currentAssigned })
                    .eq('id', currentTask.id);

                if (error) throw error;
                currentTask.assigned_to = currentAssigned;
                renderAssignedUsers(currentAssigned);
                fetchTasks();
            } catch (err) {
                console.error(err);
                cb.checked = !cb.checked; // Rollback
            }
        } else {
            // New task handling
            window.tempAssigned = currentAssigned;
            renderAssignedUsers(currentAssigned);
            cb.checked = currentAssigned.includes(userId);
        }
    }

    // ==========================================
    // HELPERS & VIEW CONTROLS
    // ==========================================
    window.switchTaskView = function (view) {
        viewMode = view;
        document.querySelectorAll('.calendar-tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-view-${view}`);
        if (activeBtn) activeBtn.classList.add('active');
        renderTasks();
    };

    function formatStatus(status) {
        const map = { 'open': 'Offen', 'in_progress': 'In Arbeit', 'completed': 'Fertig', 'on_hold': 'Wartend' };
        return map[status] || status;
    }

    function formatPriority(p) {
        const map = { 'low': 'Niedrig', 'medium': 'Mittel', 'high': 'Hoch', 'critical': 'Kritisch' };
        return map[p] || p;
    }

    function renderAvatars(assignedTo) {
        if (!assignedTo || assignedTo.length === 0) return '<span class="avatar-placeholder">?</span>';

        return assignedTo.map(uid => {
            const user = window.userList?.find(u => u.id === uid);
            const initials = user ? user.name.substring(0, 2).toUpperCase() : '?';
            return `<span class="avatar-mini" title="${user?.name || 'Unbekannt'}">${initials}</span>`;
        }).join('');
    }

    function renderProgress(task) {
        const total = task.subtasks?.length || 0;
        const done = task.subtasks?.filter(s => s.status === 'completed').length || 0;
        const pct = total > 0 ? (done / total) * 100 : 0;
        return `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div class="progress-bar-bg" style="width: 60px; height: 6px;">
                    <div class="progress-bar-fg" style="width: ${pct}%"></div>
                </div>
                <span style="font-size: 0.8rem; opacity: 0.6;">${done}/${total}</span>
            </div>
        `;
    }

    function populateProjectFilters(projects) {
        // Filter menu
        const menu = document.getElementById('task-project-filter-options');
        if (menu) {
            menu.innerHTML = '<li onclick="window.filterTasksByProject(\'all\')" class="selected">Alle Projekte</li>';
            projects.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p.name;
                li.onclick = () => window.filterTasksByProject(p.id);
                menu.appendChild(li);
            });
        }

        // Modal dropdown
        const select = document.getElementById('task-project');
        if (select) {
            select.innerHTML = '<option value="">Kein Projekt</option>';
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                select.appendChild(opt);
            });
        }
    }

    window.filterTasksByProject = function (pid) {
        filters.project = pid;
        let name = 'Alle Projekte';
        if (pid !== 'all') {
            const proj = allTasks.find(t => t.project_id === pid)?.projects;
            name = proj ? proj.name : 'Projekt';
        }
        const label = document.getElementById('task-current-project-name');
        if (label) label.textContent = name;

        // Update selected class in menu
        document.querySelectorAll('#task-project-filter-options li').forEach(li => {
            li.classList.toggle('selected', (pid === 'all' && li.textContent.includes('Alle')) || (li.textContent === name));
        });

        renderTasks();
    };

    window.filterTasksByPriority = function (p) {
        filters.priority = p;
        const name = p === 'all' ? 'Alle Prioritäten' : formatPriority(p);
        const label = document.getElementById('task-current-priority-name');
        if (label) label.textContent = name;

        document.querySelectorAll('#task-priority-filter-options li').forEach(li => {
            li.classList.toggle('selected', (p === 'all' && li.textContent.includes('Alle')) || (li.textContent === name));
        });

        renderTasks();
    };

    // ==========================================
    // DRAG & DROP
    // ==========================================
    function setupDragAndDrop() {
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => {
            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                col.classList.add('drag-over');
            });

            col.addEventListener('dragleave', () => {
                col.classList.remove('drag-over');
            });

            col.addEventListener('drop', async (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = col.dataset.status;

                // Optimistic UI update
                const task = allTasks.find(t => t.id === taskId);
                if (task && task.status !== newStatus) {
                    const oldStatus = task.status;
                    task.status = newStatus;
                    renderTasks();

                    // Supabase update
                    try {
                        const { error } = await window.supabaseClient.from('tasks').update({ status: newStatus }).eq('id', taskId);
                        if (error) throw error;
                    } catch (err) {
                        console.error('Drag drop save error:', err);
                        task.status = oldStatus;
                        fetchTasks(); // Rollback if failed
                    }
                }
            });
        });
    }


})();
