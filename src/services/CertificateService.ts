import { supabase } from '../config/supabase.js';

export class CertificateService {
  async issueCertificate(userId: string) {
    const { count: totalCheckpoints, error: errCheckpoints } = await supabase
      .from('checkpoints')
      .select('*', { count: 'exact', head: true });

    if (errCheckpoints) throw new Error('Erro ao buscar checkpoints.');

    const { count: userCheckins, error: errCheckins } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (errCheckins) throw new Error('Erro ao buscar check-ins do usuário.');

    if (userCheckins === null || totalCheckpoints === null || userCheckins < totalCheckpoints) {
      throw new Error(`Conclusão pendente: Você visitou ${userCheckins} de ${totalCheckpoints} pontos.`);
    }

    const { data, error: errCertificate } = await supabase
      .from('certificates')
      .insert([{ user_id: userId }])
      .select()
      .single(); 

    if (errCertificate) {
      if (errCertificate.code === '23505') {
        throw new Error('Este usuário já possui um certificado emitido!');
      }
      throw new Error(errCertificate.message);
    }

    return data;
  }
}