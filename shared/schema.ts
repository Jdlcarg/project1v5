import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // "user" | "admin"
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url").notNull(),
  type: text("type").notNull(), // "physical" | "digital"
  ageRange: text("age_range").notNull(),
  category: text("category").notNull(),
  stock: integer("stock"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "confirmed" | "shipped" | "delivered"
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const adminConfig = pgTable("admin_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  smtpEmail: text("smtp_email"),
  smtpPassword: text("smtp_password"),
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port"),
  mpAccessToken: text("mp_access_token"),
  mpPublicKey: text("mp_public_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const registerSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  role: true,
}).extend({
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const adminConfigSchema = z.object({
  smtpEmail: z.string().email().optional(),
  smtpPassword: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  mpAccessToken: z.string().optional(),
  mpPublicKey: z.string().optional(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertAdminConfigSchema = z.object({
  smtpEmail: z.string().email().optional(),
  smtpPassword: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  mpAccessToken: z.string().optional(),
  mpPublicKey: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;
export type AdminConfig = z.infer<typeof adminConfigSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type AdminConfigDB = typeof adminConfig.$inferSelect;
export type InsertAdminConfigDB = z.infer<typeof insertAdminConfigSchema>;

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & { product: Product })[];
}