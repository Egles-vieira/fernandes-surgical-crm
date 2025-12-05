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
import heroImage from "@/assets/auth-hero-professional.jpg";
import { TypewriterText } from "@/components/TypewriterText";
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        sessionStorage.setItem("just_logged_in", "true");
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

      sessionStorage.setItem("just_logged_in", "true");

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
  const handleSubmit = isLogin ? loginForm.handleSubmit(handleLogin) : signupForm.handleSubmit(handleSignup);
  return (
    <div className="min-h-screen flex font-sans" style={{ fontFamily: 'var(--font, Lexend, sans-serif)' }}>
      {/* Left Side - Brand Section */}
      <div className="hidden lg:flex lg:w-[62%] relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />

        {/* Subtle dark gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        ></div>

        {/* Floating shapes for depth */}
        <div
          className="absolute top-20 right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl"
        ></div>
        <div
          className="absolute bottom-32 left-20 w-96 h-96 bg-black/10 rounded-full blur-3xl"
        ></div>

        <div className="relative z-10 text-white w-full px-16 flex flex-col justify-center py-20">
          {/* Logo with glow effect */}
          <div className="mb-20 animate-fade-in">
            <img src={logo} alt="ConvertiAI" className="h-14 object-contain drop-shadow-2xl" />
          </div>

          {/* Animated Typewriter Title */}
          <div className="space-y-8 mb-16">
            <div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight mb-5">
                <TypewriterText
                  texts={[
                    "Transforme atendimento em resultado",
                    "Gestão inteligente de vendas",
                    "Automatize seu fluxo comercial",
                    "WhatsApp integrado ao CRM",
                  ]}
                  typingSpeed={80}
                  deletingSpeed={40}
                  pauseDuration={3000}
                  className="bg-gradient-to-r from-white via-white to-[#3fb39d] bg-clip-text text-transparent"
                />
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-[#3fb39d] via-[#3fb39d] to-transparent rounded-full shadow-lg shadow-[#3fb39d]/50"></div>
            </div>
            <p className="text-lg text-white/70 leading-relaxed font-light max-w-xl">
              Plataforma completa de gestão comercial com IA integrada. Automatize processos, organize cotações e
              potencialize vendas com inteligência artificial.
            </p>
          </div>

          {/* Premium features grid */}
          <div className="grid grid-cols-2 gap-5">
            <div className="group bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-[#3fb39d]/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#3fb39d]/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3fb39d]/20 to-[#3fb39d]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3fb39d] to-[#2a9d82] shadow-lg shadow-[#3fb39d]/50"></div>
              </div>
              <p className="text-base font-semibold mb-1">CRM Avançado</p>
              <p className="text-xs text-white/60">Gestão completa de clientes</p>
            </div>
            <div className="group bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-[#3fb39d]/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#3fb39d]/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3fb39d]/20 to-[#3fb39d]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3fb39d] to-[#2a9d82] shadow-lg shadow-[#3fb39d]/50"></div>
              </div>
              <p className="text-base font-semibold mb-1">IA & Automação</p>
              <p className="text-xs text-white/60">Inteligência artificial integrada</p>
            </div>
            <div className="group bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-[#3fb39d]/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#3fb39d]/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3fb39d]/20 to-[#3fb39d]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3fb39d] to-[#2a9d82] shadow-lg shadow-[#3fb39d]/50"></div>
              </div>
              <p className="text-base font-semibold mb-1">Cotações EDI</p>
              <p className="text-xs text-white/60">Análise automática de cotações</p>
            </div>
            <div className="group bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-[#3fb39d]/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#3fb39d]/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3fb39d]/20 to-[#3fb39d]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3fb39d] to-[#2a9d82] shadow-lg shadow-[#3fb39d]/50"></div>
              </div>
              <p className="text-base font-semibold mb-1">WhatsApp Business</p>
              <p className="text-xs text-white/60">Vendas direto pelo WhatsApp</p>
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
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-mail
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@empresa.com"
                    className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                    {...(isLogin ? loginForm.register("email") : signupForm.register("email"))}
                  />
                </div>
                {(isLogin ? loginForm.formState.errors.email : signupForm.formState.errors.email) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {isLogin ? loginForm.formState.errors.email?.message : signupForm.formState.errors.email?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                    {...(isLogin ? loginForm.register("password") : signupForm.register("password"))}
                  />
                </div>
                {(isLogin ? loginForm.formState.errors.password : signupForm.formState.errors.password) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {isLogin
                      ? loginForm.formState.errors.password?.message
                      : signupForm.formState.errors.password?.message}
                  </p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirmar senha
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                      {...signupForm.register("confirmPassword")}
                    />
                  </div>
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {signupForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#1e3a5f] to-[#3fb39d] hover:from-[#1a3251] hover:to-[#38a68f] text-white font-medium shadow-lg transition-all hover:shadow-xl"
                disabled={loading}
              >
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
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-sm font-medium transition-colors py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="text-muted-foreground">{isLogin ? "Criar nova conta" : "Fazer login"}</span>
            </button>
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao continuar, você concorda com nossos Termos de Serviço
          </p>
        </div>
      </div>
    </div>
  );
}
