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
import logo from "@/assets/logo-convertiai.png";
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Marca que acabou de logar para exibir o splash na próxima tela
        sessionStorage.setItem('just_logged_in', 'true');
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
        password: data.password
      });
      if (error) throw error;

      // Garante que o splash será exibido após o redirecionamento
      sessionStorage.setItem('just_logged_in', 'true');

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (data: SignupInput) => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você já pode fazer login."
      });

      // Limpar formulário e alternar para login
      signupForm.reset();
      setIsLogin(true);
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Não foi possível criar sua conta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = isLogin ? loginForm.handleSubmit(handleLogin) : signupForm.handleSubmit(handleSignup);
  return <div className="min-h-screen flex">
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2d5f7f] to-[#3fb39d]">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#3fb39d]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#1e3a5f]/30 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '1s'
      }}></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-40 left-40 w-4 h-4 border-2 border-white/30 rotate-45"></div>
        <div className="absolute top-60 right-60 w-3 h-3 bg-[#3fb39d]/40 rounded-full"></div>
        <div className="absolute bottom-40 right-40 w-6 h-6 border-2 border-white/20 rounded-full"></div>
        
        <div className="relative z-10 text-white max-w-lg px-16 flex flex-col justify-center">
          {/* Logo */}
          <div className="mb-16 animate-fade-in">
            <img src={logo} alt="ConvertiAI" className="h-16 object-contain opacity-95 drop-shadow-lg" />
          </div>
          
          {/* Title with gradient text */}
          <div className="space-y-6 mb-12">
            <div className="inline-block">
              <h1 className="text-6xl font-bold leading-tight tracking-tight mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Gestão Inteligente
              </h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-[#3fb39d] to-transparent rounded-full"></div>
            </div>
            <p className="text-xl text-white/70 leading-relaxed font-light">
              Tecnologia e IA aplicadas à gestão comercial e operacional para impulsionar resultados.
            </p>
          </div>
          
          {/* Modern features grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-[#3fb39d]/20 flex items-center justify-center mb-3">
                <div className="w-4 h-4 rounded bg-[#3fb39d]"></div>
              </div>
              <p className="text-sm font-medium">CRM Avançado</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-[#3fb39d]/20 flex items-center justify-center mb-3">
                <div className="w-4 h-4 rounded bg-[#3fb39d]"></div>
              </div>
              <p className="text-sm font-medium">IA & Automação</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-[#3fb39d]/20 flex items-center justify-center mb-3">
                <div className="w-4 h-4 rounded bg-[#3fb39d]"></div>
              </div>
              <p className="text-sm font-medium">Portais de vendas da Saúde</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-[#3fb39d]/20 flex items-center justify-center mb-3">
                <div className="w-4 h-4 rounded bg-[#3fb39d]"></div>
              </div>
              <p className="text-sm font-medium">Vendas no WhatsApp </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="w-full max-w-[460px]">
          {/* Glass card */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-10">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img src={logo} alt="ConvertiAI" className="h-12 object-contain" />
            </div>
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {isLogin ? "Bem-vindo" : "Criar conta"}
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                {isLogin ? "Acesse sua conta para continuar" : "Preencha os dados para começar"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                  <Input id="email" type="email" placeholder="seu.email@empresa.com" className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all" {...isLogin ? loginForm.register("email") : signupForm.register("email")} />
                </div>
                {(isLogin ? loginForm.formState.errors.email : signupForm.formState.errors.email) && <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {isLogin ? loginForm.formState.errors.email?.message : signupForm.formState.errors.email?.message}
                  </p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all" {...isLogin ? loginForm.register("password") : signupForm.register("password")} />
                </div>
                {(isLogin ? loginForm.formState.errors.password : signupForm.formState.errors.password) && <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {isLogin ? loginForm.formState.errors.password?.message : signupForm.formState.errors.password?.message}
                  </p>}
              </div>

              {!isLogin && <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirmar senha</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                    <Input id="confirmPassword" type="password" placeholder="••••••••" className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all" {...signupForm.register("confirmPassword")} />
                  </div>
                  {signupForm.formState.errors.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {signupForm.formState.errors.confirmPassword.message}
                    </p>}
                </div>}

              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-[#1e3a5f] to-[#3fb39d] hover:from-[#1a3251] hover:to-[#38a68f] text-white font-medium shadow-lg transition-all hover:shadow-xl" disabled={loading}>
                {loading ? "Processando..." : isLogin ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">
                  {isLogin ? "Novo por aqui?" : "Já possui conta?"}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-sm font-medium transition-colors py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="text-muted-foreground">{isLogin ? "Criar nova conta" : "Fazer login"}</span>
            </button>
          </div>
          
          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao continuar, você concorda com nossos Termos de Serviço
          </p>
        </div>
      </div>
    </div>;
}