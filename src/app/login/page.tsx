import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            PEAK <span className="text-primary">Operations</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage orders &amp; inventory.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
