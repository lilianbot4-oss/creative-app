import Link from "next/link";
import SignupForm from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Creative Campaign Copilot
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Start organizing briefs and generating pitch-ready campaigns.
        </p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
