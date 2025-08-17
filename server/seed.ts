import { db } from "./db";
import { users, products } from "@shared/schema";
import { InsertUser, InsertProduct } from "@shared/schema";

const adminUser: InsertUser = {
  email: "admin@edujuegos.com",
  password: "admin123", // In production, this should be hashed
  name: "María González",
  role: "admin",
};

const initialProducts: InsertProduct[] = [
  {
    name: "Kit Estimulación Cognitiva",
    description: "Conjunto de juegos diseñados para estimular memoria, atención y concentración en niños pequeños.",
    price: "18500",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
    type: "physical",
    ageRange: "3-8",
    category: "Estimulación Cognitiva",
    stock: 12,
    isActive: true,
  },
  {
    name: "Set Terapia Ocupacional",
    description: "Herramientas especializadas para el desarrollo de habilidades motoras finas y coordinación.",
    price: "35800",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
    type: "physical",
    ageRange: "4-12",
    category: "Terapia Ocupacional",
    stock: 8,
    isActive: true,
  },
  {
    name: "Juego Mesa Habilidades Sociales",
    description: "Dinámico juego para desarrollar empatía, comunicación y trabajo en equipo.",
    price: "24300",
    imageUrl: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
    type: "physical",
    ageRange: "7-15",
    category: "Habilidades Sociales",
    stock: 15,
    isActive: true,
  },
  {
    name: "Actividades Lectoescritura Digital",
    description: "Plataforma interactiva para el aprendizaje de lectura y escritura a través del juego.",
    price: "12900",
    imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
    type: "digital",
    ageRange: "5-10",
    category: "Lectoescritura",
    stock: null,
    isActive: true,
  },
  {
    name: "Programa Inteligencia Emocional",
    description: "Curso digital completo para el desarrollo de habilidades emocionales y autoconocimiento.",
    price: "15600",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
    type: "digital",
    ageRange: "6-14",
    category: "Inteligencia Emocional",
    stock: null,
    isActive: true,
  },
  {
    name: "App Matemáticas Adaptativa",
    description: "Aplicación que se adapta al ritmo de aprendizaje para fortalecer habilidades matemáticas.",
    price: "9800",
    imageUrl: "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
    type: "digital",
    ageRange: "8-16",
    category: "Matemáticas",
    stock: null,
    isActive: true,
  },
];

async function seed() {
  try {
    console.log("🌱 Starting database seeding...");

    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    const existingProducts = await db.select().from(products).limit(1);

    if (existingUsers.length === 0) {
      console.log("👤 Seeding admin user...");
      await db.insert(users).values(adminUser);
      console.log("✅ Admin user created successfully");
    } else {
      console.log("👤 Admin user already exists, skipping...");
    }

    if (existingProducts.length === 0) {
      console.log("📦 Seeding products...");
      await db.insert(products).values(initialProducts);
      console.log("✅ Products created successfully");
    } else {
      console.log("📦 Products already exist, skipping...");
    }

    console.log("🎉 Database seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run seeding
seed().then(() => {
  console.log("Seeding finished");
  process.exit(0);
});

export { seed };
import { db } from "./db";
import { users, products, adminConfig } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      email: "admin@test.com",
      password: adminPassword,
      name: "Administrador",
      role: "admin"
    }).onConflictDoNothing();

    // Create sample products
    const sampleProducts = [
      {
        name: "Kit de Evaluación Cognitiva",
        description: "Kit completo para evaluación de habilidades cognitivas en niños",
        price: "89.99",
        imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
        type: "physical",
        ageRange: "6-12",
        category: "evaluacion",
        stock: 15
      },
      {
        name: "Curso Online: Estrategias de Aprendizaje",
        description: "Curso digital con estrategias efectivas para mejorar el aprendizaje",
        price: "49.99",
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
        type: "digital",
        ageRange: "8-16",
        category: "curso",
        stock: null
      },
      {
        name: "Material de Lectoescritura",
        description: "Conjunto de materiales para desarrollar la lectoescritura",
        price: "39.99",
        imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400",
        type: "physical",
        ageRange: "4-8",
        category: "material",
        stock: 25
      }
    ];

    await db.insert(products).values(sampleProducts).onConflictDoNothing();

    // Create admin config
    await db.insert(adminConfig).values({
      mpAccessToken: "",
      mpPublicKey: "",
      smtpEmail: "",
      smtpPassword: ""
    }).onConflictDoNothing();

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
