import { NextResponse, type NextRequest } from "next/server";

const adminProtectedPrefixes = ["/admin"];

const protectedPrefixes = [
  "/dashboard",
  "/clientes",
  "/veiculos",
  "/fornecedores",
  "/funcionarios",
  "/produtos",
  "/servicos",
  "/ordens-servico",
  "/patio",
  "/patio-mobile",
  "/historico-veiculo",
  "/vistoria",
  "/lembretes",
  "/financeiro",
  "/contas-pagar",
  "/contas-receber",
  "/comissoes",
  "/financiamentos-gravames",
  "/empresa",
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/admin/entrar") return NextResponse.next();

  const isAdminProtectedRoute = adminProtectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isAdminProtectedRoute) {
    const adminSessionCookie = request.cookies.get("ajb_platform_admin_session")?.value;
    if (adminSessionCookie) return NextResponse.next();

    const adminLoginUrl = new URL("/admin/entrar", request.url);
    adminLoginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(adminLoginUrl);
  }

  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isProtectedRoute) return NextResponse.next();

  const sessionCookie = request.cookies.get("ajb_session")?.value;
  if (sessionCookie) return NextResponse.next();

  const loginUrl = new URL("/entrar", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
