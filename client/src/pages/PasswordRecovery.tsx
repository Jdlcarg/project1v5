
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";

const recoverySchema = z.object({
  email: z.string().email("Email inválido"),
});

const resetSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirma tu contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RecoveryForm = z.infer<typeof recoverySchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function PasswordRecovery() {
  const { toast } = useToast();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");

  const {
    register: registerRecovery,
    handleSubmit: handleSubmitRecovery,
    formState: { errors: recoveryErrors },
  } = useForm<RecoveryForm>({
    resolver: zodResolver(recoverySchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const requestRecoveryMutation = useMutation({
    mutationFn: async (data: RecoveryForm) => {
      const response = await apiRequest("POST", "/api/auth/password-recovery", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Email enviado",
        description: "Se ha enviado un email con instrucciones para recuperar tu contraseña",
      });
      setEmail(data.email);
      setStep("reset");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar email de recuperación",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetForm) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada exitosamente",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar contraseña",
        variant: "destructive",
      });
    },
  });

  const onRequestRecovery = (data: RecoveryForm) => {
    requestRecoveryMutation.mutate(data);
  };

  const onResetPassword = (data: ResetForm) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="flex items-center space-x-2 text-mint hover:text-mint/80">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-mint/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-mint" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {step === "request" ? "Recuperar Contraseña" : "Nueva Contraseña"}
            </CardTitle>
            <p className="text-gray-600">
              {step === "request" 
                ? "Ingresa tu email para recibir instrucciones"
                : "Ingresa el token recibido y tu nueva contraseña"
              }
            </p>
          </CardHeader>
          <CardContent>
            {step === "request" ? (
              <form onSubmit={handleSubmitRecovery(onRequestRecovery)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...registerRecovery("email")}
                    placeholder="tu@email.com"
                  />
                  {recoveryErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{recoveryErrors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={requestRecoveryMutation.isPending}
                  className="w-full btn-gradient text-white"
                >
                  {requestRecoveryMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Enviando...
                    </div>
                  ) : (
                    "Enviar Email de Recuperación"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmitReset(onResetPassword)} className="space-y-4">
                <div>
                  <Label htmlFor="token">Token de Recuperación</Label>
                  <Input
                    id="token"
                    {...registerReset("token")}
                    placeholder="Token recibido por email"
                  />
                  {resetErrors.token && (
                    <p className="text-red-500 text-sm mt-1">{resetErrors.token.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...registerReset("newPassword")}
                    placeholder="Nueva contraseña"
                  />
                  {resetErrors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">{resetErrors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...registerReset("confirmPassword")}
                    placeholder="Confirma tu contraseña"
                  />
                  {resetErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{resetErrors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="w-full btn-gradient text-white"
                >
                  {resetPasswordMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Actualizando...
                    </div>
                  ) : (
                    "Actualizar Contraseña"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("request")}
                  className="w-full"
                >
                  Solicitar nuevo token
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
