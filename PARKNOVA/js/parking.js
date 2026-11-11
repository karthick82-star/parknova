/**
 * PARKNOVA - Parking Discovery, Search, Comparison & Smart Recommendations
 * Handles filtering, distance calculations, side-by-side comparison, and facility profiles.
 */

window.PN = window.PN || {};

PN.parking = {
  // Haversine formula to compute distance in km between two lat/lng points
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  },

  // Get only approved, active parking facilities visible to the public
  getPublicParkings() {
    return PN.storage.where('parkings', p => p.status === 'approved' && p.active !== false);
  },

  // Search & Filter parkings
  searchParkings(criteria = {}) {
    const {
      keyword = '',
      city = '',
      maxPrice = null,
      vehicleType = null,
      amenity = null,
      userLat = null,
      userLng = null,
      sortBy = 'recommended' // 'recommended', 'cheapest', 'nearest', 'rating'
    } = criteria;

    let list = this.getPublicParkings();

    // Keyword filter
    if (keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    }

    // City filter
    if (city.trim()) {
      list = list.filter(p => p.city.toLowerCase() === city.toLowerCase().trim());
    }

    // Max Price filter (Hourly 4W)
    if (maxPrice && !isNaN(maxPrice)) {
      list = list.filter(p => p.hourlyRate4W <= Number(maxPrice));
    }

    // Vehicle Type filter
    if (vehicleType && vehicleType !== 'all') {
      list = list.filter(p => p.vehicleTypes && p.vehicleTypes.includes(vehicleType));
    }

    // Amenity filter
    if (amenity && amenity !== 'all') {
      list = list.filter(p => p.amenities && p.amenities.some(a => a.toLowerCase().includes(amenity.toLowerCase())));
    }

    // Attach computed live distance and availability
    list = list.map(p => {
      const avail = PN.map.getAvailabilityStatus(p.id);
      let dist = null;
      if (userLat && userLng) {
        dist = this.calculateDistanceKm(userLat, userLng, p.lat, p.lng);
      } else {
        // Simulated proximity for Tiruchirappalli center default
        dist = this.calculateDistanceKm(10.8050, 78.6856, p.lat, p.lng) || 1.2;
      }
      return { ...p, availability: avail, distanceKm: dist };
    });

    // Sort order
    if (sortBy === 'cheapest') {
      list.sort((a, b) => a.hourlyRate4W - b.hourlyRate4W);
    } else if (sortBy === 'nearest') {
      list.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // Recommended: high availability + high rating
      list.sort((a, b) => (b.availability.percent * (b.rating || 4)) - (a.availability.percent * (a.rating || 4)));
    }

    return list;
  },

  // Smart Recommendations (Section 8.G)
  getSmartRecommendations(userLat = null, userLng = null) {
    const all = this.searchParkings({ userLat, userLng });
    if (all.length === 0) return { cheapest: null, nearest: null, bestValue: null };

    const sortedByPrice = [...all].sort((a, b) => a.hourlyRate4W - b.hourlyRate4W);
    const sortedByDist = [...all].sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    const sortedByValue = [...all].sort((a, b) => {
      const valA = ((a.rating || 4) * 10) - (a.hourlyRate4W / 2);
      const valB = ((b.rating || 4) * 10) - (b.hourlyRate4W / 2);
      return valB - valA;
    });

    return {
      cheapest: sortedByPrice[0] || null,
      nearest: sortedByDist[0] || null,
      bestValue: sortedByValue[0] || null
    };
  },

  // Render a Single Parking Card HTML string
  createParkingCardHtml(parking, isSelected = false) {
    const root = (document.body && document.body.dataset.root) || '';
    const imgUrl = (parking.images && parking.images[0]) || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80';
    const avail = parking.availability || PN.map.getAvailabilityStatus(parking.id);
    const distanceStr = parking.distanceKm ? `${parking.distanceKm} km away` : 'Nearby';

    return `
      <div class="parking-card ${isSelected ? 'selected' : ''}" data-parking-id="${parking.id}">
        <div class="parking-card-img">
          <img src="${imgUrl}" alt="${PN.app.escapeHtml(parking.name)}" loading="lazy">
          <div class="parking-card-badges">
            <span class="heatmap-indicator heatmap-${avail.level}">
              <span class="heatmap-dot"></span> ${avail.available} Slots Left
            </span>
            <span class="badge badge-neutral" style="background:rgba(23,43,58,0.75); color:white; font-size:0.7rem;">
              <i class="fa-solid fa-star text-warning"></i> ${parking.rating || '4.5'}
            </span>
          </div>
        </div>
        <div class="parking-card-body">
          <div class="parking-title">${PN.app.escapeHtml(parking.name)}</div>
          <div class="parking-address">
            <i class="fa-solid fa-location-dot"></i>
            <span>${PN.app.escapeHtml(parking.address)}, ${PN.app.escapeHtml(parking.city)}</span>
          </div>
          <div class="d-flex align-center gap-1 mt-1">
            <span class="badge badge-neutral" style="font-size:0.7rem;"><i class="fa-solid fa-route"></i> ${distanceStr}</span>
            <span class="badge badge-neutral" style="font-size:0.7rem;"><i class="fa-solid fa-clock"></i> ${parking.openTime} - ${parking.closeTime}</span>
          </div>
          <div class="parking-meta-row">
            <div>
              <div class="parking-price-badge">₹${parking.hourlyRate4W}<span> / hr (4W)</span></div>
              <div style="font-size:0.75rem; color:var(--navy-muted);">₹${parking.hourlyRate2W} / hr (2W)</div>
            </div>
            <a href="${root}parking-details.html?id=${parking.id}" class="btn btn-primary btn-sm">
              View & Book
            </a>
          </div>
        </div>
      </div>
    `;
  }
};

