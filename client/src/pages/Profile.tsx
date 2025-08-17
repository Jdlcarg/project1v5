import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { OrderWithItems } from "@shared/schema";
import {
  User,
  ShoppingBag,
  Lock,
  Edit,
  Package,
  Smartphone,
  ArrowLeft
} from "lucide-react";
import { Link, useLocation } from "wouter";

const profileSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirma tu nueva contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<"profile" | "orders" | "password">("profile");

  // Redirect if not logged in
  if (!user) {
    setLocation("/");
    return null;
  }

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    enabled: !!user?.id,
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest("PUT", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada exitosamente",
      });
      // Update auth context with new user data
      localStorage.setItem("auth_user", JSON.stringify(data.user));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar perfil",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const response = await apiRequest("PUT", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      });
      resetPassword();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al cambiar contraseña",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "shipped": return "bg-purple-500";
      case "delivered": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pendiente";
      case "confirmed": return "Confirmado";
      case "shipped": return "Enviado";
      case "delivered": return "Entregado";
      default: return status;
    }
  };

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="flex items-center space-x-2 text-mint hover:text-mint/80">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
          <p className="text-gray-600">Gestiona tu información personal y pedidos</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab("profile")}
              className={`px-6 py-4 font-medium text-sm flex items-center space-x-2 ${
                selectedTab === "profile"
                  ? "text-mint border-b-2 border-mint"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Perfil</span>
            </button>
            <button
              onClick={() => setSelectedTab("orders")}
              className={`px-6 py-4 font-medium text-sm flex items-center space-x-2 ${
                selectedTab === "orders"
                  ? "text-mint border-b-2 border-mint"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mis Pedidos</span>
            </button>
            <button
              onClick={() => setSelectedTab("password")}
              className={`px-6 py-4 font-medium text-sm flex items-center space-x-2 ${
                selectedTab === "password"
                  ? "text-mint border-b-2 border-mint"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Cambiar Contraseña</span>
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {selectedTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-6 h-6 text-mint" />
                <span>Información Personal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    {...registerProfile("name")}
                  />
                  {profileErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{profileErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...registerProfile("email")}
                  />
                  {profileErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{profileErrors.email.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="btn-gradient text-white flex items-center space-x-2"
                  >
                    {updateProfileMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                    <span>
                      {updateProfileMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Orders Tab */}
        {selectedTab === "orders" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Mis Pedidos</h2>

            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600 mb-4">No tienes pedidos aún</p>
                  <Link href="/products">
                    <Button className="btn-gradient text-white">Ver Productos</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Pedido #{order.id.slice(-8)}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {new Date(order.createdAt).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-mint">{formatPrice(order.total)}</p>
                          <Badge className={`${getStatusColor(order.status)} text-white mt-2`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Productos:</h4>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <div>
                                  <p className="font-medium">{item.product.name}</p>
                                  <div className="flex items-center space-x-2">
                                    <Badge className={item.product.type === "physical" ? "bg-orange-500" : "bg-sky"}>
                                      {item.product.type === "physical" ? (
                                        <>
                                          <Package className="w-3 h-3 mr-1" />
                                          Físico
                                        </>
                                      ) : (
                                        <>
                                          <Smartphone className="w-3 h-3 mr-1" />
                                          Digital
                                        </>
                                      )}
                                    </Badge>
                                    <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                                  </div>
                                </div>
                              </div>
                              <p className="font-semibold text-mint">
                                {formatPrice((parseFloat(item.price) * item.quantity).toString())}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Password Tab */}
        {selectedTab === "password" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-6 h-6 text-mint" />
                <span>Cambiar Contraseña</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...registerPassword("currentPassword")}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...registerPassword("newPassword")}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...registerPassword("confirmPassword")}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="btn-gradient text-white flex items-center space-x-2"
                  >
                    {changePasswordMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>
                      {changePasswordMutation.isPending ? "Cambiando..." : "Cambiar Contraseña"}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}