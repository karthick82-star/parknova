/* Sample data. ALL of this is SIMULATED demo data, clearly flagged isSample:true */
PN.seed = {
  hash(pw) { let h = 5381; for (const c of pw) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return 'demo$' + h; }, // demo only, NOT secure
  demoAccounts: [
    { id: 'u_admin', role: 'admin', name: 'PARKNOVA Admin', email: 'admin@parknova.demo', phone: '9000000001', pw: 'Admin@123' },
    { id: 'u_owner1', role: 'owner', name: 'Ravi Kumar', email: 'owner1@parknova.demo', phone: '9000000002', pw: 'Owner@123' },
    { id: 'u_owner2', role: 'owner', name: 'Meena Iyer', email: 'owner2@parknova.demo', phone: '9000000003', pw: 'Owner@123' },
    { id: 'u_driver1', role: 'driver', name: 'Arjun Das', email: 'driver1@parknova.demo', phone: '9000000004', pw: 'Driver@123' },
    { id: 'u_driver2', role: 'driver', name: 'Priya Nair', email: 'driver2@parknova.demo', phone: '9000000005', pw: 'Driver@123' }
  ],
  parkings: [
    ['p1', 'u_owner1', 'Central Plaza Parking', 'Cantonment, Tiruchirappalli', 'Tiruchirappalli', 10.8050, 78.6856, 30, 60, 2],
    ['p2', 'u_owner1', 'Srirangam Temple Lot', 'Srirangam, Tiruchirappalli', 'Tiruchirappalli', 10.8627, 78.6893, 20, 40, 1],
    ['p3', 'u_owner2', 'T. Nagar Smart Park', 'T. Nagar, Chennai', 'Chennai', 13.0418, 80.2341, 50, 80, 2],
    ['p4', 'u_owner2', 'MG Road Multi-Level', 'MG Road, Bengaluru', 'Bengaluru', 12.9756, 77.6068, 60, 100, 2],
    ['p5', 'u_owner2', 'Andheri Station Parking', 'Andheri West, Mumbai', 'Mumbai', 19.1197, 72.8468, 70, 120, 1],
    ['p6', 'u_owner1', 'Connaught Place Park', 'Connaught Place, New Delhi', 'Delhi', 28.6315, 77.2167, 80, 130, 2]
  ],
  run() {
    const S = PN.storage, now = new Date().toISOString();
    S.set('users', this.demoAccounts.map(a => ({ id: a.id, role: a.role, name: a.name, email: a.email, phone: a.phone,
      passwordHash: this.hash(a.pw), status: 'active', createdAt: now, isSample: true })));
    const parkings = [], floors = [], slots = [];
    this.parkings.forEach(([id, ownerId, name, address, city, lat, lng, h4, d4, nFloors], pi) => {
      parkings.push({ id, ownerId, name, address, city, lat, lng, images: [], amenities: ['CCTV', 'Security', 'EV Charging'],
        openTime: '06:00', closeTime: '23:00', vehicleTypes: ['2W', '4W'], hourly4W: h4, daily4W: d4,
        hourly2W: Math.round(h4 / 3), daily2W: Math.round(d4 / 3),
        status: pi === 5 ? 'pending' : 'approved', rejectReason: '', isSample: true, createdAt: now });
      for (let f = 1; f <= nFloors; f++) {
        const fid = id + '_f' + f; floors.push({ id: fid, parkingId: id, name: 'Floor ' + f, rows: 4, cols: 6 });
        for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
          const roll = (r * 6 + c + pi + f) % 9;
          slots.push({ id: fid + '_s' + r + c, parkingId: id, floorId: fid, label: String.fromCharCode(65 + r) + (c + 1),
            vehicleType: c >= 4 ? '2W' : '4W', row: r, col: c,
            baseStatus: roll === 0 ? 'maintenance' : (roll < 4 ? 'occupied' : 'available') });
        }
      }
    });
    S.set('parkings', parkings); S.set('floors', floors); S.set('slots', slots);
    ['bookings', 'vehicles', 'history', 'complaints'].forEach(k => S.set(k, []));
    S.set('meta', { seedVersion: PN.config.seedVersion, seededAt: now, note: 'All data is simulated demo data.' });
  },
  ensure() { const m = PN.storage.get('meta'); if (!m || m.seedVersion !== PN.config.seedVersion) this.run(); },
  reset() { PN.storage.clearAll(); this.run(); }
};
PN.seed.ensure();
