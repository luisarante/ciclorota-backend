import { supabaseAdmin } from '../config/supabase.js';

interface ProfileUpdateData {
  full_name?: string | null;
  avatar_url?: string | null;
}

export class ProfileService {
  async getUserProfile(userId: string) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Perfil não encontrado no sistema.');
    }

    const { count: checkinsCount } = await supabaseAdmin
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: certificate } = await supabaseAdmin
      .from('certificates')
      .select('issued_at')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      ...profile,
      estatisticas: {
        total_pontos_visitados: checkinsCount || 0,
        possui_certificado: !!certificate,
        data_certificado: certificate?.issued_at || null
      }
    };
  }

  async updateProfile(userId: string, data: ProfileUpdateData) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as ProfileUpdateData;

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhum campo válido foi enviado para atualização.');
    }

    const { data: updatedData, error } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id, full_name, avatar_url')
      .single();

    if (error) {
      throw new Error('Erro ao atualizar perfil: ' + error.message);
    }

    return updatedData;
  }

  async upsertProfile(userId: string, data: ProfileUpdateData) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as ProfileUpdateData;

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhum campo válido foi enviado para atualização.');
    }

    const { data: updatedData, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          ...payload
        },
        {
          onConflict: 'id'
        }
      )
      .select('id, full_name, avatar_url')
      .single();

    if (error) {
      throw new Error('Erro ao fazer upsert do perfil: ' + error.message);
    }

    return updatedData;
  }

  async getProfilesByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, updated_at')
      .in('id', userIds);

    if (error) {
      throw new Error('Erro ao buscar perfis por lista de IDs.');
    }

    return data ?? [];
  }
}
