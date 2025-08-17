import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  // Mocking loginMutation for the sake of applying the change as requested.
  // In a real scenario, this would be replaced by an actual mutation hook.
  const loginMutation = {
    isPending: isLoading,
    mutate: async (data: LoginForm) => {
      setIsLoading(true);
      try {
        await login(data.email, data.password);
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente",
        });
        reset();
        onClose();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Credenciales inválidas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    // Using loginMutation.mutate to simulate the intended change
    loginMutation.mutate(data);
  };

  // Dummy state to satisfy the onChange handler for the button click
  const [isOpenState, setIsOpen] = useState(isOpen);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Iniciar Sesión</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@test.com"
              {...register("email")}
              className="w-full"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="admin123"
              {...register("password")}
              className="w-full"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full btn-gradient text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300"
          >
            {loginMutation.isPending ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Iniciando sesión...
              </div>
            ) : (
              "Ingresar"
            )}
          </Button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                // Navigate to password recovery page
                window.location.href = "/password-recovery";
              }}
              className="text-mint hover:text-mint/80 text-sm"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>

        <div className="pt-6 border-t space-y-3">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                data-testid="link-switch-to-register"
                onClick={onSwitchToRegister}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Admin demo: admin@test.com / admin123</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}