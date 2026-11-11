/**
 * PARKNOVA - Leaflet.js Interactive Map & Heatmap Visualizer
 * Integrates OpenStreetMap tiles, custom color-coded availability markers,
 * geolocation, and card-to-map synchronization.
 */

window.PN = window.PN || {};

PN.map = {
  instance: null,
  markers: [],
  userMarker: null,

  // Initialize map on element id
  init(elementId = 'map-view', defaultCenter = [10.8050, 78.6856], defaultZoom = 13) {
    const el = document.getElementById(elementId);
    if (!el || typeof L === 'undefined') return;

    this.instance = L.map(elementId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(defaultCenter, defaultZoom);

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PARKNOVA'
    }).addTo(this.instance);

    return this.instance;
  },

  // Calculate availability stats for a parking lot
  getAvailabilityStatus(parkingId) {
    const liveSlots = PN.storage.getLiveSlotsForFacility(parkingId);
    const total = liveSlots.length;
    const available = liveSlots.filter(s => s.liveStatus === 'available').length;
    
    let level = 'green';
    let label = 'High Availability';
    const percent = total > 0 ? (available / total) * 100 : 0;

    if (available === 0) {
      level = 'red';
      label = 'Full / No Slots';
    } else if (percent <= 40) {
      level = 'yellow';
      label = 'Limited Slots';
    }

    return { total, available, level, label, percent };
  },

  // Render parking pins on map
  renderParkingMarkers(parkings, onMarkerClick = null) {
    if (!this.instance || typeof L === 'undefined') return;

    // Clear existing markers
    this.clearMarkers();

    const bounds = [];

    parkings.forEach(parking => {
      if (!parking.lat || !parking.lng) return;

      const avail = this.getAvailabilityStatus(parking.id);
      
      // Custom Leaflet DivIcon
      const markerHtml = `
        <div class="custom-map-marker marker-${avail.level}">
          <i class="fa-solid fa-square-parking"></i>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon-wrapper',
        html: markerHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
      });

      const marker = L.marker([parking.lat, parking.lng], { icon: customIcon });

      const root = (document.body && document.body.dataset.root) || '';
      const popupContent = `
        <div style="min-width: 220px; font-family: var(--font-main);">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.25rem; color: #172B3A;">
            ${PN.app.escapeHtml(parking.name)}
          </div>
          <div style="font-size: 0.75rem; color: #5B6B78; margin-bottom: 0.5rem;">
            <i class="fa-solid fa-location-dot"></i> ${PN.app.escapeHtml(parking.address)}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span class="heatmap-indicator heatmap-${avail.level}">
              <span class="heatmap-dot"></span> ${avail.available}/${avail.total} Slots
            </span>
            <span style="font-weight:800; color:#16A36A; font-size:1rem;">
              ₹${parking.hourlyRate4W}<span style="font-size:0.7rem; color:#5B6B78; font-weight:normal;">/hr</span>
            </span>
          </div>
          <a href="${root}parking-details.html?id=${parking.id}" class="btn btn-primary btn-sm btn-block">
            View & Select Slot
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(parking));
      }

      marker.addTo(this.instance);
      this.markers.push({ parkingId: parking.id, marker });
      bounds.push([parking.lat, parking.lng]);
    });

    // Fit map bounds if markers exist
    if (bounds.length > 1) {
      this.instance.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      this.instance.setView(bounds[0], 14);
    }
  },

  // Focus on specific parking
  focusParking(parkingId) {
    const item = this.markers.find(m => m.parkingId === parkingId);
    if (item && this.instance) {
      this.instance.setView(item.marker.getLatLng(), 15, { animate: true });
      item.marker.openPopup();
    }
  },

  // Clear all markers
  clearMarkers() {
    this.markers.forEach(m => m.marker.remove());
    this.markers = [];
  },

  // Geolocation trigger
  locateUser(onSuccess = null) {
    if (!navigator.geolocation) {
      PN.toast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    PN.toast('Detecting your location...', 'info');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (this.instance) {
          this.instance.setView([latitude, longitude], 14);

          if (this.userMarker) {
            this.userMarker.setLatLng([latitude, longitude]);
          } else {
            const userIcon = L.divIcon({
              className: 'user-loc-icon',
              html: '<div style="background:#2563EB; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(37,99,235,0.8);"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            this.userMarker = L.marker([latitude, longitude], { icon: userIcon })
              .addTo(this.instance)
              .bindPopup('<strong>You are here</strong>');
          }
          this.userMarker.openPopup();
        }

        PN.toast('Location identified!', 'success');
        if (onSuccess) onSuccess(latitude, longitude);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        PN.toast('Could not retrieve your location. Using default map view.', 'warning');
      },
      { timeout: 8000 }
    );
  }
};

