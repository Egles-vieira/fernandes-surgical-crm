import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Lock, Mail, Building2, Phone, User, ArrowLeft, Send, FileText } from "lucide-react";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import logo from "@/assets/logo-convertiai.png";

// Schema para formulário de contato comercial
const contatoComercialSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  empresa: z.string().min(2, "Informe o nome da empresa"),
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos").max(18, "CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  mensagem: z.string().optional(),
});

type ContatoComercialInput = z.infer<typeof contatoComercialSchema>;
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

  const contatoForm = useForm<ContatoComercialInput>({
    resolver: zodResolver(contatoComercialSchema),
    defaultValues: {
      nome: "",
      empresa: "",
      cnpj: "",
      email: "",
      telefone: "",
      mensagem: "",
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
  const handleContatoComercial = async (data: ContatoComercialInput) => {
    setLoading(true);
    try {
      // Inserir solicitação na tabela de solicitações de cadastro
      // Usando dados_coletados JSONB para armazenar os dados do formulário
      const { error } = await supabase.from("solicitacoes_cadastro").insert([
        {
          cnpj: data.cnpj.replace(/\D/g, ""), // Remove formatação
          status: "rascunho" as const,
          dados_coletados: {
            nome: data.nome,
            empresa: data.empresa,
            cnpj: data.cnpj,
            email: data.email,
            telefone: data.telefone,
            mensagem: data.mensagem || null,
            origem: "formulario_login",
            data_solicitacao: new Date().toISOString(),
          },
          observacoes: `Solicitação de acesso via login - ${data.nome} (${data.empresa})`,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Nossa equipe comercial entrará em contato em breve.",
      });

      contatoForm.reset();
      setIsLogin(true);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar solicitação",
        description: error.message || "Não foi possível enviar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isLogin ? loginForm.handleSubmit(handleLogin) : contatoForm.handleSubmit(handleContatoComercial);
  return (
    <div className="min-h-screen flex font-sans" style={{ fontFamily: "var(--font, Lexend, sans-serif)" }}>
      {/* Left Side - Brand Section with Gradient */}
      <div className="hidden lg:flex lg:w-[62%] relative overflow-hidden">
        {/* Base gradient - purple to electric blue (like DigitalOcean reference) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#5b4a99] via-[#4361c4] to-[#0066ff]" />
        
        {/* Soft pink/purple glow overlay in center-left */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_40%,rgba(168,130,200,0.4),transparent)]" />
        
        {/* Blue glow on the right */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_100%_60%,rgba(0,120,255,0.3),transparent)]" />

        {/* Content - centered like reference */}
        <div className="relative z-10 text-white w-full px-16 flex flex-col justify-center items-start py-20">
          {/* AI Sparkle Icon - simple like reference */}
          <div className="mb-10 animate-fade-in">
            <div className="w-14 h-14 relative">
              <svg viewBox="0 0 56 56" className="w-full h-full" fill="none">
                {/* Outer dashed circle */}
                <circle cx="28" cy="28" r="24" stroke="white" strokeWidth="1" strokeDasharray="4 3" className="opacity-60" />
                {/* Main sparkle star */}
                <path d="M28 12L30.5 24L42 27L30.5 30L28 42L25.5 30L14 27L25.5 24L28 12Z" fill="white" />
                {/* Small sparkles */}
                <circle cx="44" cy="16" r="3" fill="white" />
                <circle cx="44" cy="17" r="1.5" fill="white" className="opacity-70" />
                <circle cx="12" cy="40" r="2" fill="white" className="opacity-50" />
              </svg>
            </div>
          </div>

          {/* Main headline with italic style - matching reference */}
          <div className="space-y-5 mb-10">
            <h1 className="text-[2.5rem] lg:text-[2.75rem] font-semibold leading-[1.2] tracking-tight">
              <span className="italic text-white">
                Apresentando ConvertiAI
              </span>
              <br />
              <span className="italic text-white">
                CRM Inteligente com IA
              </span>
            </h1>
            
            <p className="text-base text-white/75 leading-relaxed font-normal max-w-md">
              ConvertiAI unifica gestão de vendas, cotações EDI e atendimento WhatsApp em uma única plataforma inteligente—para que você possa vender mais, automatizar processos e crescer sem limites.
            </p>
          </div>

          {/* CTA Button - white with blue text like reference */}
          <div>
            <a 
              href="https://convertiai.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0066ff] text-sm font-semibold rounded-md hover:bg-white/95 transition-all duration-200 border border-[#0066ff]/20"
            >
              Saiba mais
            </a>
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
              {!isLogin && (
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao login
                </button>
              )}
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {isLogin ? "Bem-vindo" : "Fale com o Comercial"}
                </h2>
              </div>
              <p className="text-muted-foreground text-sm">
                {isLogin ? "Acesse sua conta para continuar" : "Preencha seus dados e nossa equipe entrará em contato"}
              </p>
            </div>

            {isLogin ? (
              /* Formulário de Login */
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
                      {...loginForm.register("email")}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {loginForm.formState.errors.email?.message}
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
                      {...loginForm.register("password")}
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {loginForm.formState.errors.password?.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-[#1e3a5f] to-[#3fb39d] hover:from-[#1a3251] hover:to-[#38a68f] text-white font-medium shadow-lg transition-all hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? "Processando..." : "Entrar"}
                </Button>
              </form>
            ) : (
              /* Formulário de Contato Comercial */
              <form onSubmit={contatoForm.handleSubmit(handleContatoComercial)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                      Seu nome *
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                      <Input
                        id="nome"
                        placeholder="João Silva"
                        className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                        {...contatoForm.register("nome")}
                      />
                    </div>
                    {contatoForm.formState.errors.nome && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {contatoForm.formState.errors.nome?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="empresa" className="text-sm font-medium text-foreground">
                      Empresa *
                    </Label>
                    <div className="relative group">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                      <Input
                        id="empresa"
                        placeholder="Sua Empresa LTDA"
                        className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                        {...contatoForm.register("empresa")}
                      />
                    </div>
                    {contatoForm.formState.errors.empresa && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {contatoForm.formState.errors.empresa?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="cnpj" className="text-sm font-medium text-foreground">
                      CNPJ *
                    </Label>
                    <div className="relative group">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                        {...contatoForm.register("cnpj")}
                      />
                    </div>
                    {contatoForm.formState.errors.cnpj && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {contatoForm.formState.errors.cnpj?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contato-email" className="text-sm font-medium text-foreground">
                    E-mail *
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                    <Input
                      id="contato-email"
                      type="email"
                      placeholder="seu.email@empresa.com"
                      className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                      {...contatoForm.register("email")}
                    />
                  </div>
                  {contatoForm.formState.errors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {contatoForm.formState.errors.email?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-sm font-medium text-foreground">
                    Telefone / WhatsApp *
                  </Label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[#3fb39d]" />
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      className="pl-10 h-11 bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all"
                      {...contatoForm.register("telefone")}
                    />
                  </div>
                  {contatoForm.formState.errors.telefone && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {contatoForm.formState.errors.telefone?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensagem" className="text-sm font-medium text-foreground">
                    Mensagem <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    id="mensagem"
                    placeholder="Conte-nos sobre sua empresa e necessidades..."
                    className="min-h-[80px] bg-background/50 border-input focus:border-[#3fb39d] focus:ring-1 focus:ring-[#3fb39d] transition-all resize-none"
                    {...contatoForm.register("mensagem")}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-[#1e3a5f] to-[#3fb39d] hover:from-[#1a3251] hover:to-[#38a68f] text-white font-medium shadow-lg transition-all hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Solicitação
                    </>
                  )}
                </Button>
              </form>
            )}

            {isLogin && (
              <>
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">Novo por aqui?</span>
                  </div>
                </div>

                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="w-full text-center text-sm font-medium transition-colors py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="text-muted-foreground">Solicitar acesso</span>
                </button>
              </>
            )}
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
