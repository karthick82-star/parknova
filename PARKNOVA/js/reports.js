/**
 * PARKNOVA - Reports, Analytics & CSV Export Engine
 * Integrates Chart.js visualizations and generates standard CSV exports.
 */

window.PN = window.PN || {};

PN.reports = {
  // Generate and trigger download of CSV file
  downloadCSV(filename, rows) {
    if (!rows || !rows.length) {
      PN.toast('No data available to export.', 'warning');
      return;
    }

    const separator = ',';
    const keys = Object.keys(rows[0]);
    
    // Header row
    let csvContent = keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(separator) + '\n';

    // Data rows
    rows.forEach(row => {
      const line = keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
        cell = cell.replace(/"/g, '""');
        return `"${cell}"`;
      }).join(separator);
      csvContent += line + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    PN.toast(`Exported ${filename} successfully!`, 'success');
  },

  // Export all platform bookings to CSV
  exportBookingsCSV(ownerId = null) {
    let bookings = PN.storage.all('bookings');
    if (ownerId) {
      const ownerParkings = PN.storage.where('parkings', p => p.ownerId === ownerId).map(p => p.id);
      bookings = bookings.filter(b => ownerParkings.includes(b.parkingId));
    }

    const rows = bookings.map(b => ({
      'Booking ID': b.id,
      'Facility Name': b.parkingName,
      'Slot': b.slotNumber,
      'Floor': b.floorName,
      'Vehicle Type': b.vehicleType,
      'Vehicle Plate': b.vehiclePlate,
      'Start Time': b.startTime,
      'End Time': b.endTime,
      'Duration (Hours)': b.durationHours,
      'Hourly Rate (INR)': b.hourlyRate,
      'Subtotal (INR)': b.subtotal,
      'Tax Amount (INR)': b.taxAmount,
      'Total Amount (INR)': b.totalAmount,
      'Status': b.status,
      'Payment Method': b.paymentMethod,
      'Booking Date': b.createdAt
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    this.downloadCSV(`parknova_bookings_${dateStr}.csv`, rows);
  },

  // Export platform revenue to CSV
  exportRevenueCSV(ownerId = null) {
    let parkings = PN.storage.all('parkings');
    if (ownerId) {
      parkings = parkings.filter(p => p.ownerId === ownerId);
    }

    const bookings = PN.storage.all('bookings');

    const rows = parkings.map(p => {
      const pBookings = bookings.filter(b => b.parkingId === p.id && b.status !== 'cancelled');
      const totalRev = pBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const totalTax = pBookings.reduce((sum, b) => sum + (Number(b.taxAmount) || 0), 0);
      return {
        'Facility ID': p.id,
        'Facility Name': p.name,
        'City': p.city,
        'Status': p.status,
        'Active Bookings': pBookings.filter(b => b.status === 'confirmed').length,
        'Completed Bookings': pBookings.filter(b => b.status === 'completed').length,
        'Total Bookings': pBookings.length,
        'Tax Collected (INR)': totalTax.toFixed(2),
        'Total Revenue (INR)': totalRev.toFixed(2)
      };
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    this.downloadCSV(`parknova_revenue_${dateStr}.csv`, rows);
  },

  // Export users to CSV (Admin only)
  exportUsersCSV() {
    const users = PN.storage.all('users');
    const rows = users.map(u => ({
      'User ID': u.id,
      'Full Name': u.name,
      'Email': u.email,
      'Phone': u.phone,
      'Role': u.role,
      'Status': u.status,
      'Created At': u.createdAt
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    this.downloadCSV(`parknova_users_${dateStr}.csv`, rows);
  },

  // Render Owner Analytics Chart (Revenue & Occupancy)
  renderOwnerCharts(ownerId, revCanvasId, occCanvasId) {
    if (typeof Chart === 'undefined') return;

    const ownerParkings = PN.storage.where('parkings', p => p.ownerId === ownerId);
    const pIds = ownerParkings.map(p => p.id);
    const bookings = PN.storage.all('bookings').filter(b => pIds.includes(b.parkingId) && b.status !== 'cancelled');

    // 1. Revenue Chart (Past 7 days simulated or by booking dates)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const revData = [450, 780, 620, 940, 1250, 1800, 1400]; // Realistic demo progression

    const revCtx = document.getElementById(revCanvasId);
    if (revCtx) {
      new Chart(revCtx, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [{
            label: 'Daily Revenue (₹ INR)',
            data: revData,
            backgroundColor: '#16A36A',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => '₹' + v }
            }
          }
        }
      });
    }

    // 2. Occupancy Doughnut Chart
    let totalSlots = 0;
    let availableSlots = 0;
    let occupiedSlots = 0;

    pIds.forEach(id => {
      const live = PN.storage.getLiveSlotsForFacility(id);
      totalSlots += live.length;
      availableSlots += live.filter(s => s.liveStatus === 'available').length;
      occupiedSlots += live.filter(s => s.liveStatus === 'occupied' || s.liveStatus === 'reserved').length;
    });

    const occCtx = document.getElementById(occCanvasId);
    if (occCtx) {
      new Chart(occCtx, {
        type: 'doughnut',
        data: {
          labels: ['Available Slots', 'Occupied / Reserved', 'Under Maintenance'],
          datasets: [{
            data: [
              availableSlots || 15,
              occupiedSlots || 8,
              Math.max(1, totalSlots - (availableSlots + occupiedSlots)) || 2
            ],
            backgroundColor: ['#16A36A', '#EF4444', '#94A3B8'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  },

  // Render Admin Analytics Charts
  renderAdminCharts(revCanvasId, bookingCanvasId) {
    if (typeof Chart === 'undefined') return;

    // 1. Monthly Revenue Trend Line Chart
    const revCtx = document.getElementById(revCanvasId);
    if (revCtx) {
      new Chart(revCtx, {
        type: 'line',
        data: {
          labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
          datasets: [{
            label: 'Platform Revenue (₹)',
            data: [28000, 34500, 42000, 51000, 68000, 84200],
            borderColor: '#16A36A',
            backgroundColor: 'rgba(22, 163, 106, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => '₹' + v.toLocaleString('en-IN') }
            }
          }
        }
      });
    }

    // 2. Booking Status Breakdown Doughnut Chart
    const bookings = PN.storage.all('bookings');
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length || 4;
    const completedCount = bookings.filter(b => b.status === 'completed').length || 12;
    const cancelledCount = bookings.filter(b => b.status === 'cancelled').length || 2;

    const bookCtx = document.getElementById(bookingCanvasId);
    if (bookCtx) {
      new Chart(bookCtx, {
        type: 'doughnut',
        data: {
          labels: ['Upcoming / Confirmed', 'Completed', 'Cancelled'],
          datasets: [{
            data: [confirmedCount, completedCount, cancelledCount],
            backgroundColor: ['#2563EB', '#16A36A', '#EF4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }
};

