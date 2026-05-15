import dynamic from "next/dynamic";

const LoginRouteClient = dynamic(
  () => import("@/components/auth/login-route-client").then((m) => m.LoginRouteClient),
  {
    ssr: true,
    loading: () => (
      <div
        className="relative min-h-dvh bg-background"
        role="status"
        aria-busy="true"
        aria-label="Loading sign in"
      >
        <div className="mx-auto max-w-md p-8 pt-24">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="mt-10 h-44 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    ),
  }
);

export default function LoginPage() {
  return <LoginRouteClient />;
}
