import {
  User,
  InsertUser,
  Product,
  InsertProduct,
  Order,
  InsertOrder,
  OrderItem,
  InsertOrderItem,
  OrderWithItems,
  AdminConfigDB,
  InsertAdminConfigDB,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { users, products, orders, orderItems, adminConfig, passwordResetTokens } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Orders
  getOrders(): Promise<OrderWithItems[]>;
  getOrder(id: string): Promise<OrderWithItems | undefined>;
  getUserOrders(userId: string): Promise<OrderWithItems[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Admin Config
  getAdminConfig(): Promise<AdminConfigDB | undefined>;
  saveAdminConfig(config: InsertAdminConfigDB): Promise<AdminConfigDB>;

  // Password Recovery
  createPasswordRecoveryToken(userId: string, token: string): Promise<void>;
  validatePasswordRecoveryToken(token: string): Promise<string | null>;
  deletePasswordRecoveryToken(token: string): Promise<void>;

  // User Profile Updates
  updateUserProfile(userId: string, data: { name: string; email: string }): Promise<User | undefined>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: string, productUpdate: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(productUpdate)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.update(products).set({ isActive: false }).where(eq(products.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getOrders(): Promise<OrderWithItems[]> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const ordersWithItems: OrderWithItems[] = [];

    for (const order of allOrders) {
      const items = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          product: products,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      ordersWithItems.push({
        ...order,
        items: items,
      });
    }

    return ordersWithItems;
  }

  async getOrder(id: string): Promise<OrderWithItems | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        product: products,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    return {
      ...order,
      items: items,
    };
  }

  async getUserOrders(userId: string): Promise<OrderWithItems[]> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
    const ordersWithItems: OrderWithItems[] = [];

    for (const order of userOrders) {
      const items = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          product: products,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      ordersWithItems.push({
        ...order,
        items: items,
      });
    }

    return ordersWithItems;
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems> {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();

    const createdItems = [];
    for (const item of items) {
      const [orderItem] = await db
        .insert(orderItems)
        .values({
          ...item,
          orderId: newOrder.id,
        })
        .returning();

      const [product] = await db.select().from(products).where(eq(products.id, item.productId));

      if (product) {
        createdItems.push({
          ...orderItem,
          product,
        });

        // Update stock for physical products
        if (product.type === "physical" && product.stock !== null) {
          await db
            .update(products)
            .set({ stock: product.stock - item.quantity })
            .where(eq(products.id, product.id));
        }
      }
    }

    return {
      ...newOrder,
      items: createdItems,
    };
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }

  async getAdminConfig(): Promise<AdminConfigDB | undefined> {
    const [config] = await db.select().from(adminConfig).limit(1);
    return config || undefined;
  }

  async saveAdminConfig(config: InsertAdminConfigDB): Promise<AdminConfigDB> {
    const existingConfig = await this.getAdminConfig();

    if (existingConfig) {
      const [updatedConfig] = await db
        .update(adminConfig)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(eq(adminConfig.id, existingConfig.id))
        .returning();
      return updatedConfig;
    } else {
      const [newConfig] = await db
        .insert(adminConfig)
        .values(config)
        .returning();
      return newConfig;
    }
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    await db.update(users).set({ password: newPassword }).where(eq(users.id, userId));
  }

  async createPasswordRecoveryToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  async validatePasswordRecoveryToken(token: string): Promise<string | null> {
    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    if (result.length === 0) return null;

    const resetToken = result[0];
    if (resetToken.expiresAt < new Date()) {
      // Token expired, delete it
      await this.deletePasswordRecoveryToken(token);
      return null;
    }

    return resetToken.userId;
  }

  async deletePasswordRecoveryToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }
}

export const storage = new DatabaseStorage();