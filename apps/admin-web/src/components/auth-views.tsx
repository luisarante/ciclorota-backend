import type { FormEventHandler, ReactNode } from 'react';

function CenteredShell(props: { children: ReactNode }) {
  return (
    <div className="admin-shell centered-shell">
      <div className="admin-noise" />
      <section className="auth-card">{props.children}</section>
    </div>
  );
}

export function RestoringSessionView() {
  return (
    <CenteredShell>
      <p className="eyebrow">Restaurando</p>
      <h1>Recuperando sua sessao administrativa.</h1>
      <p>Estamos consultando a sessao atual do Supabase antes de abrir o painel.</p>
    </CenteredShell>
  );
}

export function MissingSupabaseConfigView(props: { apiUrl: string }) {
  return (
    <CenteredShell>
      <p className="eyebrow">Configuracao pendente</p>
      <h1>Faltam variaveis do Supabase para autenticar o admin web.</h1>
      <p>
        Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente do `apps/admin-web`
        para usar o login nativo do Supabase e enviar o bearer token para a API.
      </p>

      <div className="info-strip">
        <span>VITE_API_URL: {props.apiUrl}</span>
        <span>Auth: Supabase nativo</span>
      </div>
    </CenteredShell>
  );
}

export function LoginView(props: {
  apiUrl: string;
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) {
  return (
    <CenteredShell>
      <p className="eyebrow">Ciclorota Command Deck</p>
      <h1>Entre com uma conta valida para acessar a operacao web.</h1>
      <p>
        O painel autentica direto no Supabase e usa o access token da sessao para consumir a API
        administrativa. O acesso continua liberado apenas para usuarios com `app_metadata.role`
        igual a `admin` ou `superadmin`.
      </p>

      <form className="auth-form" onSubmit={props.onSubmit}>
        <label>
          E-mail
          <input
            type="email"
            value={props.email}
            onChange={(event) => props.onEmailChange(event.target.value)}
            placeholder="voce@empresa.com"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={props.password}
            onChange={(event) => props.onPasswordChange(event.target.value)}
            placeholder="Sua senha"
          />
        </label>
        <button type="submit" disabled={props.busy}>
          {props.busy ? 'Entrando...' : 'Entrar no admin'}
        </button>
      </form>

      {props.error ? <div className="warning-box">{props.error}</div> : null}

      <div className="info-strip">
        <span>API: {props.apiUrl}</span>
        <span>Fluxo: Supabase Auth + Bearer /admin/*</span>
      </div>
    </CenteredShell>
  );
}

export function AccessDeniedView(props: {
  userLabel: string;
  role: string;
  onLogout: () => void;
}) {
  return (
    <CenteredShell>
      <p className="eyebrow">Acesso negado</p>
      <h1>Esta conta autenticou, mas ainda nao foi marcada como admin.</h1>
      <p>
        Hoje a API segue a role do Supabase. Para liberar esta conta, defina `app_metadata.role`
        como `admin` ou `superadmin`, com fallback aceito em `user_metadata.role`.
      </p>

      <div className="info-strip">
        <span>{props.userLabel}</span>
        <span>Role atual: {props.role}</span>
      </div>

      <button className="secondary-button" type="button" onClick={props.onLogout}>
        Sair
      </button>
    </CenteredShell>
  );
}
