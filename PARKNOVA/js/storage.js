/**
 * PARKNOVA - LocalStorage Data Engine
 * Centralized data store and seeding module.
 * 
 * NOTE: LocalStorage is suitable only for a single-browser prototype/demonstration.
 * It is not a secure multi-user database and does not provide real cross-device synchronization.
 */

window.PN = window.PN || {};

PN.STORAGE_PREFIX = 'parknova_';
PN.SEED_VERSION = 2; // increments if structure updates

PN.storage = {
  // Low-level Get
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(PN.STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : fallback;
    } catch (err) {
      console.error(`Error reading key "${key}" from localStorage:`, err);
      return fallback;
    }
  },

  // Low-level Set
  set(key, value) {
    try {
      localStorage.setItem(PN.STORAGE_PREFIX + key, JSON.stringify(value));
      // Asynchronously mirror updates to Firebase Cloud Database (exclude local session)
      if (key !== 'session' && window.PN && PN.firebase && typeof PN.firebase.pushTable === 'function') {
        PN.firebase.pushTable(key, value);
      }
      return true;
    } catch (err) {
      console.error(`Error writing key "${key}" to localStorage:`, err);
      if (window.PN && PN.toast) {
        PN.toast('Storage limit reached. Please clear some demo data.', 'error');
      }
      return false;
    }
  },

  // Remove single key
  remove(key) {
    localStorage.removeItem(PN.STORAGE_PREFIX + key);
    if (key !== 'session' && window.PN && PN.firebase && typeof PN.firebase.pushTable === 'function') {
      PN.firebase.pushTable(key, null);
    }
  },

  // Table operations
  all(table) {
    return this.get(table, []);
  },

  find(table, id) {
    const list = this.all(table);
    return list.find(item => item.id === id) || null;
  },

  where(table, predicate) {
    const list = this.all(table);
    return list.filter(predicate);
  },

  insert(table, item) {
    const list = this.all(table);
    list.push(item);
    this.set(table, list);
    return item;
  },

  update(table, id, updates) {
    const list = this.all(table);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
    this.set(table, list);
    return list[index];
  },

  delete(table, id) {
    const list = this.all(table);
    const filtered = list.filter(item => item.id !== id);
    this.set(table, filtered);
    return true;
  },

  // Double booking & overlap validation
  isSlotAvailable(slotId, startTimeIso, endTimeIso, excludeBookingId = null) {
    const targetSlot = this.find('slots', slotId);
    if (!targetSlot) return false;
    if (targetSlot.baseStatus === 'maintenance') return false;

    const start = new Date(startTimeIso).getTime();
    const end = new Date(endTimeIso).getTime();
    if (isNaN(start) || isNaN(end) || start >= end) return false;

    // Check all active or upcoming bookings for this slot
    const bookings = this.all('bookings').filter(b => 
      b.slotId === slotId &&
      b.status !== 'cancelled' &&
      b.status !== 'completed' &&
      (!excludeBookingId || b.id !== excludeBookingId)
    );

    for (const b of bookings) {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      // Overlap condition: start < bEnd && end > bStart
      if (start < bEnd && end > bStart) {
        return false; // Collision detected!
      }
    }

    return true;
  },

  // Compute live slot state for a specific parking facility at an optional given time
  getLiveSlotsForFacility(parkingId, checkTimeIso = null) {
    const checkTime = checkTimeIso ? new Date(checkTimeIso).getTime() : Date.now();
    const slots = this.where('slots', s => s.parkingId === parkingId);
    const bookings = this.where('bookings', b => 
      b.parkingId === parkingId && 
      b.status !== 'cancelled' && 
      b.status !== 'completed'
    );

    return slots.map(slot => {
      if (slot.baseStatus === 'maintenance') {
        return { ...slot, liveStatus: 'maintenance' };
      }

      // Check if slot has active booking right now
      const activeBooking = bookings.find(b => {
        if (b.slotId !== slot.id) return false;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return checkTime >= bStart && checkTime < bEnd;
      });

      if (activeBooking) {
        return {
          ...slot,
          liveStatus: activeBooking.status === 'checked-in' ? 'occupied' : 'reserved',
          activeBookingId: activeBooking.id
        };
      }

      // If slot base status was manually marked occupied by owner
      if (slot.baseStatus === 'occupied') {
        return { ...slot, liveStatus: 'occupied' };
      }

      return { ...slot, liveStatus: 'available' };
    });
  },

  // Reset all platform demo data
  resetAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PN.STORAGE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
    this.seedDemoData();
    if (window.PN && PN.firebase && typeof PN.firebase.pushAllToCloud === 'function') {
      PN.firebase.pushAllToCloud();
    }
  },

  // Seed sample data
  seedDemoData() {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. User Accounts
    const users = [
      {
        id: 'user_admin_1',
        name: 'PARKNOVA SuperAdmin',
        email: 'admin@parknova.demo',
        phone: '9876543210',
        password: 'Password@123',
        role: 'admin',
        status: 'active',
        createdAt: nowIso,
        avatar: 'PA'
      },
      {
        id: 'user_owner_1',
        name: 'Rajesh Sharma',
        email: 'owner1@parknova.demo',
        phone: '9845012345',
        password: 'Password@123',
        role: 'owner',
        status: 'active',
        businessName: 'Sharma Parking Solutions',
        createdAt: nowIso,
        avatar: 'RS'
      },
      {
        id: 'user_owner_2',
        name: 'Kavita Sundaram',
        email: 'owner2@parknova.demo',
        phone: '9845054321',
        password: 'Password@123',
        role: 'owner',
        status: 'active',
        businessName: 'Metro Park Spaces',
        createdAt: nowIso,
        avatar: 'KS'
      },
      {
        id: 'user_driver_1',
        name: 'Arjun Das',
        email: 'driver1@parknova.demo',
        phone: '9123456780',
        password: 'Password@123',
        role: 'driver',
        status: 'active',
        createdAt: nowIso,
        avatar: 'AD'
      },
      {
        id: 'user_driver_2',
        name: 'Priya Nair',
        email: 'driver2@parknova.demo',
        phone: '9123456789',
        password: 'Password@123',
        role: 'driver',
        status: 'active',
        createdAt: nowIso,
        avatar: 'PN'
      }
    ];

    // 2. Parking Facilities
    const parkings = [
      {
        id: 'p_1',
        ownerId: 'user_owner_1',
        name: 'Central Plaza Grand Smart Parking',
        description: 'Multi-level covered smart parking with high-security surveillance, EV fast chargers, and automated boom barriers.',
        address: '14 Cantonment High Road, Near Central Bus Stand',
        city: 'Tiruchirappalli',
        lat: 10.8050,
        lng: 78.6856,
        images: [
          'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80'
        ],
        amenities: ['CCTV Surveillance', '24/7 Security', 'EV Charging', 'Covered Parking', 'Restrooms', 'Car Wash'],
        openTime: '00:00',
        closeTime: '23:59',
        vehicleTypes: ['2W', '4W', 'EV'],
        hourlyRate4W: 40,
        dailyRate4W: 250,
        hourlyRate2W: 15,
        dailyRate2W: 90,
        status: 'approved',
        active: true,
        rating: 4.8,
        totalReviews: 124,
        createdAt: nowIso
      },
      {
        id: 'p_2',
        ownerId: 'user_owner_1',
        name: 'Srirangam Temple Heritage Lot',
        description: 'Secure, spacious parking lot right near the Rajagopuram entrance. Dedicated slots for pilgrims and electric vehicles.',
        address: 'South Chithra Street, Srirangam',
        city: 'Tiruchirappalli',
        lat: 10.8627,
        lng: 78.6893,
        images: [
          'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80'
        ],
        amenities: ['CCTV Surveillance', 'Security Guard', 'Drinking Water', 'Wheelchair Friendly'],
        openTime: '05:00',
        closeTime: '22:30',
        vehicleTypes: ['2W', '4W'],
        hourlyRate4W: 30,
        dailyRate4W: 180,
        hourlyRate2W: 10,
        dailyRate2W: 60,
        status: 'approved',
        active: true,
        rating: 4.6,
        totalReviews: 89,
        createdAt: nowIso
      },
      {
        id: 'p_3',
        ownerId: 'user_owner_2',
        name: 'T. Nagar Express Tower Park',
        description: 'State of the art automated multi-tier parking in the shopping capital. Instant contactless entry with PARKNOVA QR.',
        address: '88 Usman Road, T. Nagar',
        city: 'Chennai',
        lat: 13.0418,
        lng: 80.2341,
        images: [
          'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=800&q=80'
        ],
        amenities: ['CCTV Surveillance', 'Valet Available', 'EV Superchargers', 'Fire Safety', 'Card/UPI Pay'],
        openTime: '07:00',
        closeTime: '23:00',
        vehicleTypes: ['2W', '4W', 'EV'],
        hourlyRate4W: 60,
        dailyRate4W: 380,
        hourlyRate2W: 25,
        dailyRate2W: 140,
        status: 'approved',
        active: true,
        rating: 4.9,
        totalReviews: 210,
        createdAt: nowIso
      },
      {
        id: 'p_4',
        ownerId: 'user_owner_2',
        name: 'MG Road Metro Hub Parking',
        description: 'Direct metro connectivity. Ideal for daily commuters and shoppers with budget daily parking passes.',
        address: '42 MG Road, Near Metro Station Gate 2',
        city: 'Bengaluru',
        lat: 12.9756,
        lng: 77.6068,
        images: [
          'https://images.unsplash.com/photo-1543465077-db45d34b88a5?auto=format&fit=crop&w=800&q=80'
        ],
        amenities: ['CCTV Surveillance', 'Covered Parking', 'EV Charging', '24/7 Security'],
        openTime: '06:00',
        closeTime: '23:30',
        vehicleTypes: ['2W', '4W', 'EV'],
        hourlyRate4W: 50,
        dailyRate4W: 300,
        hourlyRate2W: 20,
        dailyRate2W: 110,
        status: 'approved',
        active: true,
        rating: 4.7,
        totalReviews: 165,
        createdAt: nowIso
      },
      {
        id: 'p_5',
        ownerId: 'user_owner_1',
        name: 'Connaught Place Premier Park (Pending Approval)',
        description: 'New underground parking facility in Inner Circle with smart LED space guidance and tire pressure check station.',
        address: 'Block B, Inner Circle, Connaught Place',
        city: 'Delhi',
        lat: 28.6315,
        lng: 77.2167,
        images: [
          'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'
        ],
        amenities: ['CCTV Surveillance', 'Security Guard', 'Covered Parking', 'EV Charging'],
        openTime: '06:00',
        closeTime: '23:00',
        vehicleTypes: ['4W', 'EV'],
        hourlyRate4W: 70,
        dailyRate4W: 450,
        hourlyRate2W: 30,
        dailyRate2W: 180,
        status: 'pending', // Pending Admin approval demo
        active: false,
        rating: 0,
        totalReviews: 0,
        createdAt: nowIso
      }
    ];

    // 3. Floors & Slots Generation
    const floors = [];
    const slots = [];

    parkings.forEach((parking) => {
      const numFloors = parking.id === 'p_1' ? 2 : (parking.id === 'p_3' ? 2 : 1);
      
      for (let f = 1; f <= numFloors; f++) {
        const floorId = `floor_${parking.id}_${f}`;
        floors.push({
          id: floorId,
          parkingId: parking.id,
          name: f === 1 ? 'Ground Level (G)' : `Level ${f}`,
          levelNumber: f
        });

        // Generate 12 slots per floor: Row A (4W), Row B (4W / EV), Row C (2W)
        const rowConfigs = [
          { rowLetter: 'A', vehicleType: '4W', count: 4 },
          { rowLetter: 'B', vehicleType: '4W', count: 4, evCols: [3, 4] },
          { rowLetter: 'C', vehicleType: '2W', count: 4 }
        ];

        rowConfigs.forEach(rc => {
          for (let col = 1; col <= rc.count; col++) {
            const isEv = rc.evCols && rc.evCols.includes(col);
            const slotId = `slot_${floorId}_${rc.rowLetter}${col}`;
            
            // Varied demo base status
            let baseStatus = 'available';
            if (parking.id === 'p_1' && f === 1 && rc.rowLetter === 'A' && col === 1) {
              baseStatus = 'occupied';
            } else if (parking.id === 'p_1' && rc.rowLetter === 'B' && col === 4) {
              baseStatus = 'maintenance';
            }

            slots.push({
              id: slotId,
              parkingId: parking.id,
              floorId: floorId,
              slotNumber: `${rc.rowLetter}${col}`,
              row: rc.rowLetter,
              column: col,
              vehicleType: isEv ? 'EV' : rc.vehicleType,
              baseStatus: baseStatus
            });
          }
        });
      }
    });

    // 4. Sample Vehicles for Driver
    const vehicles = [
      {
        id: 'veh_1',
        userId: 'user_driver_1',
        plateNumber: 'TN 45 BK 7890',
        model: 'Hyundai Creta (White)',
        type: '4W',
        isDefault: true
      },
      {
        id: 'veh_2',
        userId: 'user_driver_1',
        plateNumber: 'TN 45 AZ 1122',
        model: 'Royal Enfield Classic 350',
        type: '2W',
        isDefault: false
      },
      {
        id: 'veh_3',
        userId: 'user_driver_2',
        plateNumber: 'TN 07 CM 5544',
        model: 'Tata Nexon EV (Teal)',
        type: 'EV',
        isDefault: true
      }
    ];

    // 5. Sample Bookings (Active, Upcoming, Completed)
    const twoHoursLater = new Date(now.getTime() + 2 * 3600000).toISOString();
    const fourHoursLater = new Date(now.getTime() + 4 * 3600000).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 3600000).toISOString();
    const yesterdayEnd = new Date(now.getTime() - 21 * 3600000).toISOString();

    const bookings = [
      {
        id: 'PN-202611-8842',
        userId: 'user_driver_1',
        parkingId: 'p_1',
        parkingName: 'Central Plaza Grand Smart Parking',
        floorId: 'floor_p_1_1',
        floorName: 'Ground Level (G)',
        slotId: 'slot_floor_p_1_1_A2',
        slotNumber: 'A2',
        vehicleType: '4W',
        vehiclePlate: 'TN 45 BK 7890',
        vehicleModel: 'Hyundai Creta',
        startTime: twoHoursLater,
        endTime: fourHoursLater,
        durationHours: 2,
        rateType: 'hourly',
        hourlyRate: 40,
        subtotal: 80,
        taxAmount: 14.40,
        totalAmount: 94.40,
        status: 'confirmed', // upcoming
        paymentMethod: 'UPI / Demo Card',
        paymentStatus: 'paid',
        qrData: JSON.stringify({
          ticket: 'PN-202611-8842',
          parking: 'Central Plaza Grand Smart Parking',
          slot: 'A2 (Ground Level (G))',
          plate: 'TN 45 BK 7890',
          validTill: fourHoursLater
        }),
        createdAt: nowIso
      },
      {
        id: 'PN-202611-3319',
        userId: 'user_driver_1',
        parkingId: 'p_2',
        parkingName: 'Srirangam Temple Heritage Lot',
        floorId: 'floor_p_2_1',
        floorName: 'Ground Level (G)',
        slotId: 'slot_floor_p_2_1_C1',
        slotNumber: 'C1',
        vehicleType: '2W',
        vehiclePlate: 'TN 45 AZ 1122',
        vehicleModel: 'Royal Enfield',
        startTime: yesterday,
        endTime: yesterdayEnd,
        durationHours: 3,
        rateType: 'hourly',
        hourlyRate: 10,
        subtotal: 30,
        taxAmount: 5.40,
        totalAmount: 35.40,
        status: 'completed',
        entryTime: yesterday,
        exitTime: yesterdayEnd,
        paymentMethod: 'PARKNOVA Wallet',
        paymentStatus: 'paid',
        qrData: JSON.stringify({
          ticket: 'PN-202611-3319',
          parking: 'Srirangam Temple Heritage Lot',
          slot: 'C1',
          plate: 'TN 45 AZ 1122'
        }),
        createdAt: yesterday
      }
    ];

    // 6. Sample Complaints & Feedback
    const complaints = [
      {
        id: 'comp_1',
        userId: 'user_driver_1',
        userName: 'Arjun Das',
        userRole: 'driver',
        category: 'Parking Facility',
        parkingId: 'p_1',
        parkingName: 'Central Plaza Grand Smart Parking',
        subject: 'EV Charger speed inquiry',
        message: 'The 60kW fast charger was running at lower capacity around 4 PM yesterday. Please calibrate.',
        status: 'in-progress',
        adminRemarks: 'Notified facility technician for voltage check.',
        createdAt: yesterday
      },
      {
        id: 'comp_2',
        userId: 'user_driver_2',
        userName: 'Priya Nair',
        userRole: 'driver',
        category: 'Booking & Payment',
        parkingId: 'p_3',
        parkingName: 'T. Nagar Express Tower Park',
        subject: 'Great contactless experience!',
        message: 'Seamless entry with the QR scanner at gate 2. Very clean premises.',
        status: 'resolved',
        adminRemarks: 'Thank you for your valuable feedback!',
        createdAt: nowIso
      }
    ];

    // Preserve custom registered accounts if any
    const existingUsers = this.all('users');
    const customUsers = existingUsers.filter(u => u && u.email && !u.email.endsWith('@parknova.demo'));
    const userMap = new Map();
    users.forEach(u => userMap.set(u.id || u.email, u));
    customUsers.forEach(u => userMap.set(u.id || u.email, u));
    const allUsers = Array.from(userMap.values());

    // Save all to localStorage
    this.set('users', allUsers);
    this.set('parkings', parkings);
    this.set('floors', floors);
    this.set('slots', slots);
    this.set('vehicles', vehicles);
    this.set('bookings', bookings);
    this.set('complaints', complaints);
    this.set('meta', {
      seedVersion: PN.SEED_VERSION,
      seededAt: nowIso,
      currency: '₹',
      note: 'Demo data for college major project presentation.'
    });

    console.log('PARKNOVA demo data seeded successfully into localStorage.');
  },

  // Ensure database is populated
  init() {
    const meta = this.get('meta');
    if (!meta || meta.seedVersion !== PN.SEED_VERSION) {
      this.seedDemoData();
    }
  }
};

// Auto-run init
PN.storage.init();

