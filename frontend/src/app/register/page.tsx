// frontend/src/app/register/page.tsx
import { MainLayout } from '@/components/layout/main-layout';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-16">
        <div className="container mx-auto px-4">
          <RegisterForm />
        </div>
      </div>
    </MainLayout>
  );
}