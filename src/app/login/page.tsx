import { LoginForm } from './login-form';
import { PLATFORM_NAME } from '@/lib/brand';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-slate-100 p-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">
            {PLATFORM_NAME[0]}
          </div>
          <h1 className="text-xl font-bold">Sign in to {PLATFORM_NAME}</h1>
          <p className="muted">Manage your AI voice agents</p>
        </div>
        <LoginForm next={next || '/dashboard'} />
      </div>
    </main>
  );
}
