import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient, type Session as SupabaseSession, type User as SupabaseUser } from '@supabase/supabase-js';
import type {
  AdminCertificateIssueResponse,
  AdminCertificateRecord,
  AdminCertificatesQuery,
  AdminCheckpoint,
  AdminCheckpointInput,
  AdminCheckpointPatchInput,
  AdminCheckinsQuery,
  AdminOverviewResponse,
  AdminRecentCheckin,
  AdminUserPatchInput,
  AdminUserRecord,
  AdminUsersQuery,
  AppRole,
  AuthUser,
  PaginationMeta
} from '@ciclorota/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3333';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = hasSupabaseConfig ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

type AdminView = 'overview' | 'users' | 'checkpoints' | 'checkins' | 'certificates';

interface AdminSessionState {
  accessToken: string;
  user: AuthUser;
}

interface ApiResponse<T> {
  data: T;
  pagination: PaginationMeta | null;
}

interface UsersFilterState {
  search: string;
  role: 'all' | AppRole;
}

interface CheckinsFilterState {
  userId: string;
  checkpointId: string;
}

interface CertificatesFilterState {
  userId: string;
}

interface UserDraftState {
  full_name: string;
  avatar_url: string;
  role: AppRole;
}

interface CheckpointFormState {
  name: string;
  description: string;
  qr_code: string;
  latitude: string;
  longitude: string;
  order: string;
  map: string;
}

class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiRequestError';
  }
}

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<AdminSessionState | null>(null);
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersPagination, setUsersPagination] = useState(createEmptyPagination());
  const [userDirectory, setUserDirectory] = useState<AdminUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState<UserDraftState>(createEmptyUserDraft());
  const [checkpoints, setCheckpoints] = useState<AdminCheckpoint[]>([]);
  const [checkpointsPagination, setCheckpointsPagination] = useState(createEmptyPagination());
  const [checkpointDirectory, setCheckpointDirectory] = useState<AdminCheckpoint[]>([]);
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null);
  const [checkpointForm, setCheckpointForm] = useState<CheckpointFormState>(createEmptyCheckpointForm());
  const [checkins, setCheckins] = useState<AdminRecentCheckin[]>([]);
  const [checkinsPagination, setCheckinsPagination] = useState(createEmptyPagination());
  const [certificates, setCertificates] = useState<AdminCertificateRecord[]>([]);
  const [certificatesPagination, setCertificatesPagination] = useState(createEmptyPagination());
  const [usersQuery, setUsersQuery] = useState<AdminUsersQuery>({ page: 1, limit: 8 });
  const [usersFilters, setUsersFilters] = useState<UsersFilterState>({ search: '', role: 'all' });
  const [checkpointsPage, setCheckpointsPage] = useState(1);
  const [checkinsQuery, setCheckinsQuery] = useState<AdminCheckinsQuery>({ page: 1, limit: 8 });
  const [checkinsFilters, setCheckinsFilters] = useState<CheckinsFilterState>({ userId: '', checkpointId: '' });
  const [certificatesQuery, setCertificatesQuery] = useState<AdminCertificatesQuery>({ page: 1, limit: 8 });
  const [certificatesFilters, setCertificatesFilters] = useState<CertificatesFilterState>({ userId: '' });
  const [certificateIssueUserId, setCertificateIssueUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const topUsers = useMemo(() => overview?.users.slice(0, 4) ?? [], [overview]);
  const recentCertificates = useMemo(() => certificates.slice(0, 5), [certificates]);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? userDirectory.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, userDirectory, users]
  );
  const currentCheckpoint = useMemo(
    () => checkpointDirectory.find((checkpoint) => checkpoint.id === editingCheckpointId) ?? null,
    [checkpointDirectory, editingCheckpointId]
  );
  const canChangeRoles = session?.user.role === 'superadmin';

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      if (!supabase) {
        setRestoring(false);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        setRestoring(false);
        return;
      }

      setSession(data.session ? toAdminSessionState(data.session) : null);
      setRestoring(false);
    }

    void bootstrapSession();

    if (!supabase) {
      return undefined;
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession ? toAdminSessionState(nextSession) : null);
      setRestoring(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.is_admin) {
      setOverview(null);
      setUserDirectory([]);
      setCheckpointDirectory([]);
      return;
    }

    void loadOverview(session.accessToken);
    void loadCertificates(session.accessToken, { page: 1, limit: 5 });
    void loadDirectories(session.accessToken);
  }, [session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || activeView !== 'users') {
      return;
    }

    void loadUsers(session.accessToken, usersQuery);
  }, [activeView, session?.accessToken, session?.user.is_admin, usersQuery]);

  useEffect(() => {
    if (!session?.user.is_admin || activeView !== 'checkpoints') {
      return;
    }

    void loadCheckpoints(session.accessToken, checkpointsPage);
  }, [activeView, checkpointsPage, session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || activeView !== 'checkins') {
      return;
    }

    void loadCheckins(session.accessToken, checkinsQuery);
  }, [activeView, checkinsQuery, session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || activeView !== 'certificates') {
      return;
    }

    void loadCertificates(session.accessToken, certificatesQuery);
  }, [activeView, certificatesQuery, session?.accessToken, session?.user.is_admin]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Informe e-mail e senha para entrar no painel.');
      return;
    }

    if (!supabase) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para autenticar o admin web.');
      return;
    }

    try {
      setBusy(true);
      resetMessages();

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (loginError) {
        throw loginError;
      }

      if (!data.session) {
        throw new Error('Nao foi possivel recuperar a sessao do Supabase.');
      }

      setSession(toAdminSessionState(data.session));
      setActiveView('overview');
      setFeedback('Sessao Supabase iniciada com sucesso.');
    } catch (caughtError) {
      handleAppError(caughtError, { logoutOnUnauthorized: false });
    } finally {
      setBusy(false);
    }
  }

  async function loadOverview(accessToken: string) {
    try {
      setLoadingOverview(true);
      const payload = await requestJson<AdminOverviewResponse>('/admin/overview', { accessToken });
      setOverview(payload.data);
    } catch (caughtError) {
      handleAppError(caughtError);
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }

  async function loadDirectories(accessToken: string) {
    try {
      setLoadingDirectories(true);
      const [usersPayload, checkpointsPayload] = await Promise.all([
        requestJson<AdminUserRecord[]>('/admin/users?limit=100&page=1', { accessToken }),
        requestJson<AdminCheckpoint[]>('/admin/checkpoints?limit=250&page=1', { accessToken })
      ]);

      setUserDirectory(usersPayload.data);
      setCheckpointDirectory(checkpointsPayload.data);

      if (!selectedUserId && usersPayload.data[0]) {
        selectUser(usersPayload.data[0]);
      }

      if (!editingCheckpointId && checkpointsPayload.data[0]) {
        setCheckpointForm(toCheckpointForm(checkpointsPayload.data[0]));
        setEditingCheckpointId(checkpointsPayload.data[0].id);
      }

      if (!certificateIssueUserId && usersPayload.data[0]) {
        setCertificateIssueUserId(usersPayload.data[0].id);
      }
    } catch (caughtError) {
      handleAppError(caughtError);
    } finally {
      setLoadingDirectories(false);
    }
  }

  async function loadUsers(accessToken: string, query: AdminUsersQuery) {
    try {
      setLoadingUsers(true);
      const payload = await requestJson<AdminUserRecord[]>(`/admin/users?${buildUsersQueryString(query)}`, { accessToken });
      setUsers(payload.data);
      setUsersPagination(payload.pagination ?? createPaginationFromLength(payload.data.length, query.limit ?? 8));

      if (!payload.data.length) {
        setSelectedUserId(null);
        setUserDraft(createEmptyUserDraft());
        return;
      }

      const nextSelectedUser = payload.data.find((user) => user.id === selectedUserId) ?? payload.data[0];

      if (nextSelectedUser) {
        selectUser(nextSelectedUser);
      }
    } catch (caughtError) {
      handleAppError(caughtError);
      setUsers([]);
      setUsersPagination(createEmptyPagination());
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadCheckpoints(accessToken: string, page: number) {
    try {
      setLoadingCheckpoints(true);
      const payload = await requestJson<AdminCheckpoint[]>(`/admin/checkpoints?page=${page}&limit=8`, { accessToken });
      setCheckpoints(payload.data);
      setCheckpointsPagination(payload.pagination ?? createPaginationFromLength(payload.data.length, 8));
    } catch (caughtError) {
      handleAppError(caughtError);
      setCheckpoints([]);
      setCheckpointsPagination(createEmptyPagination());
    } finally {
      setLoadingCheckpoints(false);
    }
  }

  async function loadCheckins(accessToken: string, query: AdminCheckinsQuery) {
    try {
      setLoadingCheckins(true);
      const payload = await requestJson<AdminRecentCheckin[]>(`/admin/checkins?${buildCheckinsQueryString(query)}`, {
        accessToken
      });
      setCheckins(payload.data);
      setCheckinsPagination(payload.pagination ?? createPaginationFromLength(payload.data.length, query.limit ?? 8));
    } catch (caughtError) {
      handleAppError(caughtError);
      setCheckins([]);
      setCheckinsPagination(createEmptyPagination());
    } finally {
      setLoadingCheckins(false);
    }
  }

  async function loadCertificates(accessToken: string, query: AdminCertificatesQuery) {
    try {
      setLoadingCertificates(true);
      const payload = await requestJson<AdminCertificateRecord[]>(`/admin/certificates?${buildCertificatesQueryString(query)}`, {
        accessToken
      });
      setCertificates(payload.data);
      setCertificatesPagination(payload.pagination ?? createPaginationFromLength(payload.data.length, query.limit ?? 8));
    } catch (caughtError) {
      handleAppError(caughtError);
      setCertificates([]);
      setCertificatesPagination(createEmptyPagination());
    } finally {
      setLoadingCertificates(false);
    }
  }

  function selectUser(user: AdminUserRecord) {
    setSelectedUserId(user.id);
    setUserDraft({
      full_name: user.full_name ?? '',
      avatar_url: user.avatar_url ?? '',
      role: user.role
    });
    setCertificateIssueUserId((currentValue) => currentValue || user.id);
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || !selectedUserId) {
      return;
    }

    const payload: AdminUserPatchInput = {
      full_name: userDraft.full_name.trim() ? userDraft.full_name.trim() : null,
      avatar_url: userDraft.avatar_url.trim() ? userDraft.avatar_url.trim() : null,
      ...(canChangeRoles ? { role: userDraft.role } : {})
    };

    try {
      setSavingUser(true);
      resetMessages();

      const result = await requestJson<AdminUserRecord>(`/admin/users/${selectedUserId}`, {
        method: 'PATCH',
        accessToken: session.accessToken,
        body: payload
      });

      setFeedback('Usuario atualizado com sucesso.');
      selectUser(result.data);
      await Promise.all([
        loadOverview(session.accessToken),
        loadUsers(session.accessToken, usersQuery),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      handleAppError(caughtError);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleIssueCertificate(targetUserId: string) {
    if (!session?.accessToken || !targetUserId) {
      return;
    }

    try {
      setIssuingCertificate(true);
      resetMessages();

      const payload = await requestJson<AdminCertificateIssueResponse>(`/admin/certificates/${targetUserId}/issue`, {
        method: 'POST',
        accessToken: session.accessToken
      });

      setFeedback(payload.data.mensagem);
      await Promise.all([
        loadOverview(session.accessToken),
        loadUsers(session.accessToken, usersQuery),
        loadCertificates(session.accessToken, certificatesQuery),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      handleAppError(caughtError);
    } finally {
      setIssuingCertificate(false);
    }
  }

  async function handleSubmitCheckpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken) {
      return;
    }

    try {
      setSavingCheckpoint(true);
      resetMessages();

      const payload = toCheckpointPayload(checkpointForm);
      const result = editingCheckpointId
        ? await requestJson<AdminCheckpoint>(`/admin/checkpoints/${editingCheckpointId}`, {
            method: 'PATCH',
            accessToken: session.accessToken,
            body: payload satisfies AdminCheckpointPatchInput
          })
        : await requestJson<AdminCheckpoint>('/admin/checkpoints', {
            method: 'POST',
            accessToken: session.accessToken,
            body: payload satisfies AdminCheckpointInput
          });

      setFeedback(editingCheckpointId ? 'Checkpoint atualizado com sucesso.' : 'Checkpoint criado com sucesso.');
      setEditingCheckpointId(result.data.id);
      setCheckpointForm(toCheckpointForm(result.data));
      await Promise.all([
        loadOverview(session.accessToken),
        loadCheckpoints(session.accessToken, checkpointsPage),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      handleAppError(caughtError);
    } finally {
      setSavingCheckpoint(false);
    }
  }

  function handleCheckpointFormChange(field: keyof CheckpointFormState, value: string) {
    setCheckpointForm((currentValue) => ({
      ...currentValue,
      [field]: value
    }));
  }

  function handleStartCheckpointEdit(checkpoint: AdminCheckpoint) {
    setEditingCheckpointId(checkpoint.id);
    setCheckpointForm(toCheckpointForm(checkpoint));
    setActiveView('checkpoints');
  }

  function handleNewCheckpoint() {
    setEditingCheckpointId(null);
    setCheckpointForm(createEmptyCheckpointForm());
  }

  function handleUsersFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsersQuery({
      page: 1,
      limit: usersQuery.limit ?? 8,
      ...(usersFilters.search.trim() ? { search: usersFilters.search.trim() } : {}),
      ...(usersFilters.role !== 'all' ? { role: usersFilters.role } : {})
    });
  }

  function handleCheckinsFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckinsQuery({
      page: 1,
      limit: checkinsQuery.limit ?? 8,
      ...(checkinsFilters.userId ? { userId: checkinsFilters.userId } : {}),
      ...(checkinsFilters.checkpointId ? { checkpointId: checkinsFilters.checkpointId } : {})
    });
  }

  function handleCertificatesFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCertificatesQuery({
      page: 1,
      limit: certificatesQuery.limit ?? 8,
      ...(certificatesFilters.userId ? { userId: certificatesFilters.userId } : {})
    });
  }

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setOverview(null);
    setUsers([]);
    setUserDirectory([]);
    setCheckpoints([]);
    setCheckpointDirectory([]);
    setCheckins([]);
    setCertificates([]);
    setSelectedUserId(null);
    setEditingCheckpointId(null);
    setCheckpointForm(createEmptyCheckpointForm());
    setUserDraft(createEmptyUserDraft());
    setPassword('');
    setFeedback(null);
    setError(null);
  }

  function resetMessages() {
    setError(null);
    setFeedback(null);
  }

  function handleAppError(error: unknown, options?: { logoutOnUnauthorized?: boolean }) {
    if (error instanceof ApiRequestError && error.status === 401 && options?.logoutOnUnauthorized !== false) {
      void handleLogout();
      setError('Sua sessao expirou. Entre novamente para continuar.');
      return;
    }

    setError(toErrorMessage(error));
  }

  if (restoring) {
    return (
      <div className="admin-shell centered-shell">
        <div className="admin-noise" />
        <section className="auth-card">
          <p className="eyebrow">Restaurando</p>
          <h1>Recuperando sua sessao administrativa.</h1>
          <p>Estamos consultando a sessao atual do Supabase antes de abrir o painel.</p>
        </section>
      </div>
    );
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="admin-shell centered-shell">
        <div className="admin-noise" />
        <section className="auth-card">
          <p className="eyebrow">Configuracao pendente</p>
          <h1>Faltam variaveis do Supabase para autenticar o admin web.</h1>
          <p>
            Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente do
            `apps/admin-web` para usar o login nativo do Supabase e enviar o bearer token para a API.
          </p>

          <div className="info-strip">
            <span>VITE_API_URL: {API_URL}</span>
            <span>Auth: Supabase nativo</span>
          </div>
        </section>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin-shell centered-shell">
        <div className="admin-noise" />
        <section className="auth-card">
          <p className="eyebrow">Ciclorota Command Deck</p>
          <h1>Entre com uma conta valida para acessar a operacao web.</h1>
          <p>
            O painel agora autentica direto no Supabase e usa o access token da sessao para consumir
            a API administrativa. O acesso continua liberado apenas para usuarios com
            `app_metadata.role` igual a `admin` ou `superadmin`.
          </p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? 'Entrando...' : 'Entrar no admin'}
            </button>
          </form>

          {error ? <div className="warning-box">{error}</div> : null}

          <div className="info-strip">
            <span>API: {API_URL}</span>
            <span>Fluxo: Supabase Auth + Bearer /admin/*</span>
          </div>
        </section>
      </div>
    );
  }

  if (!session.user.is_admin) {
    return (
      <div className="admin-shell centered-shell">
        <div className="admin-noise" />
        <section className="auth-card">
          <p className="eyebrow">Acesso negado</p>
          <h1>Esta conta autenticou, mas ainda nao foi marcada como admin.</h1>
          <p>
            Hoje a API segue a role do Supabase. Para liberar esta conta, defina
            `app_metadata.role` como `admin` ou `superadmin`, com fallback aceito em `user_metadata.role`.
          </p>

          <div className="info-strip">
            <span>{session.user.email ?? session.user.id}</span>
            <span>Role atual: {session.user.role}</span>
          </div>

          <button className="secondary-button" type="button" onClick={() => void handleLogout()}>
            Sair
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-noise" />

      <header className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Admin autenticado</p>
          <h1>Painel operacional da Ciclorota em modo de comando real.</h1>
          <p className="hero-text">
            Agora o admin web deixou de ser um overview estático e virou uma cabine operacional para
            usuários, checkpoints, check-ins e certificados.
          </p>
          <div className="hero-actions">
            <span className="status-chip">{session.user.email ?? session.user.id}</span>
            <span className="status-chip subtle-chip">Role: {session.user.role}</span>
            <button className="secondary-button" type="button" onClick={() => void loadOverview(session.accessToken)}>
              Atualizar overview
            </button>
            <button className="secondary-button" type="button" onClick={() => void handleLogout()}>
              Sair
            </button>
          </div>
        </div>

        <div className="hero-grid">
          <MetricCard label="Usuarios" value={overview?.summary.users ?? 0} />
          <MetricCard label="Check-ins" value={overview?.summary.checkins ?? 0} accent />
          <MetricCard label="Certificados" value={overview?.summary.certificates ?? 0} />
          <MetricCard label="Checkpoints" value={overview?.summary.checkpoints ?? 0} />
        </div>
      </header>

      <section className="nav-panel">
        <div className="view-switcher">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Usuarios' },
            { id: 'checkpoints', label: 'Checkpoints' },
            { id: 'checkins', label: 'Check-ins' },
            { id: 'certificates', label: 'Certificados' }
          ].map((view) => (
            <button
              key={view.id}
              type="button"
              className={`view-tab${activeView === view.id ? ' active' : ''}`}
              onClick={() => setActiveView(view.id as AdminView)}
            >
              {view.label}
            </button>
          ))}
        </div>
        <div className="nav-meta">
          <span>{loadingDirectories ? 'Sincronizando diretórios...' : `${userDirectory.length} usuarios no diretório`}</span>
          <span>{`${checkpointDirectory.length} checkpoints carregados`}</span>
        </div>
      </section>

      {error ? <div className="warning-box floating-warning">{error}</div> : null}
      {feedback ? <div className="success-box floating-success">{feedback}</div> : null}

      <main className="content-grid admin-grid">
        {activeView === 'overview' ? (
          <>
            <section className="panel">
              <div className="panel-heading inline">
                <div>
                  <p className="eyebrow">Radar</p>
                  <h2>Usuários mais visíveis no panorama atual</h2>
                </div>
                <span className="muted-badge">{loadingOverview ? 'Sincronizando...' : `${topUsers.length} usuarios em destaque`}</span>
              </div>

              <div className="user-grid">
                {topUsers.map((user) => (
                  <UserCard key={user.id} user={user} onSelect={selectUser} />
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading inline">
                <div>
                  <p className="eyebrow">Linha do tempo</p>
                  <h2>Check-ins recentes enviados para a plataforma</h2>
                </div>
                <span className="muted-badge">{overview?.recent_checkins.length ?? 0} eventos</span>
              </div>

              <div className="timeline-list">
                {(overview?.recent_checkins ?? []).map((checkin) => (
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
                <span className="muted-badge">{recentCertificates.length} visiveis</span>
              </div>

              {recentCertificates.length ? (
                <div className="timeline-list">
                  {recentCertificates.map((certificate) => (
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
                  message="A seção de certificados já está pronta para refletir o que o backend emitir."
                />
              )}
            </section>
          </>
        ) : null}

        {activeView === 'users' ? (
          <div className="split-layout">
            <section className="panel">
              <div className="panel-heading inline">
                <div>
                  <p className="eyebrow">Usuários</p>
                  <h2>Busca, paginação e edição operacional</h2>
                </div>
                <span className="muted-badge">{loadingUsers ? 'Carregando...' : `${usersPagination.total_count} resultados`}</span>
              </div>

              <form className="toolbar-grid" onSubmit={handleUsersFilterSubmit}>
                <label>
                  Busca
                  <input
                    type="search"
                    value={usersFilters.search}
                    onChange={(event) => setUsersFilters((currentValue) => ({ ...currentValue, search: event.target.value }))}
                    placeholder="Nome, e-mail, role ou UUID"
                  />
                </label>
                <label>
                  Role
                  <select
                    value={usersFilters.role}
                    onChange={(event) =>
                      setUsersFilters((currentValue) => ({
                        ...currentValue,
                        role: event.target.value as UsersFilterState['role']
                      }))
                    }
                  >
                    <option value="all">Todas</option>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                </label>
                <div className="toolbar-actions">
                  <button type="submit">Aplicar filtros</button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setUsersFilters({ search: '', role: 'all' });
                      setUsersQuery({ page: 1, limit: usersQuery.limit ?? 8 });
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </form>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Role</th>
                      <th>Check-ins</th>
                      <th>Certificado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={selectedUserId === user.id ? 'active-row' : ''}
                        onClick={() => selectUser(user)}
                      >
                        <td>
                          <strong>{user.full_name || 'Sem nome'}</strong>
                          <span>{user.email ?? user.id}</span>
                        </td>
                        <td>{user.role}</td>
                        <td>{user.total_checkins}</td>
                        <td>{user.has_certificate ? 'Sim' : 'Nao'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 ? (
                <EmptyState title="Nenhum usuário encontrado" message="Ajuste os filtros para localizar outras contas." />
              ) : null}

              <PaginationControls
                pagination={usersPagination}
                onChange={(page) => setUsersQuery((currentValue) => ({ ...currentValue, page }))}
              />
            </section>

            <section className="panel">
              <div className="panel-heading inline">
                <div>
                  <p className="eyebrow">Editor</p>
                  <h2>{selectedUser ? 'Editar usuario selecionado' : 'Selecione um usuario'}</h2>
                </div>
                {selectedUser ? <span className="muted-badge">{selectedUser.role}</span> : null}
              </div>

              {selectedUser ? (
                <form className="editor-form" onSubmit={handleSaveUser}>
                  <div className="detail-grid">
                    <InfoPill label="UUID" value={selectedUser.id} />
                    <InfoPill label="Criado em" value={formatDateTime(selectedUser.created_at)} />
                    <InfoPill label="Check-ins" value={String(selectedUser.total_checkins)} />
                    <InfoPill label="Certificado" value={selectedUser.has_certificate ? 'Emitido' : 'Pendente'} />
                  </div>

                  <label>
                    Nome completo
                    <input
                      value={userDraft.full_name}
                      onChange={(event) => setUserDraft((currentValue) => ({ ...currentValue, full_name: event.target.value }))}
                      placeholder="Nome exibido no app"
                    />
                  </label>

                  <label>
                    Avatar URL
                    <input
                      value={userDraft.avatar_url}
                      onChange={(event) => setUserDraft((currentValue) => ({ ...currentValue, avatar_url: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>

                  <label>
                    Role
                    <select
                      value={userDraft.role}
                      onChange={(event) => setUserDraft((currentValue) => ({ ...currentValue, role: event.target.value as AppRole }))}
                      disabled={!canChangeRoles}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                  </label>

                  <div className="editor-actions">
                    <button type="submit" disabled={savingUser}>
                      {savingUser ? 'Salvando...' : 'Salvar usuario'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={issuingCertificate || selectedUser.has_certificate}
                      onClick={() => void handleIssueCertificate(selectedUser.id)}
                    >
                      {issuingCertificate ? 'Emitindo...' : selectedUser.has_certificate ? 'Certificado ja emitido' : 'Emitir certificado'}
                    </button>
                  </div>

                  {!canChangeRoles ? (
                    <p className="helper-copy">
                      Apenas `superadmin` pode alterar roles. Contas `admin` continuam podendo atualizar os
                      dados operacionais do usuario.
                    </p>
                  ) : null}
                </form>
              ) : (
                <EmptyState
                  title="Nenhum usuario selecionado"
                  message="Clique em um usuário da lista para editar nome, avatar e, se voce for superadmin, a role."
                />
              )}
            </section>
          </div>
        ) : null}

        {activeView === 'checkpoints' ? (
          <div className="split-layout">
            <section className="panel">
              <div className="panel-heading inline">
                <div>
                  <p className="eyebrow">Editor de checkpoint</p>
                  <h2>{editingCheckpointId ? 'Atualizar checkpoint existente' : 'Criar novo checkpoint'}</h2>
                </div>
                <button type="button" className="secondary-button" onClick={handleNewCheckpoint}>
                  Novo checkpoint
                </button>
              </div>

              <form className="editor-form" onSubmit={handleSubmitCheckpoint}>
                <label>
                  Nome
                  <input
                    value={checkpointForm.name}
                    onChange={(event) => handleCheckpointFormChange('name', event.target.value)}
                    placeholder="Ex.: Mirante Norte"
                  />
                </label>

                <label>
                  Descricao
                  <textarea
                    value={checkpointForm.description}
                    onChange={(event) => handleCheckpointFormChange('description', event.target.value)}
                    placeholder="Contexto operacional do checkpoint"
                  />
                </label>

                <div className="form-grid">
                  <label>
                    QR code
                    <input
                      value={checkpointForm.qr_code}
                      onChange={(event) => handleCheckpointFormChange('qr_code', event.target.value)}
                      placeholder="qr-mirante-norte"
                    />
                  </label>

                  <label>
                    Ordem
                    <input
                      value={checkpointForm.order}
                      onChange={(event) => handleCheckpointFormChange('order', event.target.value)}
                      inputMode="numeric"
                      placeholder="1"
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Latitude
                    <input
                      value={checkpointForm.latitude}
                      onChange={(event) => handleCheckpointFormChange('latitude', event.target.value)}
                      inputMode="decimal"
                      placeholder="-23.123456"
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      value={checkpointForm.longitude}
                      onChange={(event) => handleCheckpointFormChange('longitude', event.target.value)}
                      inputMode="decimal"
                      placeholder="-45.123456"
                    />
                  </label>
                </div>

                <label>
                  Link do mapa
                  <input
                    value={checkpointForm.map}
                    onChange={(event) => handleCheckpointFormChange('map', event.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <div className="editor-actions">
                  <button type="submit" disabled={savingCheckpoint}>
                    {savingCheckpoint ? 'Salvando...' : editingCheckpointId ? 'Atualizar checkpoint' : 'Criar checkpoint'}
                  </button>
                  {editingCheckpointId ? (
                    <button type="button" className="secondary-button" onClick={handleNewCheckpoint}>
                      Cancelar edicao
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading inline">
                <div>
                  <p className="eyebrow">Catalogo</p>
                  <h2>Checkpoints publicados na plataforma</h2>
                </div>
                <span className="muted-badge">{loadingCheckpoints ? 'Carregando...' : `${checkpointsPagination.total_count} registros`}</span>
              </div>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ordem</th>
                      <th>Checkpoint</th>
                      <th>QR</th>
                      <th>Mapa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkpoints.map((checkpoint) => (
                      <tr
                        key={checkpoint.id}
                        className={currentCheckpoint?.id === checkpoint.id ? 'active-row' : ''}
                        onClick={() => handleStartCheckpointEdit(checkpoint)}
                      >
                        <td>{String(checkpoint.order).padStart(2, '0')}</td>
                        <td>
                          <strong>{checkpoint.name}</strong>
                          <span>{checkpoint.description}</span>
                        </td>
                        <td>{checkpoint.qr_code}</td>
                        <td>{checkpoint.map ? 'Disponivel' : 'Sem link'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls pagination={checkpointsPagination} onChange={setCheckpointsPage} />
            </section>
          </div>
        ) : null}

        {activeView === 'checkins' ? (
          <section className="panel">
            <div className="panel-heading inline">
              <div>
                <p className="eyebrow">Check-ins</p>
                <h2>Auditoria com filtros por usuario e checkpoint</h2>
              </div>
              <span className="muted-badge">{loadingCheckins ? 'Carregando...' : `${checkinsPagination.total_count} eventos`}</span>
            </div>

            <form className="toolbar-grid" onSubmit={handleCheckinsFilterSubmit}>
              <label>
                Usuario
                <select
                  value={checkinsFilters.userId}
                  onChange={(event) => setCheckinsFilters((currentValue) => ({ ...currentValue, userId: event.target.value }))}
                >
                  <option value="">Todos</option>
                  {userDirectory.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email || user.id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Checkpoint
                <select
                  value={checkinsFilters.checkpointId}
                  onChange={(event) =>
                    setCheckinsFilters((currentValue) => ({ ...currentValue, checkpointId: event.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  {checkpointDirectory.map((checkpoint) => (
                    <option key={checkpoint.id} value={checkpoint.id}>
                      {checkpoint.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="toolbar-actions">
                <button type="submit">Aplicar filtros</button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setCheckinsFilters({ userId: '', checkpointId: '' });
                    setCheckinsQuery({ page: 1, limit: checkinsQuery.limit ?? 8 });
                  }}
                >
                  Limpar
                </button>
              </div>
            </form>

            <div className="timeline-list">
              {checkins.map((checkin) => (
                <article className="timeline-card rich-card" key={checkin.id}>
                  <div>
                    <strong>{checkin.checkpoint_name}</strong>
                    <p>{checkin.checkpoint_description || 'Sem descrição detalhada.'}</p>
                  </div>
                  <div className="rich-meta">
                    <span>{checkin.full_name || checkin.user_email || checkin.user_id}</span>
                    <span>{formatDateTime(checkin.scanned_at)}</span>
                  </div>
                </article>
              ))}
            </div>

            {checkins.length === 0 ? (
              <EmptyState
                title="Nenhum check-in encontrado"
                message="Os filtros atuais não retornaram eventos. Tente liberar os critérios para ver mais itens."
              />
            ) : null}

            <PaginationControls
              pagination={checkinsPagination}
              onChange={(page) => setCheckinsQuery((currentValue) => ({ ...currentValue, page }))}
            />
          </section>
        ) : null}

        {activeView === 'certificates' ? (
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
                  void handleIssueCertificate(certificateIssueUserId);
                }}
              >
                <label>
                  Usuario alvo
                  <select value={certificateIssueUserId} onChange={(event) => setCertificateIssueUserId(event.target.value)}>
                    <option value="">Selecione</option>
                    {userDirectory.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email || user.id}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" disabled={!certificateIssueUserId || issuingCertificate}>
                  {issuingCertificate ? 'Emitindo...' : 'Emitir certificado'}
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
                <span className="muted-badge">{loadingCertificates ? 'Carregando...' : `${certificatesPagination.total_count} registros`}</span>
              </div>

              <form className="toolbar-grid" onSubmit={handleCertificatesFilterSubmit}>
                <label>
                  Usuario
                  <select
                    value={certificatesFilters.userId}
                    onChange={(event) =>
                      setCertificatesFilters((currentValue) => ({ ...currentValue, userId: event.target.value }))
                    }
                  >
                    <option value="">Todos</option>
                    {userDirectory.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email || user.id}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="toolbar-actions">
                  <button type="submit">Aplicar filtro</button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setCertificatesFilters({ userId: '' });
                      setCertificatesQuery({ page: 1, limit: certificatesQuery.limit ?? 8 });
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </form>

              <div className="timeline-list">
                {certificates.map((certificate) => (
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

              {certificates.length === 0 ? (
                <EmptyState
                  title="Nenhum certificado visível"
                  message="Use o formulário ao lado para emitir novos certificados ou limpe os filtros."
                />
              ) : null}

              <PaginationControls
                pagination={certificatesPagination}
                onChange={(page) => setCertificatesQuery((currentValue) => ({ ...currentValue, page }))}
              />
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard(props: { label: string; value: number; accent?: boolean }) {
  return (
    <article className={`metric-card${props.accent ? ' accent' : ''}`}>
      <span className="metric-label">{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function UserCard(props: { user: AdminUserRecord; onSelect: (user: AdminUserRecord) => void }) {
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

function PaginationControls(props: { pagination: PaginationMeta; onChange: (page: number) => void }) {
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

function InfoPill(props: { label: string; value: string }) {
  return (
    <article className="info-pill">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function EmptyState(props: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <strong>{props.title}</strong>
      <p>{props.message}</p>
    </div>
  );
}

function createEmptyPagination(): PaginationMeta {
  return {
    page: 1,
    per_page: 0,
    total_count: 0,
    total_pages: 1
  };
}

function createPaginationFromLength(length: number, limit: number): PaginationMeta {
  return {
    page: 1,
    per_page: limit,
    total_count: length,
    total_pages: Math.max(1, Math.ceil(length / limit))
  };
}

function createEmptyUserDraft(): UserDraftState {
  return {
    full_name: '',
    avatar_url: '',
    role: 'user'
  };
}

function createEmptyCheckpointForm(): CheckpointFormState {
  return {
    name: '',
    description: '',
    qr_code: '',
    latitude: '',
    longitude: '',
    order: '',
    map: ''
  };
}

function toCheckpointForm(checkpoint: AdminCheckpoint): CheckpointFormState {
  return {
    name: checkpoint.name,
    description: checkpoint.description,
    qr_code: checkpoint.qr_code,
    latitude: String(checkpoint.latitude),
    longitude: String(checkpoint.longitude),
    order: String(checkpoint.order),
    map: checkpoint.map ?? ''
  };
}

function toCheckpointPayload(form: CheckpointFormState): AdminCheckpointInput {
  const name = form.name.trim();
  const description = form.description.trim();
  const qrCode = form.qr_code.trim();
  const map = form.map.trim();
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const order = Number(form.order);

  if (!name || !description || !qrCode) {
    throw new Error('Nome, descrição e QR code são obrigatórios.');
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Latitude e longitude precisam ser numéricas.');
  }

  if (!Number.isInteger(order) || order <= 0) {
    throw new Error('A ordem precisa ser um número inteiro positivo.');
  }

  return {
    name,
    description,
    qr_code: qrCode,
    latitude,
    longitude,
    order,
    map: map || null
  };
}

async function requestJson<T>(
  path: string,
  options?: {
    method?: string;
    accessToken?: string;
    body?: unknown;
  }
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};

  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers,
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Falha ao carregar dados (${response.status}).`;

    throw new ApiRequestError(response.status, message);
  }

  return {
    data: payload as T,
    pagination: parsePaginationHeaders(response.headers)
  };
}

function parsePaginationHeaders(headers: Headers): PaginationMeta | null {
  const totalCount = headers.get('x-total-count');

  if (!totalCount) {
    return null;
  }

  return {
    page: Number(headers.get('x-page') ?? '1'),
    per_page: Number(headers.get('x-per-page') ?? '0'),
    total_count: Number(totalCount),
    total_pages: Number(headers.get('x-total-pages') ?? '1')
  };
}

function buildUsersQueryString(query: AdminUsersQuery) {
  const params = new URLSearchParams();
  appendQueryParam(params, 'page', query.page);
  appendQueryParam(params, 'limit', query.limit);
  appendQueryParam(params, 'search', query.search);
  appendQueryParam(params, 'role', query.role);
  return params.toString();
}

function buildCheckinsQueryString(query: AdminCheckinsQuery) {
  const params = new URLSearchParams();
  appendQueryParam(params, 'page', query.page);
  appendQueryParam(params, 'limit', query.limit);
  appendQueryParam(params, 'userId', query.userId);
  appendQueryParam(params, 'checkpointId', query.checkpointId);
  return params.toString();
}

function buildCertificatesQueryString(query: AdminCertificatesQuery) {
  const params = new URLSearchParams();
  appendQueryParam(params, 'page', query.page);
  appendQueryParam(params, 'limit', query.limit);
  appendQueryParam(params, 'userId', query.userId);
  return params.toString();
}

function appendQueryParam(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined || value === '') {
    return;
  }

  params.set(key, String(value));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel completar a operacao.';
}

function toAdminSessionState(session: SupabaseSession): AdminSessionState {
  return {
    accessToken: session.access_token,
    user: toAuthUser(session.user)
  };
}

function toAuthUser(user: SupabaseUser): AuthUser {
  const role = resolveAppRole(user);

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    is_admin: role === 'admin' || role === 'superadmin'
  };
}

function resolveAppRole(user: SupabaseUser): AppRole {
  const appMetadataRole = user.app_metadata?.role;
  const userMetadataRole = user.user_metadata?.role;

  if (isAppRole(appMetadataRole)) {
    return appMetadataRole;
  }

  if (isAppRole(userMetadataRole)) {
    return userMetadataRole;
  }

  return 'user';
}

function isAppRole(value: unknown): value is AppRole {
  return value === 'user' || value === 'admin' || value === 'superadmin';
}

export default App;
