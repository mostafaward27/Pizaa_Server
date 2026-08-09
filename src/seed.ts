import { prisma } from './db';
import bcrypt from 'bcryptjs';

export async function runSeed() {
  console.log('🌱 Starting ALFRIDO PIZZA Database Seed (Idempotent Mode)...');

  // Ensure tables exist in PostgreSQL safely
  const tablesDDL = [
    `CREATE TABLE IF NOT EXISTS "Branch" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL, "address" TEXT NOT NULL, "phone" TEXT NOT NULL, "isOpen" BOOLEAN DEFAULT true, "deliveryFee" DOUBLE PRECISION DEFAULT 40.0, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL, "role" TEXT DEFAULT 'CASHIER', "branchId" TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL, "description" TEXT, "sortOrder" INTEGER DEFAULT 0, "isActive" BOOLEAN DEFAULT true, "icon" TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "Product" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL, "description" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL, "categoryId" TEXT NOT NULL, "image" TEXT NOT NULL, "isAvailable" BOOLEAN DEFAULT true, "isFeatured" BOOLEAN DEFAULT false, "isBestSeller" BOOLEAN DEFAULT false, "ingredients" TEXT, "sizesJson" TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "ProductExtra" ("id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "name" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL, "isAvailable" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "Offer" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "code" TEXT UNIQUE NOT NULL, "description" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL, "originalPrice" DOUBLE PRECISION NOT NULL, "image" TEXT NOT NULL, "isActive" BOOLEAN DEFAULT true, "validFrom" TIMESTAMP, "validTo" TIMESTAMP, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "Customer" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "governorate" TEXT, "area" TEXT, "street" TEXT, "building" TEXT, "floor" TEXT, "apartment" TEXT, "notes" TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "Order" ("id" TEXT PRIMARY KEY, "orderNumber" TEXT UNIQUE NOT NULL, "trackingToken" TEXT UNIQUE NOT NULL, "customerId" TEXT NOT NULL, "branchId" TEXT NOT NULL, "orderType" TEXT DEFAULT 'DELIVERY', "status" TEXT DEFAULT 'PENDING', "rejectionReason" TEXT, "subtotal" DOUBLE PRECISION NOT NULL, "deliveryFee" DOUBLE PRECISION DEFAULT 40.0, "discount" DOUBLE PRECISION DEFAULT 0.0, "totalAmount" DOUBLE PRECISION NOT NULL, "paymentMethod" TEXT DEFAULT 'COD', "paymentStatus" TEXT DEFAULT 'PENDING', "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "OrderItem" ("id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL, "productId" TEXT, "productName" TEXT NOT NULL, "size" TEXT, "unitPrice" DOUBLE PRECISION NOT NULL, "quantity" INTEGER DEFAULT 1, "totalPrice" DOUBLE PRECISION NOT NULL, "notes" TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS "OrderItemExtra" ("id" TEXT PRIMARY KEY, "orderItemId" TEXT NOT NULL, "extraName" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS "OrderStatusHistory" ("id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL, "status" TEXT NOT NULL, "note" TEXT, "createdBy" TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`
  ];

  for (const ddl of tablesDDL) {
    try {
      await prisma.$executeRawUnsafe(ddl);
    } catch (err: any) {
      console.log('DDL note:', err.message);
    }
  }
  console.log('✅ Tables ensured in database');

  // 1. Upsert Branches
  const smouhaBranch = await prisma.branch.upsert({
    where: { slug: 'smouha' },
    update: {
      name: 'ALFRIDO PIZZA — SMOUHA',
      address: '14 Victor Emanuel St, Smouha, Alexandria',
      phone: '01200001042',
      isOpen: true,
      deliveryFee: 40.0,
    },
    create: {
      name: 'ALFRIDO PIZZA — SMOUHA',
      slug: 'smouha',
      address: '14 Victor Emanuel St, Smouha, Alexandria',
      phone: '01200001042',
      isOpen: true,
      deliveryFee: 40.0,
    },
  });

  const miamiBranch = await prisma.branch.upsert({
    where: { slug: 'miami' },
    update: {
      name: 'ALFRIDO PIZZA — MIAMI',
      address: '88 Khaled Ibn El Walid St, Miami, Alexandria',
      phone: '01200001043',
      isOpen: true,
      deliveryFee: 40.0,
    },
    create: {
      name: 'ALFRIDO PIZZA — MIAMI',
      slug: 'miami',
      address: '88 Khaled Ibn El Walid St, Miami, Alexandria',
      phone: '01200001043',
      isOpen: true,
      deliveryFee: 40.0,
    },
  });

  console.log('✅ Branches upserted');

  // 2. Upsert Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const kitchenHash = await bcrypt.hash('kitchen123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);

  const usersData = [
    { email: 'admin@alfridopizza.com', passwordHash, name: 'Tarek Al-Sayed (Super Admin)', role: 'SUPER_ADMIN' },
    { email: 'manager.smouha@alfridopizza.com', passwordHash: managerHash, name: 'Mostafa Hassan (Branch Manager)', role: 'BRANCH_MANAGER' },
    { email: 'kitchen@alfridopizza.com', passwordHash: kitchenHash, name: 'Chef Mahmoud (Head Chef)', role: 'KITCHEN_STAFF' },
    { email: 'cashier@alfridopizza.com', passwordHash: cashierHash, name: 'Sara Ahmed (Front Cashier)', role: 'CASHIER' },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, branchId: smouhaBranch.id },
      create: { email: u.email, passwordHash: u.passwordHash, name: u.name, role: u.role, branchId: smouhaBranch.id },
    });
  }

  console.log('✅ Demo Users upserted');

  // 3. Upsert Categories
  const catPizza = await prisma.category.upsert({
    where: { slug: 'pizzas' },
    update: { name: 'Pizzas', description: 'Artisanal Neapolitan & New York style pizzas', sortOrder: 1, icon: 'Pizza' },
    create: { name: 'Pizzas', slug: 'pizzas', description: 'Artisanal Neapolitan & New York style pizzas', sortOrder: 1, icon: 'Pizza' },
  });

  const catBurgers = await prisma.category.upsert({
    where: { slug: 'burgers' },
    update: { name: 'Smash Burgers', description: 'Juicy double smashed prime beef burgers', sortOrder: 2, icon: 'Beef' },
    create: { name: 'Smash Burgers', slug: 'burgers', description: 'Juicy double smashed prime beef burgers', sortOrder: 2, icon: 'Beef' },
  });

  const catSides = await prisma.category.upsert({
    where: { slug: 'sides' },
    update: { name: 'Sides & Dips', description: 'Crispy appetizers & homemade sauces', sortOrder: 3, icon: 'Fries' },
    create: { name: 'Sides & Dips', slug: 'sides', description: 'Crispy appetizers & homemade sauces', sortOrder: 3, icon: 'Fries' },
  });

  const catDrinks = await prisma.category.upsert({
    where: { slug: 'drinks' },
    update: { name: 'Drinks', description: 'Ice cold soft drinks & signature refreshers', sortOrder: 4, icon: 'CupSoda' },
    create: { name: 'Drinks', slug: 'drinks', description: 'Ice cold soft drinks & signature refreshers', sortOrder: 4, icon: 'CupSoda' },
  });

  const catDesserts = await prisma.category.upsert({
    where: { slug: 'desserts' },
    update: { name: 'Desserts', description: 'Decadent warm cakes & sweet calzones', sortOrder: 5, icon: 'Dessert' },
    create: { name: 'Desserts', slug: 'desserts', description: 'Decadent warm cakes & sweet calzones', sortOrder: 5, icon: 'Dessert' },
  });

  const catOffers = await prisma.category.upsert({
    where: { slug: 'offers' },
    update: { name: 'Special Offers', description: 'Exclusive value combos & discount deals', sortOrder: 6, icon: 'Sparkles' },
    create: { name: 'Special Offers', slug: 'offers', description: 'Exclusive value combos & discount deals', sortOrder: 6, icon: 'Sparkles' },
  });

  console.log('✅ Categories upserted');

  const pizzaSizes = JSON.stringify([
    { name: 'Small (9")', price: 190 },
    { name: 'Medium (12")', price: 240 },
    { name: 'Large (15")', price: 300 },
  ]);

  // 4. Upsert Products
  const productsData = [
    {
      name: 'Alfrido Margherita',
      slug: 'alfrido-margherita',
      description: 'San Marzano tomato sauce, fresh mozzarella, organic basil leaves, extra virgin olive oil',
      price: 240,
      categoryId: catPizza.id,
      image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Tomato Sauce, Mozzarella, Basil, Olive Oil',
      sizesJson: pizzaSizes,
      extras: [
        { name: 'Extra Cheese', price: 30 },
        { name: 'Fresh Mushrooms', price: 25 },
        { name: 'Black Olives', price: 20 },
        { name: 'Garlic Crust Dip', price: 15 },
      ],
    },
    {
      name: 'Alfrido Pepperoni',
      slug: 'alfrido-pepperoni',
      description: 'Rich tomato sauce, double mozzarella, double premium beef pepperoni, oregano glaze',
      price: 260,
      categoryId: catPizza.id,
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Tomato Sauce, Double Mozzarella, Pepperoni, Oregano',
      sizesJson: pizzaSizes,
      extras: [
        { name: 'Extra Cheese', price: 30 },
        { name: 'Jalapeños', price: 20 },
        { name: 'Extra Pepperoni', price: 40 },
        { name: 'Stuffed Crust Cheese', price: 45 },
      ],
    },
    {
      name: 'Chicken Ranch Supreme',
      slug: 'chicken-ranch-supreme',
      description: 'Grilled tender chicken breast, mozzarella, house creamy garlic ranch sauce, sweet corn',
      price: 270,
      categoryId: catPizza.id,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Grilled Chicken, Ranch Sauce, Mozzarella, Sweet Corn',
      sizesJson: pizzaSizes,
      extras: [
        { name: 'Extra Cheese', price: 30 },
        { name: 'Jalapeños', price: 20 },
        { name: 'Mushrooms', price: 25 },
      ],
    },
    {
      name: 'Smokey BBQ Chicken',
      slug: 'bbq-chicken-pizza',
      description: 'Slow-grilled chicken, hickory BBQ sauce drizzle, mozzarella, red onions, fresh parsley',
      price: 265,
      categoryId: catPizza.id,
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      isFeatured: false,
      isBestSeller: false,
      ingredients: 'Chicken, BBQ Sauce, Mozzarella, Red Onions',
      sizesJson: pizzaSizes,
      extras: [
        { name: 'Extra Cheese', price: 30 },
        { name: 'Extra BBQ Sauce', price: 15 },
      ],
    },
    {
      name: 'Carnivore Meat Lovers',
      slug: 'meat-lovers-pizza',
      description: 'Crispy beef pepperoni, seasoned ground beef, smoked sausage, pastrami, mozzarella cheese',
      price: 295,
      categoryId: catPizza.id,
      image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Pepperoni, Ground Beef, Sausage, Pastrami, Mozzarella',
      sizesJson: pizzaSizes,
      extras: [
        { name: 'Extra Cheese', price: 30 },
        { name: 'Extra Meat', price: 50 },
        { name: 'Stuffed Crust Cheese', price: 45 },
      ],
    },
    {
      name: 'Quattro Formaggi',
      slug: 'quattro-formaggi',
      description: 'Blend of cream mozzarella, Gorgonzola blue cheese, aged parmesan, sharp cheddar',
      price: 280,
      categoryId: catPizza.id,
      image: 'https://images.unsplash.com/photo-1573821663912-6df460f9c684?auto=format&fit=crop&w=800&q=80',
      isFeatured: false,
      isBestSeller: false,
      ingredients: 'Mozzarella, Gorgonzola, Parmesan, Cheddar',
      sizesJson: pizzaSizes,
      extras: [
        { name: 'Truffle Oil Drizzle', price: 35 },
        { name: 'Honey Drizzle', price: 20 },
      ],
    },
    // Burgers
    {
      name: 'Alfrido Double Smash Burger',
      slug: 'alfrido-double-smash',
      description: 'Two smashed 100% prime beef patties, double melted cheddar, grilled onions, house Alfrido sauce',
      price: 195,
      categoryId: catBurgers.id,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Double Beef Patty, Cheddar Cheese, Pickles, Alfrido Sauce',
      sizesJson: null,
      extras: [
        { name: 'Extra Patty', price: 55 },
        { name: 'Crispy Bacon', price: 35 },
      ],
    },
    {
      name: 'Smokey Bacon Cheddar Burger',
      slug: 'smokey-bacon-burger',
      description: 'Seared beef patty, crispy smoked beef bacon, aged cheddar, onion rings, smoky BBQ mayo',
      price: 210,
      categoryId: catBurgers.id,
      image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
      isFeatured: false,
      isBestSeller: false,
      ingredients: 'Beef Patty, Smoked Bacon, Cheddar, Onion Rings, BBQ Mayo',
      sizesJson: null,
      extras: [
        { name: 'Extra Bacon', price: 35 },
      ],
    },
    // Sides
    {
      name: 'Alfrido Loaded Fries',
      slug: 'loaded-fries',
      description: 'Golden crispy skin-on fries, liquid warm cheddar, pickled jalapenos, crispy bacon bits',
      price: 95,
      categoryId: catSides.id,
      image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Fries, Cheese Sauce, Jalapenos, Bacon',
      sizesJson: null,
      extras: [
        { name: 'Extra Cheese Sauce', price: 20 },
      ],
    },
    {
      name: 'Garlic Cheese Bread Sticks',
      slug: 'garlic-cheese-bread',
      description: 'Fresh wood-fired dough brushed with homemade garlic herb butter, melted mozzarella & marinara',
      price: 85,
      categoryId: catSides.id,
      image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
      isFeatured: false,
      isBestSeller: true,
      ingredients: 'Pizza Dough, Garlic Butter, Mozzarella, Marinara Dip',
      sizesJson: null,
      extras: [
        { name: 'Extra Marinara Dip', price: 15 },
      ],
    },
    {
      name: 'Crispy Mozzarella Sticks (6pcs)',
      slug: 'mozzarella-sticks',
      description: '6 pieces of golden crispy mozzarella sticks with gooey melted cheese center, served with marinara',
      price: 90,
      categoryId: catSides.id,
      image: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=800&q=80',
      isFeatured: false,
      isBestSeller: false,
      ingredients: 'Mozzarella, Breadcrumbs, Marinara Sauce',
      sizesJson: null,
      extras: [],
    },
    // Desserts
    {
      name: 'Alfrido Molten Lava Cake',
      slug: 'alfrido-lava-cake',
      description: 'Warm rich Belgian chocolate cake with a melting chocolate centre, dusted with powdered sugar',
      price: 90,
      categoryId: catDesserts.id,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Belgian Chocolate, Butter, Vanilla',
      sizesJson: null,
      extras: [
        { name: 'Vanilla Ice Cream Scoop', price: 25 },
      ],
    },
    {
      name: 'Nutella Hazelnut Calzone',
      slug: 'nutella-calzone',
      description: 'Oven-baked sweet folded crust filled with creamy Nutella chocolate and toasted hazelnut crunch',
      price: 110,
      categoryId: catDesserts.id,
      image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80',
      isFeatured: false,
      isBestSeller: false,
      ingredients: 'Dough, Nutella, Crushed Hazelnuts',
      sizesJson: null,
      extras: [],
    },
    // Drinks
    {
      name: 'Pepsi Cold Bottle 1L',
      slug: 'pepsi-1l',
      description: 'Chilled 1 Liter Pepsi cola bottle',
      price: 35,
      categoryId: catDrinks.id,
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
      isFeatured: false,
      isBestSeller: false,
      ingredients: 'Pepsi 1L',
      sizesJson: null,
      extras: [],
    },
    {
      name: 'Fresh Mint Lemonade',
      slug: 'fresh-mint-lemonade',
      description: 'Freshly squeezed Egyptian lemons blended with organic mint leaves & crushed ice',
      price: 50,
      categoryId: catDrinks.id,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
      isFeatured: true,
      isBestSeller: true,
      ingredients: 'Lemon Juice, Fresh Mint, Ice, Sugar',
      sizesJson: null,
      extras: [],
    },
  ];

  for (const prod of productsData) {
    const { extras, ...prodInfo } = prod;
    
    const updatedProduct = await prisma.product.upsert({
      where: { slug: prodInfo.slug },
      update: {
        name: prodInfo.name,
        description: prodInfo.description,
        price: prodInfo.price,
        categoryId: prodInfo.categoryId,
        image: prodInfo.image,
        isFeatured: prodInfo.isFeatured,
        isBestSeller: prodInfo.isBestSeller,
        ingredients: prodInfo.ingredients,
        sizesJson: prodInfo.sizesJson,
      },
      create: prodInfo,
    });

    if (extras && extras.length > 0) {
      for (const e of extras) {
        const existingExtra = await prisma.productExtra.findFirst({
          where: { productId: updatedProduct.id, name: e.name },
        });
        if (!existingExtra) {
          await prisma.productExtra.create({
            data: { productId: updatedProduct.id, name: e.name, price: e.price },
          });
        }
      }
    }
  }

  console.log('✅ Products & Extras upserted');

  // 5. Upsert Offers
  const offersData = [
    {
      title: 'Weekend Alfrido Deal',
      code: 'WEEKEND599',
      description: '2 Large Pizzas + 2 Fresh Drinks + 1 Loaded Fries',
      price: 599.0,
      originalPrice: 780.0,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      isActive: true,
    },
    {
      title: 'Mega Family Bundle',
      code: 'FAMILY749',
      description: '3 Medium Pizzas + 2 Garlic Cheese Breads + 1L Pepsi',
      price: 749.0,
      originalPrice: 960.0,
      image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
      isActive: true,
    },
    {
      title: 'Duo Pizza Combo',
      code: 'DUO450',
      description: '2 Medium Pizzas of your choice + 2 Refreshers',
      price: 450.0,
      originalPrice: 550.0,
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
      isActive: true,
    },
  ];

  for (const off of offersData) {
    await prisma.offer.upsert({
      where: { code: off.code },
      update: off,
      create: off,
    });
  }

  console.log('✅ Offers upserted');

  // 6. Create Demo Orders safely
  const existingOrder1040 = await prisma.order.findUnique({
    where: { orderNumber: '#ALFRIDO-1040' },
  });

  if (!existingOrder1040) {
    let customer1 = await prisma.customer.findFirst({ where: { phone: '01012345678' } });
    if (!customer1) {
      customer1 = await prisma.customer.create({
        data: {
          name: 'Ahmed Mansour',
          phone: '01012345678',
          governorate: 'Alexandria',
          area: 'Smouha',
          street: 'Fawzy Moatamed St',
          building: 'Building 12',
          floor: '4',
          apartment: '42',
          notes: 'Please ring doorbell and call upon arrival.',
        },
      });
    }

    await prisma.order.create({
      data: {
        orderNumber: '#ALFRIDO-1040',
        trackingToken: 'token-demo-1040',
        customerId: customer1.id,
        branchId: smouhaBranch.id,
        orderType: 'DELIVERY',
        status: 'PENDING',
        subtotal: 610.0,
        deliveryFee: 40.0,
        discount: 50.0,
        totalAmount: 600.0,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        items: {
          create: [
            {
              productName: 'Alfrido Pepperoni',
              size: 'Medium (12")',
              unitPrice: 240,
              quantity: 2,
              totalPrice: 510,
              notes: 'Extra crispy crust',
              extras: {
                create: [{ extraName: 'Extra Cheese', price: 30 }],
              },
            },
            {
              productName: 'Alfrido Loaded Fries',
              size: null,
              unitPrice: 95,
              quantity: 1,
              totalPrice: 95,
            },
          ],
        },
        statusHistory: {
          create: [{ status: 'PENDING', note: 'Order placed by customer' }],
        },
      },
    });
  }

  console.log('✅ Demo Orders checked/seeded');
  console.log('🎉 Idempotent Database seed completed successfully!');
}
