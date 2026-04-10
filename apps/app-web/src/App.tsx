import { useEffect, useMemo, useState } from 'react';
import type {
  ApiErrorResponse,
  AuthLoginResponse,
  AuthSessionPayload,
  Checkpoint,
  ProgressResponse,
  ProfileUpdateInput,
  UserProfile
} from '@ciclorota/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3333';
const STORAGE_KEY = 'ciclorota.app.session';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<AuthLoginResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const visitedCheckpointIds = useMemo(
    () => new Set(progress?.historico.map((entry) => entry.checkpoints.id) ?? []),
    [progress]
  );
  const completionRate = checkpoints.length
    ? Math.round(((progress?.total_visitados ?? 0) / checkpoints.length) * 100)
    : 0;
  const canIssueCertificate = Boolean(
    profile &&
      !profile.estatisticas.possui_certificado &&
      checkpoints.length > 0 &&
      (progress?.total_visitados ?? 0) >= checkpoints.length
  );

  useEffect(() => {
    void loadPublicCheckpoints();
  }, []);

  useEffect(() => {
    const stored = readStoredSession();

    if (!stored?.refreshToken) {
      setRestoring(false);
      return;
    }

    void restoreSession(stored.refreshToken);
  }, []);

  useEffect(() => {
    if (!session?.session.access_token) {
      setProfile(null);
      setProgress(null);
      return;
    }

    void loadJourney(session.session.access_token);
  }, [session?.session.access_token]);

  async function loadPublicCheckpoints() {
    try {
      setLoadingRoute(true);
      const response = await fetch(`${API_URL}/checkpoints`);

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const payload = (await response.json()) as Checkpoint[];
      setCheckpoints(payload);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setLoadingRoute(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Informe e-mail e senha para entrar no passaporte web.');
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const payload = (await response.json()) as AuthLoginResponse;
      persistSession(payload.session);
      applyAuthenticatedPayload(payload);
      setFeedback('Sessao iniciada com sucesso.');
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  }

  async function restoreSession(refreshToken: string) {
    try {
      setRestoring(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const payload = (await response.json()) as AuthLoginResponse;
      persistSession(payload.session);
      applyAuthenticatedPayload(payload);
    } catch {
      clearStoredSession();
      setSession(null);
    } finally {
      setRestoring(false);
    }
  }

  async function loadJourney(accessToken: string) {
    try {
      setLoadingJourney(true);
      setError(null);

      const [meResponse, progressResponse] = await Promise.all([
        fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }),
        fetch(`${API_URL}/me/progress`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
      ]);

      if (!meResponse.ok) {
        throw new Error(await extractError(meResponse));
      }

      if (!progressResponse.ok) {
        throw new Error(await extractError(progressResponse));
      }

      const mePayload = (await meResponse.json()) as AuthSessionPayload;
      const progressPayload = (await progressResponse.json()) as ProgressResponse;

      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              user: mePayload.user,
              profile: mePayload.profile
            }
          : currentSession
      );
      setProfile(mePayload.profile);
      setFullName(mePayload.profile?.full_name ?? '');
      setAvatarUrl(mePayload.profile?.avatar_url ?? '');
      setProgress(progressPayload);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setLoadingJourney(false);
    }
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.session.access_token || !profile) {
      return;
    }

    const payload: ProfileUpdateInput = {
      ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
      ...(avatarUrl.trim() ? { avatar_url: avatarUrl.trim() } : {})
    };

    try {
      setSavingProfile(true);
      setError(null);
      setFeedback(null);

      const response = await fetch(`${API_URL}/me/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const updatedProfile = (await response.json()) as Omit<UserProfile, 'estatisticas'>;
      const mergedProfile = {
        ...profile,
        ...updatedProfile
      };

      setProfile(mergedProfile);
      setFeedback('Perfil atualizado no backend.');
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleIssueCertificate() {
    if (!session?.session.access_token || !profile) {
      return;
    }

    try {
      setIssuingCertificate(true);
      setError(null);
      setFeedback(null);

      const response = await fetch(`${API_URL}/me/certificates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      const payload = (await response.json()) as {
        mensagem: string;
        certificado: { issued_at?: string };
      };

      setProfile({
        ...profile,
        estatisticas: {
          ...profile.estatisticas,
          possui_certificado: true,
          data_certificado: payload.certificado.issued_at ?? new Date().toISOString()
        }
      });
      setFeedback(payload.mensagem);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setIssuingCertificate(false);
    }
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    setProfile(null);
    setProgress(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setAvatarUrl('');
    setError(null);
    setFeedback(null);
  }

  function applyAuthenticatedPayload(payload: AuthLoginResponse) {
    setSession(payload);
    setProfile(payload.profile);
    setFullName(payload.profile?.full_name ?? '');
    setAvatarUrl(payload.profile?.avatar_url ?? '');
  }

  if (restoring) {
    return (
      <div className="app-shell centered-shell">
        <div className="sun-haze" />
        <section className="auth-card">
          <p className="eyebrow">Restaurando</p>
          <h1>Recuperando sua sessao do passaporte.</h1>
          <p>Estamos renovando o token salvo para continuar de onde voce parou.</p>
        </section>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell centered-shell">
        <div className="sun-haze" />
        <section className="auth-card">
          <p className="eyebrow">Passaporte da Ciclorota</p>
          <h1>Entre para acompanhar o seu progresso com sessao real.</h1>
          <p>
            A experiencia web agora usa o mesmo backend autenticado para carregar perfil,
            historico e atualizacao de dados do ciclista.
          </p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
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
              {busy ? 'Entrando...' : 'Entrar no passaporte'}
            </button>
          </form>

          {error ? <div className="message error">{error}</div> : null}

          <div className="hero-badges">
            <span>{loadingRoute ? 'Carregando trilha...' : `${checkpoints.length} checkpoints publicos`}</span>
            <span>API: {API_URL}</span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="sun-haze" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Sessao ativa</p>
          <h1>Seu passaporte web agora conversa com a API protegida por bearer token.</h1>
          <p className="hero-text">
            Depois do login, a interface passa a usar `/auth/me`, `/me/profile`, `/me/progress`
            e `/me/certificates` para refletir a jornada real do ciclista.
          </p>

          <div className="hero-badges">
            <span>{session.user.email ?? session.user.id}</span>
            <span>{loadingJourney ? 'Atualizando jornada...' : `${completionRate}% da rota concluida`}</span>
            {session.user.is_admin ? <span>Conta tambem marcada como admin</span> : null}
          </div>

          <div className="toolbar">
            <button type="button" onClick={handleIssueCertificate} disabled={!canIssueCertificate || issuingCertificate}>
              {issuingCertificate ? 'Emitindo...' : 'Emitir certificado'}
            </button>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        <div className="summary-card">
          <p className="eyebrow">Resumo do ciclista</p>
          {profile ? (
            <>
              <div className="profile-header">
                {profile.avatar_url ? (
                  <img className="avatar" src={profile.avatar_url} alt={profile.full_name ?? 'Avatar do usuario'} />
                ) : (
                  <div className="avatar fallback">
                    {(profile.full_name ?? 'CR').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2>{profile.full_name || 'Ciclista sem nome cadastrado'}</h2>
                  <p>{profile.id}</p>
                </div>
              </div>
              <div className="stats-grid">
                <article>
                  <strong>{progress?.total_visitados ?? 0}</strong>
                  <span>Pontos visitados</span>
                </article>
                <article>
                  <strong>{profile.estatisticas.possui_certificado ? 'Sim' : 'Ainda nao'}</strong>
                  <span>Certificado</span>
                </article>
                <article>
                  <strong>{checkpoints.length}</strong>
                  <span>Total da rota</span>
                </article>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Seu perfil ainda nao foi carregado.</h2>
              <p>Confirme se a conta tem registro na tabela `profiles` do backend.</p>
            </div>
          )}

          {feedback ? <div className="message success">{feedback}</div> : null}
          {error ? <div className="message error">{error}</div> : null}
        </div>
      </header>

      <main className="main-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Perfil editavel</p>
              <h2>Atualize nome e avatar sem sair da sessao atual</h2>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSaveProfile}>
            <label>
              Nome completo
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Seu nome"
                disabled={!profile || savingProfile}
              />
            </label>
            <label>
              URL do avatar
              <input
                type="url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                disabled={!profile || savingProfile}
              />
            </label>
            <button type="submit" disabled={!profile || savingProfile}>
              {savingProfile ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </form>
        </section>

        <section className="panel route-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Mapa verbal</p>
              <h2>Checklist da ciclorota</h2>
            </div>
            <span className="pill">{loadingRoute ? 'Carregando...' : `${checkpoints.length} etapas`}</span>
          </div>

          <div className="checkpoint-list">
            {checkpoints.map((checkpoint, index) => {
              const visited = visitedCheckpointIds.has(checkpoint.id);

              return (
                <article className={`checkpoint-card${visited ? ' visited' : ''}`} key={checkpoint.id}>
                  <div className="checkpoint-topline">
                    <span className="sequence">{String(index + 1).padStart(2, '0')}</span>
                    <span className="flag">{visited ? 'Visitado' : 'Disponivel'}</span>
                  </div>
                  <h3>{checkpoint.name}</h3>
                  <p>{checkpoint.description}</p>
                  <div className="coordinates">
                    <span>{checkpoint.latitude.toFixed(4)}</span>
                    <span>{checkpoint.longitude.toFixed(4)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel history-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Historico recente</p>
              <h2>Passagens registradas na sua conta</h2>
            </div>
          </div>

          {progress?.historico.length ? (
            <div className="history-list">
              {progress.historico.map((entry) => (
                <article className="history-card" key={entry.id}>
                  <strong>{entry.checkpoints.name}</strong>
                  <p>{entry.checkpoints.description}</p>
                  <time dateTime={entry.scanned_at}>
                    {new Date(entry.scanned_at).toLocaleString('pt-BR')}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-inline">
              Nenhum check-in encontrado ainda para esta conta.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function persistSession(session: { access_token: string; refresh_token: string }) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token
    })
  );
}

function readStoredSession(): StoredSession | null {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredSession;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

async function extractError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    return payload.error || `Falha na comunicacao com a API (${response.status}).`;
  } catch {
    return `Falha na comunicacao com a API (${response.status}).`;
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel concluir a operacao.';
}

export default App;
