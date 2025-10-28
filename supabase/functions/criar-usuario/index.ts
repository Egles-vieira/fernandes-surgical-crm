import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

interface CreateUserRequest {
  email: string;
  password: string;
  roles: string[];
  profile: {
    nome_exibicao?: string;
    foto_perfil_url?: string;
    numero_celular?: string;
    telefone?: string;
    ramal?: string;
    codigo_vendedor?: string;
    cargo?: string;
    vendedor_vinculado_id?: string;
    equipe_id?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente com service_role para operações de admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar se o usuário que está fazendo a requisição é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verificar se o usuário é admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Only admins can create users');
    }

    const { email, password, roles, profile }: CreateUserRequest = await req.json();

    // Criar o usuário
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      throw createError;
    }

    // Criar perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('perfis_usuario')
      .insert({
        id: newUser.user.id,
        primeiro_nome: profile.nome_exibicao?.split(' ')[0],
        sobrenome: profile.nome_exibicao?.split(' ').slice(1).join(' '),
        foto_perfil_url: profile.foto_perfil_url,
        numero_celular: profile.numero_celular,
        telefone: profile.telefone,
        ramal: profile.ramal,
        codigo_vendedor: profile.codigo_vendedor,
        cargo: profile.cargo,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Adicionar roles ao novo usuário
    if (roles && roles.length > 0) {
      const roleInserts = roles.map(role => ({
        user_id: newUser.user.id,
        role,
        created_by: user.id,
        vendedor_vinculado_id: role === 'backoffice' ? profile.vendedor_vinculado_id : null,
        equipe_id: role === 'lider' ? profile.equipe_id : null,
      }));

      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) {
        console.error('Error adding roles:', rolesError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});