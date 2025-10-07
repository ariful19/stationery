import { db, customers, products, sqlite } from './client.js';

const toCents = (value: number) => Math.round(value * 100);

const customerSeed = [
  {
    name: 'Acme Office Supplies',
    phone: '555-0100',
    email: 'sales@acmeoffice.com',
    address: '123 Paper St, Springfield'
  },
  {
    name: 'Brightside Design Studio',
    phone: '555-0101',
    email: 'hello@brightside.design',
    address: '48 Market Ave, Springfield'
  },
  {
    name: 'Northwind Coworking',
    phone: '555-0102',
    email: 'team@northwindcowork.com',
    address: '215 Harbor Blvd, Springfield'
  },
  {
    name: 'Evergreen Architects',
    phone: '555-0103',
    email: 'contact@evergreenarch.com',
    address: '9 Skyline Way, Springfield'
  },
  {
    name: 'Blue Horizon Events',
    phone: '555-0104',
    email: 'events@bluehorizon.co',
    address: '702 Riverside Dr, Springfield'
  },
  {
    name: 'Craft & Clay Studio',
    phone: '555-0105',
    email: 'hi@craftandclay.studio',
    address: '15 Artisan Ln, Springfield'
  },
  {
    name: 'Fresh Grounds Cafe',
    phone: '555-0106',
    email: 'manager@freshgrounds.cafe',
    address: '81 Cedar St, Springfield'
  },
  {
    name: 'Greenline Landscaping',
    phone: '555-0107',
    email: 'office@greenline.land',
    address: '578 Meadow Rd, Springfield'
  },
  {
    name: 'Harbor Light B&B',
    phone: '555-0108',
    email: 'stay@harborlightbnb.com',
    address: '2 Lighthouse Ct, Springfield'
  },
  {
    name: 'Inkwell Publishing',
    phone: '555-0109',
    email: 'editors@inkwell.pub',
    address: '431 Author Ave, Springfield'
  },
  {
    name: 'Juniper Yoga Collective',
    phone: '555-0110',
    email: 'welcome@juniperyoga.co',
    address: '77 Harmony St, Springfield'
  },
  {
    name: 'Kindred Makers Market',
    phone: '555-0111',
    email: 'market@kindredmakers.com',
    address: '301 Union Sq, Springfield'
  },
  {
    name: 'Lakeview Dental',
    phone: '555-0112',
    email: 'frontdesk@lakeviewdental.com',
    address: '560 Clear Lake Rd, Springfield'
  },
  {
    name: 'Momentum Fitness Lab',
    phone: '555-0113',
    email: 'info@momentumlabs.fit',
    address: '940 Powerhouse Dr, Springfield'
  },
  {
    name: "Nova Children's Museum",
    phone: '555-0114',
    email: 'hello@novamuseum.org',
    address: '18 Discovery Pl, Springfield'
  },
  {
    name: 'Oak & Iron Furniture',
    phone: '555-0115',
    email: 'sales@oakandiron.shop',
    address: '660 Workshop Rd, Springfield'
  },
  {
    name: 'Parkside Community Theater',
    phone: '555-0116',
    email: 'stage@parksidetheater.org',
    address: '40 Center Stage Ln, Springfield'
  },
  {
    name: 'QuickFix IT Services',
    phone: '555-0117',
    email: 'support@quickfixit.pro',
    address: '128 Circuit Rd, Springfield'
  },
  {
    name: 'Riverstone Spa & Wellness',
    phone: '555-0118',
    email: 'care@riverstonespa.com',
    address: '320 Tranquil Way, Springfield'
  },
  {
    name: 'Summit Outdoor Gear',
    phone: '555-0119',
    email: 'orders@summitoutdoor.co',
    address: '145 Ridge Trail, Springfield'
  }
];

const productSeed = [
  {
    sku: 'PAPER-A4-80',
    name: 'A4 Copy Paper 80gsm (Ream)',
    description: 'Bright white office paper ideal for everyday printing.',
    unitPriceCents: toCents(5.49),
    stockQty: 180
  },
  {
    sku: 'PAPER-A4-REC',
    name: 'A4 Recycled Copy Paper (Ream)',
    description: '100% recycled copy paper with smooth finish.',
    unitPriceCents: toCents(5.99),
    stockQty: 120
  },
  {
    sku: 'NOTE-CLASSIC-A5',
    name: 'Classic A5 Notebook',
    description: 'Hardcover notebook with 240 ruled pages.',
    unitPriceCents: toCents(12.95),
    stockQty: 75
  },
  {
    sku: 'NOTE-DOT-GRID',
    name: 'Dot Grid Journal',
    description: '160-page dotted journal perfect for bullet journaling.',
    unitPriceCents: toCents(14.5),
    stockQty: 60
  },
  {
    sku: 'PEN-GEL-05-BK',
    name: '0.5mm Gel Pen - Black (Pack of 12)',
    description: 'Quick-dry gel ink with comfortable grip.',
    unitPriceCents: toCents(11.25),
    stockQty: 210
  },
  {
    sku: 'PEN-GEL-05-COLOR',
    name: '0.5mm Gel Pens - Assorted Colors (Pack of 12)',
    description: 'Vibrant gel pens for notes and sketches.',
    unitPriceCents: toCents(12.75),
    stockQty: 155
  },
  {
    sku: 'PEN-ROLLER-07-BL',
    name: '0.7mm Rollerball Pen - Blue (Pack of 10)',
    description: 'Smooth rollerball pens with archival-safe ink.',
    unitPriceCents: toCents(9.95),
    stockQty: 190
  },
  {
    sku: 'MARK-HILITE-SET',
    name: 'Pastel Highlighter Set (6 Pack)',
    description: 'Soft pastel highlighters with chisel tips.',
    unitPriceCents: toCents(8.5),
    stockQty: 130
  },
  {
    sku: 'MARK-PERM-SET',
    name: 'Permanent Marker Set (8 Pack)',
    description: 'Bold, low-odor permanent markers for labeling.',
    unitPriceCents: toCents(10.5),
    stockQty: 145
  },
  {
    sku: 'ART-WATERCOLOR-24',
    name: 'Watercolor Paint Set (24 Pan)',
    description: 'Artist-grade watercolors in a travel-friendly tin.',
    unitPriceCents: toCents(24.95),
    stockQty: 48
  },
  {
    sku: 'ART-SKETCH-SET',
    name: 'Graphite Sketching Set',
    description: 'Complete set with pencils, erasers, and blending tools.',
    unitPriceCents: toCents(18.5),
    stockQty: 52
  },
  {
    sku: 'STAPLER-DESK',
    name: 'Full-Strip Desk Stapler',
    description: 'Metal stapler with 25-sheet capacity.',
    unitPriceCents: toCents(13.75),
    stockQty: 85
  },
  {
    sku: 'STAPLES-5000',
    name: 'Standard Staples (Box of 5000)',
    description: 'Premium staples for smooth, jam-free stapling.',
    unitPriceCents: toCents(4.5),
    stockQty: 300
  },
  {
    sku: 'FILE-FOLDER-SET',
    name: 'File Folders - Assorted Colors (Pack of 20)',
    description: 'Durable folders for organizing paperwork.',
    unitPriceCents: toCents(9.25),
    stockQty: 160
  },
  {
    sku: 'FILE-BOX-LETTER',
    name: 'Letter Size Storage Box',
    description: 'Collapsible storage box with label window.',
    unitPriceCents: toCents(7.75),
    stockQty: 110
  },
  {
    sku: 'BIND-NOTEBOOK-A4',
    name: 'Wirebound Notebook A4',
    description: 'College-ruled notebook with tear-out pages.',
    unitPriceCents: toCents(6.5),
    stockQty: 200
  },
  {
    sku: 'BIND-PLAN-UNDATED',
    name: 'Undated Weekly Planner',
    description: 'Planner with perforated to-do lists and habit tracker.',
    unitPriceCents: toCents(16.95),
    stockQty: 70
  },
  {
    sku: 'ADHESIVE-NOTES-SET',
    name: 'Sticky Notes Variety Pack',
    description: 'Multi-size sticky notes in bright colors.',
    unitPriceCents: toCents(5.75),
    stockQty: 230
  },
  {
    sku: 'ADHESIVE-TAPE-DISP',
    name: 'Crystal Clear Tape with Dispenser (4 Pack)',
    description: 'Office tape rolls with weighted desktop dispenser.',
    unitPriceCents: toCents(6.25),
    stockQty: 190
  },
  {
    sku: 'MAIL-BUBBLE-10',
    name: 'Bubble Mailers 10x13 (Pack of 25)',
    description: 'Padded mailers ideal for shipping small goods.',
    unitPriceCents: toCents(11.95),
    stockQty: 120
  },
  {
    sku: 'MAIL-POLY-14',
    name: 'Poly Mailers 14x19 (Pack of 50)',
    description: 'Durable self-seal mailers for soft goods.',
    unitPriceCents: toCents(13.5),
    stockQty: 90
  },
  {
    sku: 'ORG-DESK-TRAY',
    name: 'Stackable Desk Tray',
    description: 'Metal mesh tray for incoming documents.',
    unitPriceCents: toCents(9.95),
    stockQty: 95
  },
  {
    sku: 'ORG-PEN-CUP',
    name: 'Pen & Pencil Cup',
    description: 'Weighted pen cup with felt base.',
    unitPriceCents: toCents(4.95),
    stockQty: 210
  },
  {
    sku: 'ORG-CABLE-TIES',
    name: 'Reusable Cable Ties (Pack of 20)',
    description: 'Hook-and-loop ties to manage cables and cords.',
    unitPriceCents: toCents(6.75),
    stockQty: 150
  },
  {
    sku: 'BOARD-WHITE-36',
    name: 'Magnetic Whiteboard 36x24',
    description: 'Dry erase board with mounting hardware.',
    unitPriceCents: toCents(42.5),
    stockQty: 34
  },
  {
    sku: 'CLEAN-SPRAY',
    name: 'Screen Cleaning Spray Kit',
    description: 'Anti-static spray with microfiber cloth.',
    unitPriceCents: toCents(8.95),
    stockQty: 140
  },
  {
    sku: 'CLEAN-WIPES-100',
    name: 'Disinfecting Wipes (Tub of 100)',
    description: 'Lemon-scented wipes safe for office surfaces.',
    unitPriceCents: toCents(7.5),
    stockQty: 170
  },
  {
    sku: 'INK-HP-67XL-BK',
    name: 'Ink Cartridge HP 67XL Black',
    description: 'High-yield cartridge for HP DeskJet and ENVY series.',
    unitPriceCents: toCents(38.99),
    stockQty: 44
  },
  {
    sku: 'TONER-BROTHER-TN760',
    name: 'Toner Cartridge Brother TN-760',
    description: 'High-yield toner compatible with Brother HL-L2350DW.',
    unitPriceCents: toCents(74.95),
    stockQty: 28
  },
  {
    sku: 'CHAIR-MAT-HARD',
    name: 'Chair Mat for Hard Floors',
    description: 'Durable mat with anti-slip backing.',
    unitPriceCents: toCents(49.95),
    stockQty: 25
  }
];

function seed() {
  sqlite.exec(`
    DELETE FROM invoice_items;
    DELETE FROM payments;
    DELETE FROM invoices;
    DELETE FROM products;
    DELETE FROM customers;
  `);

  db.transaction(tx => {
    tx.insert(customers)
      .values(customerSeed)
      .onConflictDoNothing({ target: customers.email })
      .run();

    tx.insert(products)
      .values(productSeed)
      .onConflictDoNothing({ target: products.sku })
      .run();
  });

  console.log(`Seeded ${customerSeed.length} customers and ${productSeed.length} products.`);
}

seed();

sqlite.close();
