import type { AdminCertificateRecord, AdminUserRecord, PaginationMeta } from '@ciclorota/shared';
import type { FormEventHandler } from 'react';
import { EmptyState, PaginationControls } from '../../components/admin-ui';
import { formatDateTime } from '../../lib/format';
import type { CertificatesFilterState } from '../../types/admin';

export function CertificatesSection(props: {
  certificateIssueUserId: string;
  certificates: AdminCertificateRecord[];
  certificatesPagination: PaginationMeta;
  certificatesFilters: CertificatesFilterState;
  userDirectory: AdminUserRecord[];
  issuingCertificate: boolean;
  loadingCertificates: boolean;
  onIssueTargetChange: (userId: string) => void;
  onIssueCertificate: (userId: string) => void;
  onFiltersChange: (nextValue: CertificatesFilterState) => void;
  onSubmitFilters: FormEventHandler<HTMLFormElement>;
  onResetFilters: () => void;
  onChangePage: (page: number) => void;
}) {
  return (
    <div className="split-layout">
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Emissao</p>
            <h2>Emitir certificado para um usuario elegivel</h2>
          </div>
          <span className="muted-badge">Regras validadas no backend</span>
        </div>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            props.onIssueCertificate(props.certificateIssueUserId);
          }}
        >
          <label>
            Usuario alvo
            <select value={props.certificateIssueUserId} onChange={(event) => props.onIssueTargetChange(event.target.value)}>
              <option value="">Selecione</option>
              {props.userDirectory.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email || user.id}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={!props.certificateIssueUserId || props.issuingCertificate}>
            {props.issuingCertificate ? 'Emitindo...' : 'Emitir certificado'}
          </button>

          <p className="helper-copy">
            A API continua validando elegibilidade por quantidade de checkpoints visitados antes de emitir.
          </p>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Historico</p>
            <h2>Certificados emitidos e filtro por usuario</h2>
          </div>
          <span className="muted-badge">
            {props.loadingCertificates ? 'Carregando...' : `${props.certificatesPagination.total_count} registros`}
          </span>
        </div>

        <form className="toolbar-grid" onSubmit={props.onSubmitFilters}>
          <label>
            Usuario
            <select
              value={props.certificatesFilters.userId}
              onChange={(event) =>
                props.onFiltersChange({
                  userId: event.target.value
                })
              }
            >
              <option value="">Todos</option>
              {props.userDirectory.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email || user.id}
                </option>
              ))}
            </select>
          </label>

          <div className="toolbar-actions">
            <button type="submit">Aplicar filtro</button>
            <button type="button" className="secondary-button" onClick={props.onResetFilters}>
              Limpar
            </button>
          </div>
        </form>

        <div className="timeline-list">
          {props.certificates.map((certificate) => (
            <article className="timeline-card rich-card" key={`${certificate.user_id}-${certificate.issued_at}`}>
              <div>
                <strong>{certificate.full_name || certificate.email || certificate.user_id}</strong>
                <p>{certificate.email ?? certificate.user_id}</p>
              </div>
              <div className="rich-meta">
                <span>Emitido</span>
                <span>{formatDateTime(certificate.issued_at)}</span>
              </div>
            </article>
          ))}
        </div>

        {props.certificates.length === 0 ? (
          <EmptyState
            title="Nenhum certificado visivel"
            message="Use o formulario ao lado para emitir novos certificados ou limpe os filtros."
          />
        ) : null}

        <PaginationControls pagination={props.certificatesPagination} onChange={props.onChangePage} />
      </section>
    </div>
  );
}
