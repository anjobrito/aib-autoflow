import { NextResponse, type NextRequest } from "next/server";

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
