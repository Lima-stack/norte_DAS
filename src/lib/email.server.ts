import nodemailer from "nodemailer";

export interface EnviarEmailPropostaParams {
  paraEmail: string;
  nomeCliente: string;
  resumo: string;
  total: number;
  linkProposta: string;
}

export type EnviarEmailResultado = { ok: true; messageId: string } | { ok: false; error: string };

function formatarMoeda(val: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(val);
}

/**
 * Cria o transporte do Nodemailer utilizando SMTP do Gmail com password de aplicação.
 * As credenciais são lidas estritamente de process.env (EMAIL_USER e EMAIL_PASS).
 */
function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Credenciais de email em falta no servidor (EMAIL_USER ou EMAIL_PASS não configurados).",
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ""), // Remove quaisquer espaços na app password do Gmail
    },
  });
}

/**
 * Envia o e-mail de notificação de proposta ao cliente.
 */
export async function enviarEmailProposta(
  params: EnviarEmailPropostaParams,
): Promise<EnviarEmailResultado> {
  const { paraEmail, nomeCliente, resumo, total, linkProposta } = params;

  try {
    const transporter = getTransporter();
    const user = process.env.EMAIL_USER!.trim();
    const totalFormatado = formatarMoeda(total);

    const assunto = "A sua proposta da Norte";

    const textoPlano = `Olá, ${nomeCliente}!

Obrigado pelo seu contacto com a Norte. Preparámos uma proposta personalizada com base nas suas necessidades.

Resumo do Pedido:
${resumo}

Total (c/ IVA 23%):
${totalFormatado}

Pode consultar a sua proposta completa e discriminada no seguinte link:
${linkProposta}

Tem alguma dúvida ou pretende personalizar algum detalhe? Pode agendar uma reunião diretamente na página da sua proposta.

Com os melhores cumprimentos,
A equipa da Norte
`;

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assunto}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f6f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f6f2; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #ebe9e1;" cellspacing="0" cellpadding="0">
          <!-- CABEÇALHO -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid #f0eee6;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #111111; color: #ffffff; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 10px; font-weight: bold; font-size: 18px; vertical-align: middle;">N</span>
                    <span style="display: inline-block; font-size: 20px; font-weight: 700; color: #111111; margin-left: 10px; vertical-align: middle; letter-spacing: -0.5px;">Norte</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: #e6f4ea; color: #00875a; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Proposta Comercial</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTEÚDO -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111111; letter-spacing: -0.5px;">
                Olá, ${nomeCliente}!
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; color: #4a4a4a; line-height: 1.6;">
                Obrigado pelo seu pedido. Analisámos com detalhe os requisitos que nos transmitiu e elaborámos uma proposta personalizada com base no nosso catálogo oficial.
              </p>

              <!-- CARTÃO DE RESUMO -->
              <table role="presentation" width="100%" style="background-color: #fbfbf9; border: 1px solid #eeece3; border-radius: 14px; margin-bottom: 24px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="font-size: 11px; font-weight: 700; color: #00875a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      Resumo do Pedido
                    </div>
                    <div style="font-size: 14px; color: #222222; line-height: 1.5;">
                      ${resumo}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CARTÃO DE TOTAL -->
              <table role="presentation" width="100%" style="background-color: #111111; border-radius: 14px; margin-bottom: 32px; color: #ffffff;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px 24px;">
                    <span style="font-size: 13px; color: #a0a0a0; display: block; margin-bottom: 4px;">Valor Total Previsto (c/ IVA 23%)</span>
                    <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">${totalFormatado}</span>
                  </td>
                </tr>
              </table>

              <!-- BOTÃO DE AÇÃO -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${linkProposta}" target="_blank" style="display: inline-block; background-color: #00875a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 135, 90, 0.25);">
                      Ver Proposta Completa &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; font-size: 12px; color: #888888; text-align: center;">
                Ou aceda diretamente através da ligação:
              </p>
              <p style="margin: 0; font-size: 12px; color: #00875a; text-align: center; word-break: break-all;">
                <a href="${linkProposta}" style="color: #00875a; text-decoration: underline;">${linkProposta}</a>
              </p>
            </td>
          </tr>

          <!-- RODAPÉ -->
          <tr>
            <td style="padding: 24px 36px 32px; background-color: #faf9f6; border-top: 1px solid #f0eee6; font-size: 12px; color: #777777; text-align: center; line-height: 1.5;">
              <p style="margin: 0 0 6px;">
                <strong>Norte</strong> &mdash; O seu negócio começa aqui.
              </p>
              <p style="margin: 0;">
                Este e-mail é referente ao pedido de proposta submetido em nosso website.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: `"Norte" <${user}>`,
      to: paraEmail,
      subject: assunto,
      text: textoPlano,
      html,
    });

    console.log(
      `[Email Server] Email de proposta enviado com sucesso para ${paraEmail}. MessageId: ${info.messageId}`,
    );
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : String(err || "Falha desconhecida no envio de email.");
    console.error(`[Email Server] Erro ao enviar email para ${paraEmail}:`, errorMsg);
    return { ok: false, error: errorMsg };
  }
}
