import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn, AlertCircle, User, Lock, Mail } from "lucide-react";
import { loginSchema, signupSchema, LoginInput, SignupInput } from "@/lib/validations/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logo from "@/assets/logo-cfernandes.webp";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (data: LoginInput) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupInput) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você já pode fazer login.",
      });
      
      // Limpar formulário e alternar para login
      signupForm.reset();
      setIsLogin(true);
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Não foi possível criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isLogin 
    ? loginForm.handleSubmit(handleLogin)
    : signupForm.handleSubmit(handleSignup);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-16 items-center justify-center relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/5 to-black/10"></div>
        
        {/* Minimal geometric pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 border border-primary-foreground rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 border border-primary-foreground rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        <div className="relative z-10 text-primary-foreground max-w-lg space-y-12">
          {/* Logo Section */}
          <div className="space-y-8">
            <img src={logo} alt="Cirúrgica Fernandes" className="h-14 object-contain opacity-95" />
            
            <div className="w-12 h-1 bg-accent rounded-full"></div>
          </div>
          
          {/* Title Section */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Sistema de Gestão Empresarial
            </h1>
            <p className="text-xl text-primary-foreground/70 leading-relaxed font-light">
              Centralize a gestão comercial, operacional e relacionamento com clientes em uma única plataforma integrada.
            </p>
          </div>
          
          {/* Features List */}
          <div className="space-y-3 text-primary-foreground/80">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
              <span className="text-base">CRM e gestão de vendas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
              <span className="text-base">Cotações EDI com IA</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
              <span className="text-base">Atendimento e tickets</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
              <span className="text-base">Integração WhatsApp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[440px] space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {isLogin ? "Acesse sua conta" : "Criar nova conta"}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? "Entre com suas credenciais para continuar" : "Preencha os dados para começar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">E-mail corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com"
                  className="pl-10 h-11 bg-background border-input focus:border-primary"
                  {...(isLogin ? loginForm.register("email") : signupForm.register("email"))}
                />
              </div>
              {(isLogin ? loginForm.formState.errors.email : signupForm.formState.errors.email) && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {isLogin ? loginForm.formState.errors.email?.message : signupForm.formState.errors.email?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-background border-input focus:border-primary"
                  {...(isLogin ? loginForm.register("password") : signupForm.register("password"))}
                />
              </div>
              {(isLogin ? loginForm.formState.errors.password : signupForm.formState.errors.password) && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {isLogin ? loginForm.formState.errors.password?.message : signupForm.formState.errors.password?.message}
                </p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-background border-input focus:border-primary"
                    {...signupForm.register("confirmPassword")}
                  />
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={loading}
            >
              {loading ? "Processando..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                {isLogin ? "Não tem uma conta?" : "Já possui conta?"}
              </span>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-sm text-primary hover:underline font-medium transition-colors"
          >
            {isLogin ? "Criar nova conta" : "Fazer login"}
          </button>
        </div>
      </div>
    </div>
  );
}
