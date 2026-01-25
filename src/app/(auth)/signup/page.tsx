import Link from "next/link";
import SignupForm from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Creative Campaign Copilot
        </p>
        <h1 className="text-3xl font-semibold">Create your workspace</h1>
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
