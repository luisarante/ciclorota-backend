import type { AdminCheckpoint, AdminRecentCheckin, AdminUserRecord, PaginationMeta } from '@ciclorota/shared';
import type { FormEventHandler } from 'react';
import { EmptyState, PaginationControls } from '../../components/admin-ui';
import { formatDateTime } from '../../lib/format';
import type { CheckinsFilterState } from '../../types/admin';

export function CheckinsSection(props: {
  checkins: AdminRecentCheckin[];
  checkinsPagination: PaginationMeta;
  checkinsFilters: CheckinsFilterState;
  userDirectory: AdminUserRecord[];
  checkpointDirectory: AdminCheckpoint[];
  loadingCheckins: boolean;
  onFiltersChange: (nextValue: CheckinsFilterState) => void;
  onSubmitFilters: FormEventHandler<HTMLFormElement>;
  onResetFilters: () => void;
  onChangePage: (page: number) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading inline">
        <div>
          <p className="eyebrow">Check-ins</p>
          <h2>Auditoria com filtros por usuario e checkpoint</h2>
        </div>
        <span className="muted-badge">
          {props.loadingCheckins ? 'Carregando...' : `${props.checkinsPagination.total_count} eventos`}
        </span>
      </div>

      <form className="toolbar-grid" onSubmit={props.onSubmitFilters}>
        <label>
          Usuario
          <select
            value={props.checkinsFilters.userId}
            onChange={(event) =>
              props.onFiltersChange({
                ...props.checkinsFilters,
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

        <label>
          Checkpoint
          <select
            value={props.checkinsFilters.checkpointId}
            onChange={(event) =>
              props.onFiltersChange({
                ...props.checkinsFilters,
                checkpointId: event.target.value
              })
            }
          >
            <option value="">Todos</option>
            {props.checkpointDirectory.map((checkpoint) => (
              <option key={checkpoint.id} value={checkpoint.id}>
                {checkpoint.name}
              </option>
            ))}
          </select>
        </label>

        <div className="toolbar-actions">
          <button type="submit">Aplicar filtros</button>
          <button type="button" className="secondary-button" onClick={props.onResetFilters}>
            Limpar
          </button>
        </div>
      </form>

      <div className="timeline-list">
        {props.checkins.map((checkin) => (
          <article className="timeline-card rich-card" key={checkin.id}>
            <div>
              <strong>{checkin.checkpoint_name}</strong>
              <p>{checkin.checkpoint_description || 'Sem descricao detalhada.'}</p>
            </div>
            <div className="rich-meta">
              <span>{checkin.full_name || checkin.user_email || checkin.user_id}</span>
              <span>{formatDateTime(checkin.scanned_at)}</span>
            </div>
          </article>
        ))}
      </div>

      {props.checkins.length === 0 ? (
        <EmptyState
          title="Nenhum check-in encontrado"
          message="Os filtros atuais nao retornaram eventos. Tente liberar os criterios para ver mais itens."
        />
      ) : null}

      <PaginationControls pagination={props.checkinsPagination} onChange={props.onChangePage} />
    </section>
  );
}
