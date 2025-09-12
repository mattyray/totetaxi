// frontend/src/app/login/page.tsx
import { MainLayout } from '@/components/layout/main-layout';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-16">
        <div className="container mx-auto px-4">
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  );
}