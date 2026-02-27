export function confirmationEmail(name: string, confirmUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Confirme seu cadastro</h2>
      <p>Olá, ${name}!</p>
      <p>Clique no botão abaixo para confirmar sua assinatura da <strong>AI Health Newsletter</strong>.</p>
      <a href="${confirmUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;">
        Confirmar assinatura
      </a>
      <p style="color:#666;font-size:14px;">Se você não se cadastrou, ignore este email.</p>
    </div>
  `
}
