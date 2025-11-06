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
      {/* Left Side - Welcome Section */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 items-center justify-center relative overflow-hidden">
        {/* Padrão de fundo decorativo com círculos */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full border-4 border-primary-foreground"></div>
          <div className="absolute top-40 right-32 w-24 h-24 rounded-full border-4 border-primary-foreground"></div>
          <div className="absolute bottom-32 left-40 w-40 h-40 rounded-full border-4 border-primary-foreground"></div>
          <div className="absolute bottom-20 right-20 w-20 h-20 rounded-full border-4 border-primary-foreground"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-primary-foreground"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMGgxdjQwaC0xek0wIDIwdjFoNDB2LTF6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 text-primary-foreground max-w-lg">
          {/* Logo com destaque */}
          <div className="mb-12 animate-fade-in">
            <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-2xl shadow-elegant">
              <img src={logo} alt="Cirúrgica Fernandes" className="h-12 object-contain" />
            </div>
          </div>
          
          {/* Título principal */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-primary-foreground/80 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Bem-vindo ao
            </h1>
            <h2 className="text-6xl font-bold leading-tight animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Sistema de Gestão
            </h2>
            <h3 className="text-5xl font-bold text-accent drop-shadow-lg animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Cirúrgica Fernandes
            </h3>
          </div>
          
          {/* Descrição */}
          <p className="text-primary-foreground/80 text-lg leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Plataforma completa para gestão de clientes, vendas, cotações EDI, licitações e muito mais. 
            Tudo integrado em um único lugar.
          </p>
          
          {/* Features badges */}
          <div className="flex flex-wrap gap-2 mt-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">CRM</span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">EDI</span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">IA</span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">WhatsApp</span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">Tickets</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-subtle">
        <Card className="w-full max-w-md p-10 shadow-elegant bg-card/95 backdrop-blur border-border/50">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? "Login" : "Criar Conta"}
            </h3>
            <p className="text-muted-foreground text-base">
              {isLogin ? "Entre com suas credenciais para acessar" : "Preencha os dados para criar sua conta"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 h-12 bg-background border-input"
                  {...(isLogin ? loginForm.register("email") : signupForm.register("email"))}
                />
              </div>
              {(isLogin ? loginForm.formState.errors.email : signupForm.formState.errors.email) && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {isLogin ? loginForm.formState.errors.email?.message : signupForm.formState.errors.email?.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-background border-input"
                  {...(isLogin ? loginForm.register("password") : signupForm.register("password"))}
                />
              </div>
              {(isLogin ? loginForm.formState.errors.password : signupForm.formState.errors.password) && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {isLogin ? loginForm.formState.errors.password?.message : signupForm.formState.errors.password?.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-background border-input"
                    {...signupForm.register("confirmPassword")}
                  />
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {signupForm.formState.errors.confirmPassword.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base"
              disabled={loading}
            >
              {loading ? "Carregando..." : isLogin ? "LOGIN" : "CADASTRAR"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-muted-foreground">
              {isLogin ? "Novo por aqui? " : "Já tem uma conta? "}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-semibold transition-colors"
            >
              {isLogin ? "Criar conta" : "Fazer login"}
            </button>
          </div>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              © 2025 Cirúrgica Fernandes. Todos os direitos reservados.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
