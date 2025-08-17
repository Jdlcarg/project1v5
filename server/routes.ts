import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertOrderSchema, insertOrderItemSchema, insertProductSchema, insertAdminConfigSchema } from "@shared/schema";
import { z } from "zod";
import nodemailer from "nodemailer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      // In production, use proper JWT tokens
      const token = `mock_token_${user.id}`;
      res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    } catch (error) {
      res.status(400).json({ message: "Datos de login inválidos" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }
      
      const userData = {
        email,
        password,
        name,
        role: "user" as const,
      };
      
      const user = await storage.createUser(userData);
      res.status(201).json({ 
        message: "Usuario registrado exitosamente",
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      });
    } catch (error) {
      res.status(400).json({ message: "Datos de registro inválidos" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Sesión cerrada correctamente" });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      const token = authHeader.substring(7);
      if (!token.startsWith("mock_token_")) {
        return res.status(401).json({ message: "Token inválido" });
      }
      
      const userId = token.replace("mock_token_", "");
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Usuario no encontrado" });
      }
      
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (error) {
      console.error("Error in /api/auth/me:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    try {
      await authenticateAdmin(req);
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de producto inválidos", errors: error.errors });
      }
      
      const message = error instanceof Error ? error.message : "Error al crear producto";
      const status = message === "No autorizado" || message === "Token inválido" ? 401 : 
                    message === "Acceso denegado" ? 403 : 500;
      res.status(status).json({ message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      await authenticateAdmin(req);
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de producto inválidos", errors: error.errors });
      }
      
      const message = error instanceof Error ? error.message : "Error al actualizar producto";
      const status = message === "No autorizado" || message === "Token inválido" ? 401 : 
                    message === "Acceso denegado" ? 403 : 500;
      res.status(status).json({ message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await authenticateAdmin(req);
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      
      res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al eliminar producto";
      const status = message === "No autorizado" || message === "Token inválido" ? 401 : 
                    message === "Acceso denegado" ? 403 : 500;
      res.status(status).json({ message });
    }
  });

  // Orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      const token = authHeader.substring(7);
      const userId = token.replace("mock_token_", "");
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Usuario no encontrado" });
      }
      
      let orders;
      if (user.role === "admin") {
        orders = await storage.getOrders();
      } else {
        orders = await storage.getUserOrders(userId);
      }
      
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener órdenes" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderSchema = insertOrderSchema.extend({
        items: z.array(insertOrderItemSchema),
      });
      
      const { items, ...orderData } = orderSchema.parse(req.body);
      const order = await storage.createOrder(orderData, items);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Datos de orden inválidos" });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      await authenticateAdmin(req);
      const { status } = z.object({ status: z.string() }).parse(req.body);
      const order = await storage.updateOrderStatus(req.params.id, status);
      
      if (!order) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de estado inválidos", errors: error.errors });
      }
      
      const message = error instanceof Error ? error.message : "Error al actualizar estado de orden";
      const status = message === "No autorizado" || message === "Token inválido" ? 401 : 
                    message === "Acceso denegado" ? 403 : 500;
      res.status(status).json({ message });
    }
  });

  // Helper function for admin authentication
  const authenticateAdmin = async (req: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No autorizado");
    }
    
    const token = authHeader.substring(7);
    if (!token.startsWith("mock_token_")) {
      throw new Error("Token inválido");
    }
    
    const userId = token.replace("mock_token_", "");
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    
    if (user.role !== "admin") {
      throw new Error("Acceso denegado");
    }
    
    return user;
  };

  // Admin configuration routes
  app.get("/api/admin/config", async (req, res) => {
    try {
      await authenticateAdmin(req);
      const config = await storage.getAdminConfig();
      res.json(config || {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al obtener configuración";
      const status = message === "No autorizado" || message === "Token inválido" ? 401 : 
                    message === "Acceso denegado" ? 403 : 500;
      res.status(status).json({ message });
    }
  });

  app.post("/api/admin/config", async (req, res) => {
    try {
      await authenticateAdmin(req);
      const configData = insertAdminConfigSchema.parse(req.body);
      const config = await storage.saveAdminConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de configuración inválidos", errors: error.errors });
      }
      
      const message = error instanceof Error ? error.message : "Error al guardar configuración";
      const status = message === "No autorizado" || message === "Token inválido" ? 401 : 
                    message === "Acceso denegado" ? 403 : 500;
      res.status(status).json({ message });
    }
  });

  // Password recovery routes
  app.post("/api/auth/password-recovery", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Generate recovery token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await storage.createPasswordRecoveryToken(user.id, token);

      // Send email with SMTP config
      const config = await storage.getAdminConfig();
      if (config?.smtpEmail && config?.smtpPassword && config?.smtpHost && config?.smtpPort) {
        try {
          const transporter = nodemailer.createTransporter({
            host: config.smtpHost,
            port: parseInt(config.smtpPort),
            secure: parseInt(config.smtpPort) === 465,
            auth: {
              user: config.smtpEmail,
              pass: config.smtpPassword,
            },
          });

          const mailOptions = {
            from: config.smtpEmail,
            to: email,
            subject: "Recuperación de Contraseña",
            html: `
              <h2>Recuperación de Contraseña</h2>
              <p>Hola ${user.name},</p>
              <p>Has solicitado recuperar tu contraseña. Usa el siguiente token para crear una nueva contraseña:</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <strong style="font-size: 18px; letter-spacing: 2px;">${token}</strong>
              </div>
              <p>Este token expirará en 1 hora.</p>
              <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
            `,
          };

          await transporter.sendMail(mailOptions);
          console.log(`Recovery email sent to ${email} with token: ${token}`);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Still show token in console as fallback
          console.log(`Recovery token for ${email}: ${token}`);
        }
      } else {
        // Fallback: show token in console if SMTP not configured
        console.log(`Recovery token for ${email}: ${token} (SMTP not configured)`);
      }

      res.json({ message: "Email de recuperación enviado", email });
    } catch (error) {
      console.error("Password recovery error:", error);
      res.status(400).json({ message: "Error al procesar solicitud" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }).parse(req.body);

      const userId = await storage.validatePasswordRecoveryToken(token);
      if (!userId) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      await storage.updateUserPassword(userId, newPassword);
      await storage.deletePasswordRecoveryToken(token);

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      res.status(400).json({ message: "Error al actualizar contraseña" });
    }
  });

  // Profile update routes
  app.put("/api/auth/profile", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      const token = authHeader.substring(7);
      const userId = token.replace("mock_token_", "");
      
      const { name, email } = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }).parse(req.body);

      const updatedUser = await storage.updateUserProfile(userId, { name, email });
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.json({ 
        message: "Perfil actualizado exitosamente",
        user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role }
      });
    } catch (error) {
      res.status(400).json({ message: "Error al actualizar perfil" });
    }
  });

  app.put("/api/auth/change-password", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No autorizado" });
      }
      
      const token = authHeader.substring(7);
      if (!token.startsWith("mock_token_")) {
        return res.status(401).json({ message: "Token inválido" });
      }
      
      const userId = token.replace("mock_token_", "");
      
      const { currentPassword, newPassword } = z.object({
        currentPassword: z.string().min(1, "Contraseña actual requerida"),
        newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
      }).parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Usuario no encontrado" });
      }
      
      if (user.password !== currentPassword) {
        return res.status(400).json({ message: "Contraseña actual incorrecta" });
      }

      await storage.updateUserPassword(userId, newPassword);
      console.log(`Password changed successfully for user: ${user.email}`);
      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Datos inválidos", 
          errors: error.errors.map(e => e.message).join(", ")
        });
      }
      console.error("Change password error:", error);
      res.status(400).json({ message: "Error al cambiar contraseña" });
    }
  });

  // MercadoPago routes
  app.get("/api/mercadopago/config", async (req, res) => {
    try {
      const config = await storage.getAdminConfig();
      res.json({
        publicKey: config?.mpPublicKey || null,
        configured: !!(config?.mpAccessToken && config?.mpPublicKey)
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener configuración" });
    }
  });

  app.post("/api/mercadopago/create-payment", async (req, res) => {
    try {
      const config = await storage.getAdminConfig();
      if (!config?.mpAccessToken) {
        return res.status(400).json({ message: "MercadoPago no configurado" });
      }

      // TODO: Implement MercadoPago SDK integration
      // For now, return a mock response
      const paymentData = {
        init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mock_preference_id",
        id: "mock_payment_id"
      };

      res.json(paymentData);
    } catch (error) {
      res.status(400).json({ message: "Error al crear pago" });
    }
  });

  // Database health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const products = await storage.getProducts();
      const users = await storage.getUserByEmail("admin@example.com");
      
      res.json({
        status: "healthy",
        database: "connected",
        products_count: products.length,
        admin_exists: !!users,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
