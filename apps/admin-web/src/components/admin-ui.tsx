import type { AdminUserRecord, PaginationMeta } from '@ciclorota/shared';

export function MetricCard(props: { label: string; value: number; accent?: boolean }) {
  return (
    <article className={`metric-card${props.accent ? ' accent' : ''}`}>
      <span className="metric-label">{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

export function UserCard(props: { user: AdminUserRecord; onSelect: (user: AdminUserRecord) => void }) {
  const { user, onSelect } = props;

  return (
    <article className="user-card clickable-card" onClick={() => onSelect(user)}>
      <div className="user-card-top">
        <div className="avatar-badge">
          {(user.full_name ?? user.email ?? 'CR').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3>{user.full_name || 'Sem nome cadastrado'}</h3>
          <p>{user.email ?? user.id}</p>
        </div>
      </div>
      <dl className="user-card-meta">
        <div>
          <dt>Check-ins</dt>
          <dd>{user.total_checkins}</dd>
        </div>
        <div>
          <dt>Certificado</dt>
          <dd>{user.has_certificate ? 'Sim' : 'Nao'}</dd>
        </div>
        <div>
          <dt>Papel</dt>
          <dd>{user.role}</dd>
        </div>
      </dl>
    </article>
  );
}

export function PaginationControls(props: { pagination: PaginationMeta; onChange: (page: number) => void }) {
  const { pagination, onChange } = props;

  if (pagination.total_pages <= 1) {
    return null;
  }

  return (
    <div className="pagination-bar">
      <button type="button" className="secondary-button" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>
        Anterior
      </button>
      <span className="pagination-copy">
        Pagina {pagination.page} de {pagination.total_pages}
      </span>
      <button
        type="button"
        className="secondary-button"
        disabled={pagination.page >= pagination.total_pages}
        onClick={() => onChange(pagination.page + 1)}
      >
        Proxima
      </button>
    </div>
  );
}

export function InfoPill(props: { label: string; value: string }) {
  return (
    <article className="info-pill">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

export function EmptyState(props: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <strong>{props.title}</strong>
      <p>{props.message}</p>
    </div>
  );
}
