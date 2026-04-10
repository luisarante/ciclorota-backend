import { supabaseAdmin } from '../config/supabase.js';
import type { PaginatedResult, PaginationParams } from '../utils/pagination.js';
import { HttpError } from '../utils/httpError.js';
import { ProfileService } from './ProfileService.js';

interface CertificateListQuery extends PaginationParams {
  userId?: string;
}

export class CertificateService {
  private readonly profileService = new ProfileService();

  async issueCertificate(userId: string) {
    const { count: totalCheckpoints, error: errCheckpoints } = await supabaseAdmin
      .from('checkpoints')
      .select('*', { count: 'exact', head: true });

    if (errCheckpoints) {
      throw new Error('Erro ao buscar checkpoints.');
    }

    const { count: userCheckins, error: errCheckins } = await supabaseAdmin
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (errCheckins) {
      throw new Error('Erro ao buscar check-ins do usuário.');
    }

    if (userCheckins === null || totalCheckpoints === null || userCheckins < totalCheckpoints) {
      throw new Error(`Conclusão pendente: Você visitou ${userCheckins} de ${totalCheckpoints} pontos.`);
    }

    const { data, error: errCertificate } = await supabaseAdmin
      .from('certificates')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (errCertificate) {
      if (errCertificate.code === '23505') {
        throw new HttpError(409, 'Este usuário já possui um certificado emitido!');
      }

      throw new HttpError(400, errCertificate.message);
    }

    return data;
  }

  async listCertificates(query: CertificateListQuery): Promise<PaginatedResult<any>> {
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    let request = supabaseAdmin
      .from('certificates')
      .select('user_id, issued_at', {
        count: 'exact'
      })
      .order('issued_at', { ascending: false });

    if (query.userId) {
      request = request.eq('user_id', query.userId);
    }

    const { data, error, count } = await request.range(from, to);

    if (error) {
      throw new Error(`Erro ao listar certificados: ${error.message}`);
    }

    const userIds = [...new Set((data ?? []).map((certificate) => certificate.user_id))];
    const [profiles, authUsers] = await Promise.all([
      this.profileService.getProfilesByIds(userIds),
      this.listAuthUsersByIds(userIds)
    ]);

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const authUserMap = new Map(authUsers.map((user) => [user.id, user]));

    const items = (data ?? []).map((certificate) => ({
      user_id: certificate.user_id,
      issued_at: certificate.issued_at,
      email: authUserMap.get(certificate.user_id)?.email ?? null,
      full_name: profileMap.get(certificate.user_id)?.full_name ?? null,
      avatar_url: profileMap.get(certificate.user_id)?.avatar_url ?? null
    }));

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: count ?? 0
    };
  }

  private async listAuthUsersByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: Math.max(userIds.length, 20)
    });

    if (error) {
      throw new HttpError(500, `Erro ao listar usuários de autenticação para certificados: ${error.message}`);
    }

    return (data.users ?? [])
      .filter((user) => userIds.includes(user.id))
      .map((user) => ({
        id: user.id,
        email: user.email ?? user.user_metadata.email ?? null
      }));
  }
}
