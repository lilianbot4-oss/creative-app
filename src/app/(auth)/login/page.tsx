import Link from "next/link";
import LoginForm from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Creative Campaign Copilot
        </p>
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Log in to manage clients, briefs, and AI campaign outputs.
        </p>
      </div>
      <LoginForm />
      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/signup">
          Sign up
        </Link>
      </p>
    </div>
  );
}
