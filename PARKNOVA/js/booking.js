/**
 * PARKNOVA - Booking Lifecycle, Fee Calculator & QR Code Generator
 * Handles reservation calculation, collision prevention, ticket generation, and countdown.
 */

window.PN = window.PN || {};

PN.booking = {
  // Generate unique booking reference ID
  generateBookingId() {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PN-${ym}-${rand}`;
  },

  // Calculate parking charges with GST/Tax breakdown
  calculateFee(parking, vehicleType, durationHours, rateType = 'hourly') {
    let rate = 0;
    if (vehicleType === '2W') {
      rate = rateType === 'daily' ? parking.dailyRate2W : parking.hourlyRate2W;
    } else {
      // 4W or EV
      rate = rateType === 'daily' ? parking.dailyRate4W : parking.hourlyRate4W;
    }

    let subtotal = 0;
    if (rateType === 'daily') {
      const days = Math.max(1, Math.ceil(durationHours / 24));
      subtotal = rate * days;
    } else {
      subtotal = rate * durationHours;
    }

    // 18% GST (Standard parking service tax in India)
    const taxRate = 0.18;
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    return {
      rate,
      rateType,
      durationHours,
      subtotal,
      taxRate: 18,
      taxAmount,
      totalAmount
    };
  },

  // Process and commit reservation into LocalStorage
  createBooking(bookingPayload) {
    const {
      userId,
      parkingId,
      floorId,
      slotId,
      vehicleType,
      vehiclePlate,
      vehicleModel,
      startTime,
      durationHours,
      rateType,
      paymentMethod
    } = bookingPayload;

    // 1. Double Booking & Collision Check
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationHours * 3600000);
    const endTimeIso = end.toISOString();

    const isAvailable = PN.storage.isSlotAvailable(slotId, startTime, endTimeIso);
    if (!isAvailable) {
      return {
        success: false,
        message: 'Conflict detected: The selected slot was just reserved or is unavailable for this time window. Please select another slot.'
      };
    }

    // 2. Fetch context details
    const parking = PN.storage.find('parkings', parkingId);
    const slot = PN.storage.find('slots', slotId);
    const floor = PN.storage.find('floors', floorId);

    if (!parking || !slot) {
      return { success: false, message: 'Invalid parking or slot selection.' };
    }

    // 3. Calculate Fee
    const fee = this.calculateFee(parking, vehicleType, durationHours, rateType);
    const bookingId = this.generateBookingId();

    // 4. QR Data Payload
    const qrPayload = {
      bookingId: bookingId,
      facility: parking.name,
      address: parking.address,
      slot: `${slot.slotNumber} (${floor ? floor.name : 'Level 1'})`,
      vehicle: vehiclePlate,
      validFrom: startTime,
      validTill: endTimeIso,
      simulatedValidation: true
    };

    const newBooking = {
      id: bookingId,
      userId: userId,
      parkingId: parkingId,
      parkingName: parking.name,
      parkingAddress: parking.address,
      floorId: floorId,
      floorName: floor ? floor.name : 'Floor 1',
      slotId: slotId,
      slotNumber: slot.slotNumber,
      vehicleType: vehicleType,
      vehiclePlate: vehiclePlate,
      vehicleModel: vehicleModel || 'Vehicle',
      startTime: startTime,
      endTime: endTimeIso,
      durationHours: durationHours,
      rateType: rateType,
      hourlyRate: fee.rate,
      subtotal: fee.subtotal,
      taxAmount: fee.taxAmount,
      totalAmount: fee.totalAmount,
      status: 'confirmed',
      paymentMethod: paymentMethod || 'Demo Online / UPI',
      paymentStatus: 'paid',
      qrData: JSON.stringify(qrPayload),
      createdAt: new Date().toISOString()
    };

    PN.storage.insert('bookings', newBooking);

    return {
      success: true,
      booking: newBooking
    };
  },

  // Cancel an active booking
  cancelBooking(bookingId, reason = 'User requested cancellation') {
    const booking = PN.storage.find('bookings', bookingId);
    if (!booking) {
      return { success: false, message: 'Booking not found.' };
    }

    if (booking.status === 'cancelled') {
      return { success: false, message: 'This booking is already cancelled.' };
    }

    if (booking.status === 'completed') {
      return { success: false, message: 'Cannot cancel an already completed booking.' };
    }

    PN.storage.update('bookings', bookingId, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toISOString()
    });

    return { success: true, message: 'Booking cancelled successfully.' };
  },

  // Render QR Code onto a container element using QRCode.js
  renderQRCode(containerEl, qrString, size = 180) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      new QRCode(containerEl, {
        text: qrString,
        width: size,
        height: size,
        colorDark: '#172B3A',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      // Fallback SVG QR mockup if library is loading
      containerEl.innerHTML = `
        <div style="width:${size}px; height:${size}px; border:2px dashed var(--border); display:grid; place-items:center; text-align:center; padding:10px;">
          <i class="fa-solid fa-qrcode" style="font-size:3rem; color:var(--primary);"></i>
          <span style="font-size:0.75rem;">QR Code Ready</span>
        </div>
      `;
    }
  },

  // Real-time Countdown Timer for confirmed/active bookings
  startCountdown(targetIsoTime, displayEl, onExpire = null) {
    if (!displayEl) return null;

    const updateTimer = () => {
      const now = Date.now();
      const target = new Date(targetIsoTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        displayEl.textContent = '00:00:00 (Expired / Active)';
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const p = n => String(n).padStart(2, '0');
      displayEl.textContent = `${p(hours)}:${p(minutes)}:${p(seconds)}`;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return interval;
  }
};

