import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';

export function LoginPage() {
  const { email, loading, login } = useAuth();
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && email) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginEmail.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center bg-bg px-4 py-10">
      <div className="rounded-2xl bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-bold text-ink">Shaken Notify</h1>
        <p className="mt-1 text-sm text-ink-3">整備工場向け案内デスク（デモログイン）</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="メールアドレス">
            <input
              className={inputClass}
              type="email"
              autoComplete="username"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="パスワード">
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? 'ログイン中…' : 'ログイン'}
          </Button>
        </form>

        <p className="mt-4 text-xs leading-relaxed text-ink-3">
          ローカル開発の初期値: demo@example.com / changeme（`.dev.vars` で変更可）
        </p>
      </div>
    </div>
  );
}
