// Enhanced renderMachines with category grouping and collapsible sections
// Wait for DOM and all scripts to load
(function () {
    'use strict';

    // Store original renderMachines if it exists
    const originalRenderMachines = window.renderMachines;

    function renderMachinesGrouped() {
        const container = document.querySelector('#machines .card-grid');
        if (!container) {
            console.warn('Machine container not found');
            return;
        }

        const catFilters = window.activeMachineCategoryFilters || ['all'];
        const conFilters = window.activeMachineContactFilters || ['all'];

        container.innerHTML = '';

        if (!window.machineList || !Array.isArray(window.machineList)) {
            console.warn('machineList not available');
            return;
        }

        const filteredMachines = window.machineList.filter(m => {
            // Category Filter
            const matchCat = catFilters.includes('all') ||
                (m.category_id && catFilters.includes(m.category_id.toString()));

            // Contact Type Filter
            let matchCon = conFilters.includes('all');
            if (!matchCon && m.contact_type) {
                try {
                    const machineTypes = Array.isArray(m.contact_type) ? m.contact_type : JSON.parse(m.contact_type);
                    matchCon = machineTypes.some(t => conFilters.includes(t.toString()));
                } catch (e) {
                    console.warn('Failed to parse contact_type for machine', m.id, e);
                }
            }

            // Search Keyword Filter
            let matchSearch = true;
            if (window.machineSearchFilter && window.machineSearchFilter.trim() !== '') {
                const query = window.machineSearchFilter.toLowerCase().trim();
                const name = (m.name || '').toLowerCase();
                const manufacturer = (m.manufacturer || '').toLowerCase();
                const serial = (m.serial || '').toLowerCase();
                matchSearch = name.includes(query) || manufacturer.includes(query) || serial.includes(query);
            }

            return matchCat && matchCon && matchSearch;
        });

        // Group machines by category
        const groupedByCategory = {};
        filteredMachines.forEach(machine => {
            const catId = machine.category_id || 'uncategorized';
            if (!groupedByCategory[catId]) {
                groupedByCategory[catId] = [];
            }
            groupedByCategory[catId].push(machine);
        });

        // Sort each category's machines by serial number (descending)
        Object.keys(groupedByCategory).forEach(catId => {
            groupedByCategory[catId].sort((a, b) => {
                const serialA = parseInt(a.serial) || 0;
                const serialB = parseInt(b.serial) || 0;
                return serialB - serialA; // Descending
            });
        });

        // Get sorted category list (alphabetically by name)
        const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
            if (a === 'uncategorized') return 1;
            if (b === 'uncategorized') return -1;

            const cats = window.categoryList || [];
            const catA = cats.find(c => c.id == a);
            const catB = cats.find(c => c.id == b);
            const nameA = catA ? catA.name : 'Unkategorisiert';
            const nameB = catB ? catB.name : 'Unkategorisiert';
            return nameA.localeCompare(nameB);
        });

        // Render each category with collapsible header
        sortedCategories.forEach(catId => {
            const machines = groupedByCategory[catId];
            const cats = window.categoryList || [];
            const cat = catId !== 'uncategorized' ? cats.find(c => c.id == catId) : null;
            const catName = cat ? cat.name : 'Unkategorisiert';
            const catColor = cat ? (cat.color || '#3b82f6') : '#666';

            // Create category section
            const categorySection = document.createElement('div');
            categorySection.className = 'category-section';
            categorySection.style.cssText = 'grid-column: 1 / -1; margin-bottom: 1.5rem;';

            // Category header (collapsible)
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.style.cssText = `
                background: rgba(255,255,255,0.03);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 14px;
                padding: 1rem 1.5rem;
                margin-bottom: 1rem;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s;
                user-select: none;
            `;
            categoryHeader.onmouseover = () => {
                categoryHeader.style.background = 'rgba(255,255,255,0.05)';
                categoryHeader.style.borderColor = 'rgba(255,255,255,0.15)';
            };
            categoryHeader.onmouseout = () => {
                categoryHeader.style.background = 'rgba(255,255,255,0.03)';
                categoryHeader.style.borderColor = 'rgba(255,255,255,0.1)';
            };

            const sectionId = `category-machines-${catId}`;
            const iconId = `category-icon-${catId}`;

            categoryHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 4px; height: 24px; background: ${catColor}; border-radius: 2px;"></div>
                    <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #fff; font-family: 'Inter', sans-serif;">
                        ${catName}
                    </h3>
                    <span style="background: rgba(255,255,255,0.1); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.6);">
                        ${machines.length}
                    </span>
                </div>
                <svg id="${iconId}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s; color: rgba(255,255,255,0.4);">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            `;

            categoryHeader.onclick = () => {
                const content = document.getElementById(sectionId);
                const icon = document.getElementById(iconId);

                if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
                    // Open
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.style.opacity = '1';
                    content.style.marginTop = '0';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                    // Update max-height after transition to allow dynamic content
                    setTimeout(() => {
                        if (content.style.maxHeight !== '0px') {
                            content.style.maxHeight = 'none';
                        }
                    }, 400);
                } else {
                    // Close
                    content.style.maxHeight = content.scrollHeight + 'px';
                    requestAnimationFrame(() => {
                        content.style.maxHeight = '0px';
                        content.style.opacity = '0';
                        content.style.marginTop = '-1rem';
                    });
                    if (icon) icon.style.transform = 'rotate(-90deg)';
                }
            };

            // Category content (grid of machine cards)
            const categoryContent = document.createElement('div');
            categoryContent.id = sectionId;
            categoryContent.className = 'category-content';
            categoryContent.style.cssText = `
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 2rem;
                max-height: none;
                overflow: hidden;
                transition: max-height 0.4s ease, opacity 0.3s ease, margin-top 0.3s ease;
                opacity: 1;
                margin-top: 0;
            `;

            // Responsive adjustment for the grid
            const styleSheet = document.createElement("style");
            styleSheet.innerText = `
                @media (max-width: 1200px) {
                    #category-machines-${catId} { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 768px) {
                    #category-machines-${catId} { grid-template-columns: 1fr !important; }
                }
            `;
            document.head.appendChild(styleSheet);

            // Render machine cards
            machines.forEach(machine => {
                const card = createMachineCard(machine);
                categoryContent.appendChild(card);
            });

            categorySection.appendChild(categoryHeader);
            categorySection.appendChild(categoryContent);
            container.appendChild(categorySection);
        });

        // Add "New Machine" Card at the end
        const addCard = document.createElement('div');
        addCard.className = 'card';
        addCard.style.cssText = 'font-family: \'Inter\', sans-serif; border: 2px dashed rgba(255,255,255,0.1); background: rgba(255,255,255,0.01); justify-content: center; align-items: center; cursor: pointer; min-height: 480px; display: flex; flex-direction: column; border-radius: 20px; transition: all 0.3s ease;';
        addCard.onmouseover = () => { addCard.style.borderColor = 'rgba(59, 130, 246, 0.3)'; addCard.style.background = 'rgba(59, 130, 246, 0.03)'; };
        addCard.onmouseout = () => { addCard.style.borderColor = 'rgba(255,255,255,0.1)'; addCard.style.background = 'rgba(255,255,255,0.01)'; };
        addCard.onclick = () => window.openAddMachineModal();
        addCard.innerHTML = `
            <div style="color: #666; text-align: center; padding: 2rem; display: flex; flex-direction: column; align-items: center;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem; color: #3b82f6;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </div>
                <p style="margin: 0; font-weight: 800; color: #aaa; font-size: 1.1rem;">Neue Maschine</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #666; max-width: 150px; line-height: 1.4; font-weight: 600;">Legen Sie ein neues Gerät im System an.</p>
            </div>
        `;
        container.appendChild(addCard);
    }

    // Helper function to create a machine card
    function createMachineCard(machine) {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'font-family: \'Inter\', sans-serif; overflow: hidden; display: flex; flex-direction: column; background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer;';
        card.onclick = () => window.openEditStammdaten(machine.id);

        // Image logic
        let imageHtml = '';
        if (machine.image_url) {
            imageHtml = `<img src="${machine.image_url}" alt="${machine.name}" style="width: 100%; height: 260px; object-fit: contain; background: rgba(0,0,0,0.15); display: block; border-bottom: 1px solid rgba(255,255,255,0.1);">`;
        } else {
            imageHtml = `
                <div class="card-image-placeholder" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)); color: rgba(255,255,255,0.2); height: 260px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4;">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                        <circle cx="9" cy="9" r="2"/>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                </div>`;
        }

        const maintenanceDate = machine.next_maintenance ? new Date(machine.next_maintenance).toLocaleDateString('de-DE') : 'Kein Termin';

        card.innerHTML = `
            ${imageHtml}
            <div class="card-content" style="padding: 1.75rem; flex: 1; display: flex; flex-direction: column;">
                <div style="margin-bottom: 1.5rem;">
                    <div style="flex: 1; overflow: hidden;">
                        <h2 class="card-title" style="margin: 0; font-size: 1.8rem; color: #fff; font-weight: 800; line-height: 1.2; font-family: 'Inter', sans-serif;">
                            ${[
                machine.manufacturer,
                machine.name,
                machine.serial ? `#${machine.serial}` : null,
                machine.year ? `(${machine.year})` : null
            ].filter(Boolean).join(' ')}
                        </h2>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.75rem; background: rgba(0,0,0,0.15); padding: 18px 1.75rem; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); margin-left: -1.75rem; margin-right: -1.75rem;">
                    <div style="border-right: 1px solid rgba(255,255,255,0.05); padding-right: 12px;">
                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.4); margin-bottom: 5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Nächste Wartung</div>
                        <div style="font-size: 1.05rem; color: #fff; display: flex; align-items: center; gap: 6px; font-weight: 700;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            ${maintenanceDate}
                        </div>
                    </div>
                    <div style="padding-left: 6px; cursor: pointer;" onclick="event.stopPropagation(); window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('${machine.location || ''}'), '_blank')">
                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.4); margin-bottom: 5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Standort</div>
                        <div style="font-size: 1.05rem; color: #fff; display: flex; align-items: start; gap: 6px; font-weight: 600;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6; margin-top: 3px; flex-shrink: 0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span style="word-break: break-word; line-height: 1.4;">${machine.location || 'Nicht zugewiesen'}</span>
                        </div>
                    </div>
                </div>

                <div class="card-actions" style="margin-top: auto; display: flex; flex-direction: column; gap: 12px; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.06);">
                    <button class="btn" style="width: 100%; min-height: 48px; border-radius: 14px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #60a5fa; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'" onclick="window.openServiceActionsModal(event, ${machine.id})">
                        Berichte & Protokolle
                    </button>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="btn" style="min-height: 42px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; gap: 6px;" onmouseover="this.style.background='rgba(16, 185, 129, 0.2)'" onmouseout="this.style.background='rgba(16, 185, 129, 0.1)'" onclick="event.stopPropagation(); window.openIntakeProtocol(${machine.id})" title="Eingangsprotokoll erstellen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                <path d="M9 12h6"></path>
                                <path d="M9 16h6"></path>
                            </svg>
                            Eingang
                        </button>
                        <button class="btn" style="min-height: 42px; border-radius: 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); color: #a78bfa; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; gap: 6px;" onmouseover="this.style.background='rgba(139, 92, 246, 0.2)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.1)'" onclick="event.stopPropagation(); window.openAcceptanceProtocol(${machine.id})" title="Abnahmeprotokoll erstellen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Abnahme
                        </button>
                    </div>
                    <button class="btn-icon-soft delete" onclick="deleteMachine(${machine.id})" title="Maschine löschen" style="width: 100%; height: 42px; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 12px; cursor: pointer; transition: all 0.2s; font-weight: 700; font-size: 0.95rem; font-family: 'Inter', sans-serif;" onmouseover="this.style.background='rgba(239, 68, 68, 0.15)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.05)'">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                        </svg>
                        Löschen
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    // Replace the original renderMachines function when ready
    console.log('Loading grouped machines rendering...');
    window.renderMachines = renderMachinesGrouped;
    console.log('Grouped rendering loaded successfully');
})();
