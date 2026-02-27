export default function Obrigado() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">📬</div>
        <h1 className="text-2xl font-bold text-gray-900">Verifique seu email</h1>
        <p className="text-gray-500">
          Enviamos um link de confirmação para o seu email.
          Clique no link para ativar sua assinatura.
        </p>
        <p className="text-sm text-gray-400">
          Não encontrou? Verifique a caixa de spam.
        </p>
      </div>
    </main>
  )
}
