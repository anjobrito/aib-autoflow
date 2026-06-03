import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getSafeDatabaseError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Environment variable not found")) return "DATABASE_URL não configurada no ambiente do deploy.";
    if (error.message.includes("Can't reach database server")) return "Deploy não conseguiu alcançar o servidor do banco. Verifique DATABASE_URL e use o connection pooler do Supabase se estiver na Vercel.";
    if (error.message.includes("Timed out")) return "Conexão com o banco expirou por timeout. Verifique pooler, senha e região do Supabase.";
    if (error.message.includes("Authentication failed")) return "Autenticação do banco falhou. Verifique usuário e senha da DATABASE_URL.";
    if (error.message.includes("P1000")) return "Usuário ou senha do banco inválidos.";
    if (error.message.includes("P1001")) return "Servidor do banco inacessível.";
    if (error.message.includes("P1003")) return "Banco de dados informado na URL não existe.";
    return error.message;
  }

  return "Erro desconhecido ao conectar no banco.";
}

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const databaseUrlPreview = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@")
    : null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      success: true,
      database: "ok",
      env: {
        DATABASE_URL: hasDatabaseUrl ? "configured" : "missing",
        preview: databaseUrlPreview,
      },
    });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json({
      success: false,
      database: "error",
      env: {
        DATABASE_URL: hasDatabaseUrl ? "configured" : "missing",
        preview: databaseUrlPreview,
      },
      message: getSafeDatabaseError(error),
    }, { status: 500 });
  }
}
