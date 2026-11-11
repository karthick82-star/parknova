/**
 * PARKNOVA - Visual Interactive Parking Slot Engine
 * Renders floor selector, visual parking layout, status coloring,
 * slot selection for drivers, and slot management for parking owners.
 */

window.PN = window.PN || {};

PN.slots = {
  currentParkingId: null,
  currentFloorId: null,
  selectedSlot: null,
  filterVehicleType: 'all', // 'all', '4W', '2W', 'EV'
  onSelectCallback: null,

  // Initialize interactive slot picker for Driver booking flow
  initPicker(containerEl, parkingId, onSlotSelected, checkTimeIso = null) {
    this.currentParkingId = parkingId;
    this.onSelectCallback = onSlotSelected;
    this.selectedSlot = null;

    const floors = PN.storage.where('floors', f => f.parkingId === parkingId);
    if (floors.length === 0) {
      containerEl.innerHTML = '<div class="empty-state">No floors configured for this facility.</div>';
      return;
    }

    this.currentFloorId = floors[0].id;
    this.render(containerEl, checkTimeIso);
  },

  // Render floor tabs, legend, and slot grid
  render(containerEl, checkTimeIso = null) {
    if (!containerEl || !this.currentParkingId) return;

    const floors = PN.storage.where('floors', f => f.parkingId === this.currentParkingId);
    const liveSlots = PN.storage.getLiveSlotsForFacility(this.currentParkingId, checkTimeIso);
    const floorSlots = liveSlots.filter(s => s.floorId === this.currentFloorId);

    // Apply vehicle type filter if set
    const displayedSlots = floorSlots.filter(s => {
      if (this.filterVehicleType === 'all') return true;
      return s.vehicleType === this.filterVehicleType;
    });

    let html = `
      <!-- Floor Tabs -->
      <div class="floor-nav-tabs">
        ${floors.map(f => `
          <button type="button" class="floor-tab ${f.id === this.currentFloorId ? 'active' : ''}" data-floor-id="${f.id}">
            <i class="fa-solid fa-layer-group"></i> ${PN.app.escapeHtml(f.name)}
          </button>
        `).join('')}
      </div>

      <!-- Status Legend -->
      <div class="slot-legend">
        <div class="legend-item">
          <span class="legend-color-box legend-available"></span>
          <span>Available</span>
        </div>
        <div class="legend-item">
          <span class="legend-color-box legend-selected"></span>
          <span>Selected</span>
        </div>
        <div class="legend-item">
          <span class="legend-color-box legend-reserved"></span>
          <span>Reserved</span>
        </div>
        <div class="legend-item">
          <span class="legend-color-box legend-occupied"></span>
          <span>Occupied</span>
        </div>
        <div class="legend-item">
          <span class="legend-color-box legend-maintenance"></span>
          <span>Maintenance</span>
        </div>
      </div>

      <!-- Vehicle Filter Pills -->
      <div class="d-flex align-center gap-1 mb-2">
        <span style="font-size:0.8rem; font-weight:700; color:var(--navy-muted);">Filter Slots:</span>
        <button type="button" class="btn btn-sm ${this.filterVehicleType === 'all' ? 'btn-primary' : 'btn-outline'} slot-filter-btn" data-type="all">All</button>
        <button type="button" class="btn btn-sm ${this.filterVehicleType === '4W' ? 'btn-primary' : 'btn-outline'} slot-filter-btn" data-type="4W"><i class="fa-solid fa-car"></i> 4W (Cars)</button>
        <button type="button" class="btn btn-sm ${this.filterVehicleType === '2W' ? 'btn-primary' : 'btn-outline'} slot-filter-btn" data-type="2W"><i class="fa-solid fa-motorcycle"></i> 2W (Bikes)</button>
        <button type="button" class="btn btn-sm ${this.filterVehicleType === 'EV' ? 'btn-primary' : 'btn-outline'} slot-filter-btn" data-type="EV"><i class="fa-solid fa-bolt"></i> EV</button>
      </div>

      <!-- Visual Slot Grid -->
      <div class="slot-grid-layout">
        ${displayedSlots.length > 0 ? displayedSlots.map(slot => {
          const isSelected = this.selectedSlot && this.selectedSlot.id === slot.id;
          let statusClass = `status-${slot.liveStatus}`;
          if (isSelected) statusClass = 'status-selected';

          let icon = 'fa-car';
          if (slot.vehicleType === '2W') icon = 'fa-motorcycle';
          else if (slot.vehicleType === 'EV') icon = 'fa-charging-station';

          return `
            <div class="slot-box ${statusClass}" 
                 data-slot-id="${slot.id}" 
                 data-slot-num="${slot.slotNumber}"
                 data-status="${slot.liveStatus}"
                 data-type="${slot.vehicleType}">
              <i class="fa-solid ${icon} slot-icon"></i>
              <div class="slot-label">${PN.app.escapeHtml(slot.slotNumber)}</div>
              <span class="slot-type-badge">${slot.vehicleType}</span>
            </div>
          `;
        }).join('') : `
          <div style="grid-column: 1 / -1; text-align:center; padding:2rem; color:var(--navy-muted);">
            No parking slots match the selected vehicle filter on this floor.
          </div>
        `}
      </div>
    `;

    containerEl.innerHTML = html;

    // Attach Floor Tab Listeners
    containerEl.querySelectorAll('.floor-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentFloorId = tab.dataset.floorId;
        this.render(containerEl, checkTimeIso);
      });
    });

    // Attach Filter Listeners
    containerEl.querySelectorAll('.slot-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterVehicleType = btn.dataset.type;
        this.render(containerEl, checkTimeIso);
      });
    });

    // Attach Slot Click Listeners (Driver Selection)
    containerEl.querySelectorAll('.slot-box').forEach(box => {
      box.addEventListener('click', () => {
        const status = box.dataset.status;
        const slotId = box.dataset.slotId;

        if (status !== 'available') {
          if (status === 'maintenance') {
            PN.toast('This slot is currently under maintenance and cannot be selected.', 'warning');
          } else if (status === 'occupied') {
            PN.toast('This slot is currently occupied by another vehicle.', 'warning');
          } else if (status === 'reserved') {
            PN.toast('This slot is already reserved for an active booking.', 'warning');
          }
          return;
        }

        const slot = PN.storage.find('slots', slotId);
        const floor = PN.storage.find('floors', slot.floorId);
        this.selectedSlot = { ...slot, floorName: floor ? floor.name : 'Main Floor' };

        // Re-render to reflect selection
        this.render(containerEl, checkTimeIso);

        if (this.onSelectCallback) {
          this.onSelectCallback(this.selectedSlot);
        }
      });
    });
  },

  // Owner Management: Add Floor
  addFloor(parkingId, floorName) {
    const existingFloors = PN.storage.where('floors', f => f.parkingId === parkingId);
    const newFloor = {
      id: `floor_${parkingId}_${existingFloors.length + 1}_${Date.now().toString(36)}`,
      parkingId: parkingId,
      name: floorName || `Floor ${existingFloors.length + 1}`,
      levelNumber: existingFloors.length + 1
    };
    PN.storage.insert('floors', newFloor);
    return newFloor;
  },

  // Owner Management: Add Slot
  addSlot(parkingId, floorId, slotNumber, vehicleType = '4W') {
    const existing = PN.storage.where('slots', s => s.floorId === floorId && s.slotNumber.toUpperCase() === slotNumber.toUpperCase());
    if (existing.length > 0) {
      return { success: false, message: `Slot ${slotNumber} already exists on this floor.` };
    }

    const newSlot = {
      id: `slot_${floorId}_${slotNumber.toUpperCase()}_${Date.now().toString(36)}`,
      parkingId: parkingId,
      floorId: floorId,
      slotNumber: slotNumber.toUpperCase(),
      row: slotNumber.charAt(0).toUpperCase(),
      column: parseInt(slotNumber.slice(1)) || 1,
      vehicleType: vehicleType,
      baseStatus: 'available'
    };

    PN.storage.insert('slots', newSlot);
    return { success: true, slot: newSlot };
  },

  // Owner Management: Update Slot Status
  updateSlotStatus(slotId, newStatus) {
    const allowed = ['available', 'occupied', 'maintenance'];
    if (!allowed.includes(newStatus)) return false;
    return PN.storage.update('slots', slotId, { baseStatus: newStatus });
  }
};

