import { supabase } from '../config/supabase.js';

export class ProfileService {
  async getUserProfile(userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Perfil não encontrado no sistema.');
    }

    const { count: checkinsCount } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: certificate } = await supabase
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

  async updateProfile(userId: string, data: { full_name?: string, avatar_url?: string }) {
    const { data: updatedData, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error('Erro ao atualizar perfil: ' + error.message);
    return updatedData;
  }
}