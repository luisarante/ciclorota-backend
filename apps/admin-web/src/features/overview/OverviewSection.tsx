import type { AdminCertificateRecord, AdminOverviewResponse, AdminUserRecord } from '@ciclorota/shared';
import { EmptyState, UserCard } from '../../components/admin-ui';
import { formatDateTime } from '../../lib/format';

export function OverviewSection(props: {
  overview: AdminOverviewResponse | null;
  loadingOverview: boolean;
  topUsers: AdminUserRecord[];
  recentCertificates: AdminCertificateRecord[];
  onSelectUser: (user: AdminUserRecord) => void;
}) {
  return (
    <>
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Radar</p>
            <h2>Usuarios mais visiveis no panorama atual</h2>
          </div>
          <span className="muted-badge">
            {props.loadingOverview ? 'Sincronizando...' : `${props.topUsers.length} usuarios em destaque`}
          </span>
        </div>

        <div className="user-grid">
          {props.topUsers.map((user) => (
            <UserCard key={user.id} user={user} onSelect={props.onSelectUser} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Linha do tempo</p>
            <h2>Check-ins recentes enviados para a plataforma</h2>
          </div>
          <span className="muted-badge">{props.overview?.recent_checkins.length ?? 0} eventos</span>
        </div>

        <div className="timeline-list">
          {(props.overview?.recent_checkins ?? []).map((checkin) => (
            <article className="timeline-card" key={checkin.id}>
              <strong>{checkin.checkpoint_name}</strong>
              <p>{checkin.full_name || checkin.user_email || checkin.user_id}</p>
              <span>{formatDateTime(checkin.scanned_at)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Certificados</p>
            <h2>Ultimos registros emitidos pelo backend</h2>
          </div>
          <span className="muted-badge">{props.recentCertificates.length} visiveis</span>
        </div>

        {props.recentCertificates.length ? (
          <div className="timeline-list">
            {props.recentCertificates.map((certificate) => (
              <article className="timeline-card" key={`${certificate.user_id}-${certificate.issued_at}`}>
                <strong>{certificate.full_name || certificate.email || certificate.user_id}</strong>
                <p>{certificate.email ?? certificate.user_id}</p>
                <span>{formatDateTime(certificate.issued_at)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum certificado carregado ainda"
            message="A secao de certificados ja esta pronta para refletir o que o backend emitir."
          />
        )}
      </section>
    </>
  );
}
