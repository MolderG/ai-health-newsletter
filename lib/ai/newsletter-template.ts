export interface Materia {
  titulo: string
  oQueAconteceu: string
  comoFunciona: string
  porQueImporta: string
  nossaVisao: string
}

export interface NumeroDaSemana {
  numero: string
  contexto: string
  fonte: string
}

export interface BlocoPromo {
  texto: string
  cta: string
  ctaUrl: string
}

export interface NewsletterContent {
  subject: string
  materias: Materia[] // 4 a 5
  numeroDaSemana?: NumeroDaSemana | null
  blocoPromo?: BlocoPromo | null
}

function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function renderMateria(m: Materia): string {
  return `
    <div style="margin-bottom:8px">
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#111827;margin:0 0 20px 0;line-height:1.3">${m.titulo}</h2>

      <p style="margin:0 0 4px 0">
        <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#374151">O que aconteceu:</span>
      </p>
      <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px 0">${m.oQueAconteceu}</p>

      <p style="margin:0 0 4px 0">
        <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#374151">Como funciona:</span>
      </p>
      <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px 0">${m.comoFunciona}</p>

      <p style="margin:0 0 4px 0">
        <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#374151">Por que importa para hospitais:</span>
      </p>
      <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px 0">${m.porQueImporta}</p>

      <p style="margin:0 0 4px 0">
        <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#1a5276">Nossa visão:</span>
      </p>
      <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#374151;margin:0">${m.nossaVisao}</p>
    </div>`
}

const HR = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">`

export function renderNewsletterHTML(data: NewsletterContent, unsubscribeUrl?: string): string {
  const materiasHtml = data.materias
    .map(m => `${renderMateria(m)}${HR}`)
    .join('\n')

  const numeroDaSemanaHtml =
    data.numeroDaSemana
      ? `<div style="background:#f0f4f8;border-left:4px solid #1a5276;padding:20px 24px;margin-bottom:8px">
        <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#1a5276;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px 0">Número da Semana</p>
        <p style="font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#111827;margin:0 0 8px 0">${data.numeroDaSemana.numero}</p>
        <p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#374151;margin:0 0 8px 0">${data.numeroDaSemana.contexto}</p>
        <p style="font-family:Arial,sans-serif;font-size:13px;color:#6b7280;margin:0">${data.numeroDaSemana.fonte}</p>
      </div>${HR}`
      : ''

  const blocoPromoHtml =
    data.blocoPromo
      ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:24px;margin-bottom:8px">
        <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px 0">${data.blocoPromo.texto}</p>
        <a href="${data.blocoPromo.ctaUrl}" style="display:inline-block;background:#1a5276;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:4px;text-decoration:none">${data.blocoPromo.cta}</a>
      </div>${HR}`
      : ''

  const unsubscribeHtml = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Descadastrar</a>`
    : `<a href="[LINK_DESCADASTRO]" style="color:#9ca3af;text-decoration:underline">Descadastrar</a>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AI Health Newsletter</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;font-family:Georgia,serif">

    <!-- HEADER -->
    <div style="background:#1a5276;padding:32px 40px;text-align:center">
      <h1 style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;margin:0 0 6px 0;letter-spacing:0.02em">AI HEALTH NEWSLETTER</h1>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#a8c6de;margin:0 0 10px 0">Inteligência artificial para gestores de saúde</p>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#7fb3d3;margin:0">${formatDate()}</p>
    </div>

    <div style="padding:40px 40px 0 40px">

      <!-- MATÉRIAS -->
      ${materiasHtml}

      <!-- NÚMERO DA SEMANA -->
      ${numeroDaSemanaHtml}

      <!-- BLOCO PROMO -->
      ${blocoPromoHtml}

      <!-- RODAPÉ -->
      <div style="padding:24px 0 40px 0;text-align:center">
        <p style="font-family:Georgia,serif;font-size:14px;color:#6b7280;margin:0 0 12px 0">
          Tem uma sugestão de pauta? Responda este email.
        </p>
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:0">
          ${unsubscribeHtml} &nbsp;·&nbsp;
          <a href="[LINK_EDICOES_ANTERIORES]" style="color:#9ca3af;text-decoration:underline">Edições anteriores</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`
}
