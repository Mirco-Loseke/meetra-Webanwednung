// ==========================================
// PROTOCOLS MODULE
// ==========================================
// Handles intake and acceptance protocols with custom checkpoints,
// photo uploads, edit history, and PDF generation

(function () {
    'use strict';

    console.log('Loading protocols module...');

    // ==========================================
    // GLOBAL STATE
    // ==========================================
    let currentProtocol = null;
    let currentProtocolType = null; // 'intake' or 'acceptance'
    let protocolPhotos = [];
    let customCheckpoints = [];

    // ==========================================
    // MODAL CREATION
    // ==========================================
    function createProtocolModal() {
        // Remove existing modal if present
        const existing = document.getElementById('protocol-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'protocol-modal-overlay';
        overlay.className = 'protocol-modal-overlay';

        overlay.innerHTML = `
            <div class="protocol-modal">
                <div class="protocol-modal-header">
                    <div>
                        <h2 id="protocol-modal-title"></h2>
                        <div id="protocol-status-badge" style="margin-top: 0.75rem;"></div>
                    </div>
                    <button onclick="window.closeProtocolModal()" class="sidebar-user-profile" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid var(--glass-border);
                        color: #fff;
                        width: 44px;
                        height: 44px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    " onmouseover="this.style.transform='rotate(90deg) scale(1.1)'; this.style.background='rgba(255, 100, 100, 0.1)';" onmouseout="this.style.transform='rotate(0deg) scale(1)'; this.style.background='rgba(255, 255, 255, 0.05)';">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="protocol-modal-content">
                    <!-- Machine Title (Read-only) -->
                    <div style="margin-bottom: 2.5rem;">
                        <span class="protocol-section-title">📦 Maschine</span>
                        <input type="text" id="protocol-machine-title" readonly class="glass-form-input" style="opacity: 0.7; font-weight: 600;">
                    </div>

                    <!-- Predefined Checkpoints -->
                    <div id="predefined-checkpoints-section" style="margin-bottom: 3rem;">
                        <h3 class="protocol-section-title">🔍 Vordefinierte Prüfpunkte</h3>
                        <div id="predefined-checkpoints-list"></div>
                    </div>

                    <!-- Custom Checkpoints -->
                    <div id="custom-checkpoints-section" style="margin-bottom: 3rem;">
                        <h3 class="protocol-section-title">➕ Zusätzliche Prüfpunkte</h3>
                        <div id="custom-checkpoints-list"></div>
                        <div id="add-checkpoint-form" style="display: none; margin-top: 1.5rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.03); border-radius: 20px; border: 1px solid var(--glass-border);">
                            <input type="text" id="new-checkpoint-description" class="glass-form-input" placeholder="Beschreibung des Prüfpunkts" style="margin-bottom: 1.25rem;">
                            <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; padding-left: 0.5rem;">
                                <label style="color: rgba(255, 255, 255, 0.6); font-size: 0.95rem; font-weight: 600;">Ergebnis:</label>
                                <label class="protocol-checkbox-label yes">
                                    <input type="radio" name="new-checkpoint-result" value="true" style="width: 20px; height: 20px;">
                                    <span>Ja</span>
                                </label>
                                <label class="protocol-checkbox-label no">
                                    <input type="radio" name="new-checkpoint-result" value="false" style="width: 20px; height: 20px;">
                                    <span>Nein</span>
                                </label>
                            </div>
                            <div style="display: flex; gap: 1rem;">
                                <button onclick="window.saveNewCheckpoint()" class="btn-primary" style="flex: 2; border-radius: 14px;">Hinzufügen</button>
                                <button onclick="window.cancelNewCheckpoint()" class="btn-secondary" style="flex: 1; border-radius: 14px;">Abbrechen</button>
                            </div>
                        </div>
                        <button onclick="window.showAddCheckpointForm()" id="add-checkpoint-btn" class="report-type-btn compact" style="margin-top:0.5rem; width: auto; background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>Prüfpunkt hinzufügen</span>
                        </button>
                    </div>

                    <!-- Free Text Fields -->
                    <div id="text-fields-section" style="margin-bottom: 3rem;">
                        <h3 class="protocol-section-title">ℹ️ Zusätzliche Informationen</h3>
                        <div id="protocol-text-fields"></div>
                    </div>

                    <!-- Photos -->
                    <div id="photos-section" style="margin-bottom: 3rem;">
                        <h3 class="protocol-section-title">📸 Fotos</h3>
                        <div id="protocol-photos-grid" class="protocol-photo-grid"></div>
                        <input type="file" id="protocol-photo-input" accept="image/*" multiple style="display: none;">
                        <button onclick="document.getElementById('protocol-photo-input').click()" class="report-type-btn compact" style="width: auto; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>Fotos hochladen</span>
                        </button>
                    </div>

                    <!-- Edit History -->
                    <div id="edit-history-section" style="display: none; margin-bottom: 2rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.02); border-radius: 20px; border: 1px solid var(--glass-border);">
                        <h3 class="protocol-section-title">🕒 Bearbeitungshistorie</h3>
                        <div id="edit-history-list"></div>
                    </div>
                </div>

                <div class="protocol-modal-actions">
                    <button onclick="window.closeProtocolModal()" class="btn-secondary" style="flex: 1; border-radius: 16px; min-height: 54px; font-weight: 700;">Abbrechen</button>
                    <button onclick="window.saveProtocol()" class="btn-primary" style="flex: 1; border-radius: 16px; min-height: 54px; font-weight: 700;">Speichern</button>
                    <button onclick="window.completeProtocol()" id="complete-protocol-btn" class="btn-primary" style="flex: 1.5; background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.3); color: #10b981; border-radius: 16px; min-height: 54px; font-weight: 800;">Abschließen</button>
                    <button onclick="window.generateProtocolPDF()" id="generate-pdf-btn" style="display: none; flex: 1.5; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 16px; min-height: 54px; font-weight: 800; cursor: pointer; font-family: 'Inter', sans-serif;">PDF erstellen</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add photo input change listener
        document.getElementById('protocol-photo-input').addEventListener('change', handlePhotoUpload);

        return overlay;
    }

    // ==========================================
    // MODAL FUNCTIONS
    // ==========================================
    window.openIntakeProtocol = async function (machineId, protocolId = null) {
        currentProtocolType = 'intake';
        await openProtocolModal(machineId, protocolId, 'intake');
    };

    window.openAcceptanceProtocol = async function (machineId, protocolId = null) {
        currentProtocolType = 'acceptance';
        await openProtocolModal(machineId, protocolId, 'acceptance');
    };

    async function openProtocolModal(machineId, protocolId, type) {
        const modal = createProtocolModal();
        const overlay = document.getElementById('protocol-modal-overlay');

        // Get machine data
        const machine = window.machineList.find(m => m.id === machineId);
        if (!machine) {
            alert('Maschine nicht gefunden');
            return;
        }

        // Generate title from machine data
        const machineTitle = [
            machine.manufacturer,
            machine.name,
            machine.serial ? `#${machine.serial}` : null,
            machine.year ? `(${machine.year})` : null
        ].filter(Boolean).join(' ');

        // Set modal title
        const modalTitle = type === 'intake' ? '📋 Eingangsprotokoll' : '✅ Abnahmeprotokoll';
        document.getElementById('protocol-modal-title').textContent = modalTitle;
        document.getElementById('protocol-machine-title').value = machineTitle;

        // Load or create protocol
        if (protocolId) {
            await loadProtocol(protocolId, type);
        } else {
            // New protocol
            currentProtocol = {
                machine_id: machineId,
                title: machineTitle,
                status: 'draft',
                predefined_checkpoints: type === 'intake' ? getIntakeCheckpoints() : getAcceptanceCheckpoints()
            };
            customCheckpoints = [];
            protocolPhotos = [];
        }

        // Render predefined checkpoints
        renderPredefinedCheckpoints();

        // Render custom checkpoints
        renderCustomCheckpoints();

        // Render text fields
        renderTextFields(type);

        // Render photos
        renderPhotos();

        // Render edit history if exists
        if (currentProtocol.completed_at || (currentProtocol.edit_history && currentProtocol.edit_history.length > 0)) {
            renderEditHistory();
        }

        // Update status badge
        updateStatusBadge();

        // Show/hide PDF button
        if (currentProtocol.status === 'completed') {
            document.getElementById('generate-pdf-btn').style.display = 'block';
            document.getElementById('complete-protocol-btn').style.display = 'none';
        }

        // Show modal
        overlay.style.display = 'flex';
    }

    window.closeProtocolModal = function () {
        const overlay = document.getElementById('protocol-modal-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.remove();
        }
        currentProtocol = null;
        currentProtocolType = null;
        customCheckpoints = [];
        protocolPhotos = [];
    };

    // ==========================================
    // CHECKPOINT FUNCTIONS
    // ==========================================
    function getIntakeCheckpoints() {
        return {
            machine_clean: null,
            machine_dirty: null,
            visible_damage: null,
            accessories_complete: null,
            machine_starts: null,
            emergency_stop_works: null,
            display_ok: null,
            error_messages_present: null,
            protective_covers_present: null,
            cables_undamaged: null,
            plug_ok: null
        };
    }

    function getAcceptanceCheckpoints() {
        return {
            test_run_ok: null,
            electrical_ok: null,
            safety_ok: null,
            functionality_ok: null,
            visual_inspection_ok: null
        };
    }

    function getCheckpointLabel(key, type) {
        const intakeLabels = {
            machine_clean: 'Maschine sauber',
            machine_dirty: 'Maschine verschmutzt',
            visible_damage: 'Äußere Beschädigungen sichtbar',
            accessories_complete: 'Zubehör vollständig',
            machine_starts: 'Maschine startet',
            emergency_stop_works: 'Not-Aus funktioniert',
            display_ok: 'Anzeige / Display ok',
            error_messages_present: 'Fehlermeldungen vorhanden',
            protective_covers_present: 'Schutzhauben vorhanden',
            cables_undamaged: 'Kabel unbeschädigt',
            plug_ok: 'Stecker ok'
        };

        const acceptanceLabels = {
            test_run_ok: 'Probelauf erfolgreich',
            electrical_ok: 'Elektrik in Ordnung',
            safety_ok: 'Sicherheit gewährleistet',
            functionality_ok: 'Funktionalität geprüft',
            visual_inspection_ok: 'Sichtprüfung bestanden'
        };

        return type === 'intake' ? intakeLabels[key] : acceptanceLabels[key];
    }

    function renderPredefinedCheckpoints() {
        const container = document.getElementById('predefined-checkpoints-list');
        container.innerHTML = '';

        const checkpoints = currentProtocol.predefined_checkpoints;
        Object.keys(checkpoints).forEach(key => {
            const value = checkpoints[key];
            const label = getCheckpointLabel(key, currentProtocolType);

            const row = document.createElement('div');
            row.className = 'protocol-checkpoint-row';

            row.innerHTML = `
                <span style="color: #fff; font-weight: 600; font-size: 1rem;">${label}</span>
                <div style="display: flex; gap: 0.75rem;">
                    <label class="protocol-checkbox-label yes">
                        <input type="radio" name="checkpoint-${key}" value="true" ${value === true ? 'checked' : ''} onchange="window.updatePredefinedCheckpoint('${key}', true)" style="width: 20px; height: 20px;">
                        <span>Ja</span>
                    </label>
                    <label class="protocol-checkbox-label no">
                        <input type="radio" name="checkpoint-${key}" value="false" ${value === false ? 'checked' : ''} onchange="window.updatePredefinedCheckpoint('${key}', false)" style="width: 20px; height: 20px;">
                        <span>Nein</span>
                    </label>
                </div>
            `;

            container.appendChild(row);
        });
    }

    window.updatePredefinedCheckpoint = function (key, value) {
        currentProtocol.predefined_checkpoints[key] = value;
    };

    window.showAddCheckpointForm = function () {
        document.getElementById('add-checkpoint-form').style.display = 'block';
        document.getElementById('add-checkpoint-btn').style.display = 'none';
        document.getElementById('new-checkpoint-description').focus();
    };

    window.cancelNewCheckpoint = function () {
        document.getElementById('add-checkpoint-form').style.display = 'none';
        document.getElementById('add-checkpoint-btn').style.display = 'flex';
        document.getElementById('new-checkpoint-description').value = '';
        document.querySelectorAll('input[name="new-checkpoint-result"]').forEach(r => r.checked = false);
    };

    window.saveNewCheckpoint = function () {
        const description = document.getElementById('new-checkpoint-description').value.trim();
        const resultRadio = document.querySelector('input[name="new-checkpoint-result"]:checked');

        if (!description) {
            alert('Bitte geben Sie eine Beschreibung ein');
            return;
        }

        const result = resultRadio ? (resultRadio.value === 'true') : null;

        customCheckpoints.push({
            id: Date.now(), // Temporary ID for new checkpoints
            description,
            result,
            sort_order: customCheckpoints.length
        });

        renderCustomCheckpoints();
        window.cancelNewCheckpoint();
    };

    function renderCustomCheckpoints() {
        const container = document.getElementById('custom-checkpoints-list');
        container.innerHTML = '';

        customCheckpoints.forEach((checkpoint, index) => {
            const row = document.createElement('div');
            row.className = 'protocol-checkpoint-row';
            row.style.background = 'rgba(59, 130, 246, 0.03)';
            row.style.borderColor = 'rgba(59, 130, 246, 0.1)';

            row.innerHTML = `
                <span style="color: #fff; font-weight: 600; font-size: 1rem;">${checkpoint.description}</span>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="display: flex; gap: 0.75rem;">
                        <label class="protocol-checkbox-label yes">
                            <input type="radio" name="custom-checkpoint-${checkpoint.id}" value="true" ${checkpoint.result === true ? 'checked' : ''} onchange="window.updateCustomCheckpoint(${index}, true)" style="width: 20px; height: 20px;">
                            <span>Ja</span>
                        </label>
                        <label class="protocol-checkbox-label no">
                            <input type="radio" name="custom-checkpoint-${checkpoint.id}" value="false" ${checkpoint.result === false ? 'checked' : ''} onchange="window.updateCustomCheckpoint(${index}, false)" style="width: 20px; height: 20px;">
                            <span>Nein</span>
                        </label>
                    </div>
                    <button onclick="window.deleteCustomCheckpoint(${index})" style="
                        background: rgba(239, 68, 68, 0.1);
                        border: 1px solid rgba(239, 68, 68, 0.2);
                        color: #ef4444;
                        width: 36px;
                        height: 36px;
                        border-radius: 10px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            container.appendChild(row);
        });
    }

    window.updateCustomCheckpoint = function (index, value) {
        customCheckpoints[index].result = value;
    };

    window.deleteCustomCheckpoint = function (index) {
        if (confirm('Prüfpunkt wirklich löschen?')) {
            customCheckpoints.splice(index, 1);
            renderCustomCheckpoints();
        }
    };

    // ==========================================
    // TEXT FIELDS
    // ==========================================
    function renderTextFields(type) {
        const container = document.getElementById('protocol-text-fields');
        container.innerHTML = '';

        if (type === 'intake') {
            container.innerHTML = `
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.75rem; color: rgba(255, 255, 255, 0.6); font-weight: 700; font-size: 0.95rem;">🚩 FEHLERBESCHREIBUNG / ARBEITSAUFTRAG</label>
                    <textarea id="protocol-error-description" rows="5" class="glass-form-input" placeholder="Detaillierte Fehlerbeschreibung eingeben...">${currentProtocol.error_description || ''}</textarea>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.75rem; color: rgba(255, 255, 255, 0.6); font-weight: 700; font-size: 0.95rem;">🛠️ DURCHGEFÜHRTE ARBEITEN</label>
                    <textarea id="protocol-work-performed" rows="4" class="glass-form-input" placeholder="Zusammenfassung der Arbeiten...">${currentProtocol.work_performed || ''}</textarea>
                </div>
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.75rem; color: rgba(255, 255, 255, 0.6); font-weight: 700; font-size: 0.95rem;">⚙️ GETAUSCHTE TEILE</label>
                    <textarea id="protocol-parts-replaced" rows="3" class="glass-form-input" placeholder="Liste der Ersatzteile...">${currentProtocol.parts_replaced || ''}</textarea>
                </div>
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.75rem; color: rgba(255, 255, 255, 0.6); font-weight: 700; font-size: 0.95rem;">📐 EINSTELLUNGEN / KALIBRIERUNGEN</label>
                    <textarea id="protocol-settings-calibrations" rows="3" class="glass-form-input" placeholder="Vorgenommene Einstellungen...">${currentProtocol.settings_calibrations || ''}</textarea>
                </div>
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.75rem; color: rgba(255, 255, 255, 0.6); font-weight: 700; font-size: 0.95rem;">⚠️ RESTMÄNGEL</label>
                    <textarea id="protocol-remaining-defects" rows="3" class="glass-form-input" placeholder="Bekannte Restmängel...">${currentProtocol.remaining_defects || ''}</textarea>
                </div>
            `;
        }
    }

    // ==========================================
    // PHOTO FUNCTIONS
    // ==========================================
    async function handlePhotoUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const uploadBtn = event.target.previousElementSibling;
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Wird hochgeladen...';
        uploadBtn.disabled = true;

        try {
            for (let file of files) {
                const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const fileName = `Protokolle / ${Date.now()} -${cleanName} `;

                const { data, error } = await window.supabaseClient
                    .storage
                    .from('meetra-storage')
                    .upload(fileName, file);

                if (error) throw error;

                const { data: urlData } = window.supabaseClient
                    .storage
                    .from('meetra-storage')
                    .getPublicUrl(fileName);

                protocolPhotos.push({
                    id: Date.now() + Math.random(), // Temporary ID
                    file_name: fileName,
                    file_url: urlData.publicUrl,
                    file_size: file.size
                });
            }

            renderPhotos();
            event.target.value = ''; // Reset input
        } catch (err) {
            console.error('Photo upload error:', err);
            alert('Fehler beim Hochladen: ' + err.message);
        } finally {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
    }

    function renderPhotos() {
        const container = document.getElementById('protocol-photos-grid');
        container.innerHTML = '';

        protocolPhotos.forEach((photo, index) => {
            const photoCard = document.createElement('div');
            photoCard.className = 'protocol-photo-card';

            photoCard.innerHTML = `
                <img src="${photo.file_url}" loading="lazy">
                <button onclick="window.deleteProtocolPhoto(${index})" class="protocol-photo-remove">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;

            container.appendChild(photoCard);
        });
    }

    window.deleteProtocolPhoto = function (index) {
        if (confirm('Foto wirklich löschen?')) {
            protocolPhotos.splice(index, 1);
            renderPhotos();
        }
    };

    // ==========================================
    // SAVE & COMPLETE
    // ==========================================
    window.saveProtocol = async function () {
        try {
            // Collect text field data
            if (currentProtocolType === 'intake') {
                currentProtocol.error_description = document.getElementById('protocol-error-description')?.value || '';
            } else {
                currentProtocol.work_performed = document.getElementById('protocol-work-performed')?.value || '';
                currentProtocol.parts_replaced = document.getElementById('protocol-parts-replaced')?.value || '';
                currentProtocol.settings_calibrations = document.getElementById('protocol-settings-calibrations')?.value || '';
                currentProtocol.remaining_defects = document.getElementById('protocol-remaining-defects')?.value || '';
            }

            // Add edit history entry
            if (!currentProtocol.edit_history) currentProtocol.edit_history = [];
            currentProtocol.edit_history.push({
                edited_at: new Date().toISOString(),
                edited_by: window.activeUser?.id || null,
                edited_by_name: window.activeUser?.name || 'Unbekannt'
            });

            currentProtocol.updated_at = new Date().toISOString();

            // Save to database
            const tableName = currentProtocolType === 'intake' ? 'intake_protocols' : 'acceptance_protocols';

            let result;
            if (currentProtocol.id) {
                // Update existing
                result = await window.supabaseClient
                    .from(tableName)
                    .update(currentProtocol)
                    .eq('id', currentProtocol.id);
            } else {
                // Insert new
                currentProtocol.created_by = window.activeUser?.id || null;
                result = await window.supabaseClient
                    .from(tableName)
                    .insert([currentProtocol])
                    .select();

                if (result.data && result.data[0]) {
                    currentProtocol.id = result.data[0].id;
                }
            }

            if (result.error) throw result.error;

            // Save custom checkpoints
            await saveCustomCheckpoints();

            // Save photos
            await saveProtocolPhotos();

            // Refresh protocols list if view is active
            if (typeof window.fetchProtocols === 'function') {
                window.fetchProtocols();
            }

            alert('Protokoll erfolgreich gespeichert!');
        } catch (err) {
            console.error('Save protocol error:', err);
            alert('Fehler beim Speichern: ' + err.message);
        }
    };

    window.completeProtocol = async function () {
        if (!confirm('Protokoll abschließen? Nach dem Abschluss können Sie weiterhin Änderungen vornehmen.')) return;

        currentProtocol.status = 'completed';
        currentProtocol.completed_at = new Date().toISOString();
        currentProtocol.completed_by = window.activeUser?.id || null;

        await window.saveProtocol();

        // Update UI
        updateStatusBadge();
        document.getElementById('generate-pdf-btn').style.display = 'block';
        document.getElementById('complete-protocol-btn').style.display = 'none';
        renderEditHistory();
    };

    async function saveCustomCheckpoints() {
        if (!currentProtocol.id) return;

        // Delete existing custom checkpoints for this protocol
        await window.supabaseClient
            .from('protocol_checkpoints')
            .delete()
            .eq('protocol_id', currentProtocol.id)
            .eq('protocol_type', currentProtocolType);

        // Insert new ones
        if (customCheckpoints.length > 0) {
            const checkpointsToSave = customCheckpoints.map(cp => ({
                protocol_id: currentProtocol.id,
                protocol_type: currentProtocolType,
                description: cp.description,
                result: cp.result,
                sort_order: cp.sort_order,
                created_by: window.activeUser?.id || null
            }));

            await window.supabaseClient
                .from('protocol_checkpoints')
                .insert(checkpointsToSave);
        }
    }

    async function saveProtocolPhotos() {
        if (!currentProtocol.id) return;

        // Delete existing photos for this protocol
        await window.supabaseClient
            .from('protocol_photos')
            .delete()
            .eq('protocol_id', currentProtocol.id)
            .eq('protocol_type', currentProtocolType);

        // Insert new ones
        if (protocolPhotos.length > 0) {
            const photosToSave = protocolPhotos.map(photo => ({
                protocol_id: currentProtocol.id,
                protocol_type: currentProtocolType,
                file_name: photo.file_name,
                file_url: photo.file_url,
                file_size: photo.file_size,
                uploaded_by: window.activeUser?.id || null
            }));

            await window.supabaseClient
                .from('protocol_photos')
                .insert(photosToSave);
        }
    }

    async function loadProtocol(protocolId, type) {
        const tableName = type === 'intake' ? 'intake_protocols' : 'acceptance_protocols';

        const { data, error } = await window.supabaseClient
            .from(tableName)
            .select('*')
            .eq('id', protocolId)
            .single();

        if (error) {
            console.error('Load protocol error:', error);
            alert('Fehler beim Laden: ' + error.message);
            return;
        }

        currentProtocol = data;

        // Load custom checkpoints
        const { data: checkpointsData } = await window.supabaseClient
            .from('protocol_checkpoints')
            .select('*')
            .eq('protocol_id', protocolId)
            .eq('protocol_type', type)
            .order('sort_order');

        customCheckpoints = checkpointsData || [];

        // Load photos
        const { data: photosData } = await window.supabaseClient
            .from('protocol_photos')
            .select('*')
            .eq('protocol_id', protocolId)
            .eq('protocol_type', type);

        protocolPhotos = photosData || [];
    }

    // ==========================================
    // UI HELPERS
    // ==========================================
    function updateStatusBadge() {
        const container = document.getElementById('protocol-status-badge');
        if (!container) return;

        const status = currentProtocol.status || 'draft';
        const isDraft = status === 'draft';

        container.innerHTML = `
            <div class="protocol-status-badge ${isDraft ? 'draft' : 'completed'}">
                ${isDraft ? `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                    Entwurf
                ` : `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Abgeschlossen
                `}
            </div>
        `;
    }

    function renderEditHistory() {
        const section = document.getElementById('edit-history-section');
        const list = document.getElementById('edit-history-list');

        section.style.display = 'block';
        list.innerHTML = '';

        // Completion info
        if (currentProtocol.completed_at) {
            const completedDate = new Date(currentProtocol.completed_at).toLocaleString('de-DE');
            const completedUser = window.userList?.find(u => u.id === currentProtocol.completed_by);
            const completedUserName = completedUser?.name || 'Unbekannt';

            list.innerHTML += `
                <div style="padding: 1.25rem; background: rgba(16, 185, 129, 0.05); border-left: 4px solid #10b981; border-radius: 12px; margin-bottom: 1rem; backdrop-filter: blur(8px);">
                    <div style="color: #10b981; font-weight: 800; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        STATUS: ABGESCHLOSSEN
                    </div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.95rem; font-weight: 500;">
                        ${completedDate} von ${completedUserName}
                    </div>
                </div>
            `;
        }

        // Edit history
        if (currentProtocol.edit_history && currentProtocol.edit_history.length > 0) {
            currentProtocol.edit_history.reverse().forEach(edit => {
                const editDate = new Date(edit.edited_at).toLocaleString('de-DE');
                list.innerHTML += `
                    <div style="padding: 1.25rem; background: rgba(255, 255, 255, 0.02); border-left: 4px solid rgba(59, 130, 246, 0.4); border-radius: 12px; margin-bottom: 1rem; border: 1px solid rgba(255, 255, 255, 0.05); border-left-width: 4px;">
                        <div style="color: #60a5fa; font-weight: 800; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            LETZTE ÄNDERUNG
                        </div>
                        <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.95rem; font-weight: 500;">
                            ${editDate} von ${edit.edited_by_name}
                        </div>
                    </div>
                `;
            });
        }
    }

    // ==========================================
    // PDF GENERATION
    // ==========================================
    window.generateProtocolPDF = async function () {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const title = currentProtocolType === 'intake' ? 'Eingangsprotokoll' : 'Abnahmeprotokoll';
            const machineTitle = currentProtocol.title;

            // Title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(title, 20, 20);

            // Machine
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Maschine: ${machineTitle}`, 20, 30);

            // Status
            doc.text(`Status: ${currentProtocol.status === 'completed' ? 'Abgeschlossen' : 'Entwurf'}`, 20, 37);

            let yPos = 50;

            // Predefined checkpoints
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Vordefinierte Prüfpunkte', 20, yPos);
            yPos += 10;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            Object.keys(currentProtocol.predefined_checkpoints).forEach(key => {
                const label = getCheckpointLabel(key, currentProtocolType);
                const value = currentProtocol.predefined_checkpoints[key];
                const result = value === true ? 'Ja' : (value === false ? 'Nein' : 'Nicht beantwortet');
                doc.text(`${label}: ${result}`, 20, yPos);
                yPos += 6;

                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            });

            // Custom checkpoints
            if (customCheckpoints.length > 0) {
                yPos += 5;
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Zusätzliche Prüfpunkte', 20, yPos);
                yPos += 10;

                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                customCheckpoints.forEach(cp => {
                    const result = cp.result === true ? 'Ja' : (cp.result === false ? 'Nein' : 'Nicht beantwortet');
                    doc.text(`${cp.description}: ${result}`, 20, yPos);
                    yPos += 6;

                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                });
            }

            // Text fields
            yPos += 5;
            if (currentProtocolType === 'intake' && currentProtocol.error_description) {
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Fehlerbeschreibung / Arbeitsauftrag', 20, yPos);
                yPos += 10;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                const lines = doc.splitTextToSize(currentProtocol.error_description, 170);
                doc.text(lines, 20, yPos);
                yPos += lines.length * 6 + 5;
            } else if (currentProtocolType === 'acceptance') {
                if (currentProtocol.work_performed) {
                    doc.setFontSize(14);
                    doc.setFont(undefined, 'bold');
                    doc.text('Durchgeführte Arbeiten', 20, yPos);
                    yPos += 10;
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    const lines = doc.splitTextToSize(currentProtocol.work_performed, 170);
                    doc.text(lines, 20, yPos);
                    yPos += lines.length * 6 + 5;
                }

                if (currentProtocol.parts_replaced) {
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.setFontSize(14);
                    doc.setFont(undefined, 'bold');
                    doc.text('Getauschte Teile', 20, yPos);
                    yPos += 10;
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    const lines = doc.splitTextToSize(currentProtocol.parts_replaced, 170);
                    doc.text(lines, 20, yPos);
                    yPos += lines.length * 6 + 5;
                }
            }

            // Completion info
            if (currentProtocol.completed_at) {
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
                yPos += 5;
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Abschlussinformationen', 20, yPos);
                yPos += 10;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                const completedDate = new Date(currentProtocol.completed_at).toLocaleString('de-DE');
                const completedUser = window.userList?.find(u => u.id === currentProtocol.completed_by);
                doc.text(`Abgeschlossen am: ${completedDate}`, 20, yPos);
                yPos += 6;
                doc.text(`Abgeschlossen von: ${completedUser?.name || 'Unbekannt'}`, 20, yPos);
            }

            // Save PDF
            const fileName = `${title}_${machineTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            alert('PDF erfolgreich erstellt!');
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Fehler beim Erstellen des PDFs: ' + err.message);
        }
    };

    // ==========================================
    // LIST RENDERING & FILTERING
    // ==========================================
    let allLoadedProtocols = [];
    let protocolFilterType = 'all'; // 'all', 'intake', 'acceptance'
    let protocolSearchTerm = '';

    window.fetchProtocols = async function () {
        const container = document.getElementById('protocol-list-container');
        if (!container) return;

        try {
            // Fetch both types
            const [intakeRes, acceptanceRes] = await Promise.all([
                window.supabaseClient.from('intake_protocols').select('*, machines(manufacturer, name, serial, year)').order('created_at', { ascending: false }),
                window.supabaseClient.from('acceptance_protocols').select('*, machines(manufacturer, name, serial, year)').order('created_at', { ascending: false })
            ]);

            if (intakeRes.error) throw intakeRes.error;
            if (acceptanceRes.error) throw acceptanceRes.error;

            // Combine and sort
            allLoadedProtocols = [
                ...intakeRes.data.map(p => ({ ...p, type: 'intake' })),
                ...acceptanceRes.data.map(p => ({ ...p, type: 'acceptance' }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            applyFilters();
        } catch (err) {
            console.error('Error fetching protocols:', err);
            container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p style="color: #ef4444;">Fehler beim Laden: ${err.message}</p></div>`;
        }
    };

    window.handleProtocolSearch = function (query) {
        protocolSearchTerm = query.toLowerCase().trim();
        applyFilters();
    };

    window.setProtocolFilter = function (type) {
        protocolFilterType = type;

        // Update UI active state
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `filter-${type}`);
        });

        applyFilters();
    };

    function applyFilters() {
        let filtered = [...allLoadedProtocols];

        // 1. Filter by Type
        if (protocolFilterType !== 'all') {
            filtered = filtered.filter(p => p.type === protocolFilterType);
        }

        // 2. Filter by Search Term
        if (protocolSearchTerm) {
            filtered = filtered.filter(p => {
                const searchString = `${p.title} ${p.type === 'intake' ? 'Eingang' : 'Abnahme'}`.toLowerCase();
                return searchString.includes(protocolSearchTerm);
            });
        }

        renderProtocols(filtered);
    }

    function renderProtocols(protocols) {
        const container = document.getElementById('protocol-list-container');
        if (!container) return;

        if (protocols.length === 0) {
            const message = protocolSearchTerm || protocolFilterType !== 'all'
                ? 'Keine Protokolle für die aktuelle Suche/Filterung gefunden.'
                : 'Noch keine Protokolle angelegt.';

            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: rgba(255,255,255,0.02); border-radius: 24px; border: 1px dashed rgba(255,255,255,0.1);">
                    <p style="color: rgba(255,255,255,0.4); font-size: 1.1rem;">${message}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = protocols.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('de-DE');
            const typeLabel = p.type === 'intake' ? 'Eingang' : 'Abnahme';
            const statusLabel = p.status === 'completed' ? 'Abgeschlossen' : 'Entwurf';
            const statusClass = p.status === 'completed' ? 'completed' : 'draft';
            const icon = p.type === 'intake' ? '📋' : '✅';

            return `
                <div class="card" onclick="${p.type === 'intake' ? 'window.openIntakeProtocol' : 'window.openAcceptanceProtocol'}('${p.machine_id}', '${p.id}')">
                    <div class="card-content">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div style="font-size: 2rem;">${icon}</div>
                            <div class="protocol-status-badge ${statusClass}">${statusLabel}</div>
                        </div>
                        <h3 class="card-title" style="margin-bottom: 0.5rem;">${p.title}</h3>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem; margin-bottom: 1rem;">
                            ${typeLabel}sprüfung • ${date}
                        </p>
                        <div class="card-actions" style="margin-top: auto;">
                            <button class="btn-primary" style="width: 100%;">Öffnen</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Export fetch to global for view switching
    window.fetchFiles = function () {
        // Redirect legacy call if needed, or keep both
        window.fetchProtocols();
    };

    console.log('Protocols module loaded successfully');
})();
