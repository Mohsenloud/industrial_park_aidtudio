const { createClient } = require('@libsql/client');

const client = createClient({ url: 'file:./local.db' });

async function seed() {
  console.log("Seeding started...");

  // Seed Units
  const units = [
    {
      id: "unit-1",
      owner_id: "admin-uid",
      name: "شرکت فولاد صنعت نوین",
      phone: "021-5555555",
      mobile1: "09120000001",
      address: "خیابان صنعت ۱، پلاک ۴",
      description: "تولید کننده انواع قطعات فولادی و ماشین‌آلات صنعتی",
      category: "metals",
      profile_image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
      latitude: 35.6892,
      longitude: 51.3890,
      status: "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "unit-2",
      owner_id: "admin-uid",
      name: "شیمی پلاست آریا",
      phone: "021-6666666",
      mobile1: "09120000002",
      address: "خیابان دانش ۳، پلاک ۱۲",
      description: "تولید کننده مواد اولیه پلاستیک و ظروف یکبار مصرف",
      category: "chemicals",
      profile_image: "https://images.unsplash.com/photo-1579725835694-817865c3dc02?auto=format&fit=crop&q=80&w=800",
      latitude: 35.6950,
      longitude: 51.3950,
      status: "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: "unit-3",
      owner_id: "test-uid",
      name: "صنایع چوبی راش",
      phone: "021-7777777",
      mobile1: "09120000003",
      address: "خیابان تلاش ۵، پلاک ۸",
      description: "طراحی و ساخت مبلمان اداری و دکوراسیون چوبی",
      category: "wood_paper",
      profile_image: "https://images.unsplash.com/photo-1611077544955-467362df5fde?auto=format&fit=crop&q=80&w=800",
      latitude: 35.7010,
      longitude: 51.4010,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  for (const unit of units) {
    await client.execute({
      sql: `INSERT INTO units (id, owner_id, name, phone, mobile1, address, description, category, profile_image, latitude, longitude, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING;`,
      args: Object.values(unit)
    });
  }
  console.log("Units seeded!");

  // Seed Products
  const products = [
    {
      id: "prod-1",
      unit_id: "unit-1",
      owner_id: "admin-uid",
      name: "تیرآهن صنعتی I-Beam",
      description: "تیرآهن با مقاومت بالا مناسب برای سوله‌سازی",
      image: "https://images.unsplash.com/photo-1502472584811-0a2f2feb8968?auto=format&fit=crop&q=80&w=800",
      price: "توافقی",
      created_at: new Date().toISOString()
    },
    {
      id: "prod-2",
      unit_id: "unit-2",
      owner_id: "admin-uid",
      name: "گرانول پتروشیمی",
      description: "مواد اولیه پلاستیک با کیفیت عالی",
      image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=800",
      price: "150,000 تومان / کیلو",
      created_at: new Date().toISOString()
    }
  ];

  for (const prod of products) {
    await client.execute({
      sql: `INSERT INTO products (id, unit_id, owner_id, name, description, image, price, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING;`,
      args: Object.values(prod)
    });
  }
  console.log("Products seeded!");

  // Seed Job Ads
  const classifieds = [
    {
      id: "class-1",
      owner_id: "admin-uid",
      type: "job",
      title: "استخدام تراشکار CNC",
      description: "به یک تراشکار ماهر با حداقل ۵ سال سابقه کار نیازمندیم.",
      phone: "09120000001",
      category: "جوشکار و تراشکار",
      created_at: new Date().toISOString()
    }
  ];
  
  for (const ad of classifieds) {
    await client.execute({
      sql: `INSERT INTO classifieds (id, owner_id, type, title, description, phone, category, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING;`,
      args: Object.values(ad)
    });
  }
  console.log("Classifieds seeded!");

  console.log("Seeding complete!");
}

seed().catch(console.error);
