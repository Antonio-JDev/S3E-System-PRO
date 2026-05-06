import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Cria transporter SMTP a partir de variáveis de ambiente.
 * @param envPrefix - Prefixo das variáveis: '' para SMTP_* (contato) ou 'FISCAL_' para SMTP_FISCAL_*
 */
function createSmtpTransporter(envPrefix: '' | 'FISCAL_'): Transporter | null {
  const host = process.env[`SMTP_${envPrefix}HOST`];
  const port = parseInt(process.env[`SMTP_${envPrefix}PORT`] || '587');
  const user = process.env[`SMTP_${envPrefix}USER`];
  const pass = process.env[`SMTP_${envPrefix}PASS`];

  if (!host || !user || !pass) return null;

  const isSecurePort = port === 465;
  const secure = process.env[`SMTP_${envPrefix}SECURE`] === 'true' || isSecurePort;
  const transporterConfig: any = {
    host,
    port,
    secure,
    auth: { user, pass },
  };
  if (!isSecurePort) {
    transporterConfig.tls = {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    };
  }
  return nodemailer.createTransport(transporterConfig);
}

/**
 * Transporter para e-mails de contato: recuperação de senha, alteração de dados, notificações.
 * Usa SMTP_* (contato@s3eengenharia.com.br).
 */
const createTransporter = (): Transporter | null => {
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return null;
  }
  if (process.env.SMTP_HOST) {
    const t = createSmtpTransporter('');
    if (t) return t;
  }
  if (process.env.SMTP_USER?.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

/**
 * Transporter para e-mails fiscais: envio de NFS-e/NF-e (DANFE e XML).
 * Usa SMTP_FISCAL_* (fiscal@s3eengenharia.com.br). Se não configurado, usa SMTP_* (contato).
 */
const createFiscalTransporter = (): Transporter | null => {
  if (process.env.SMTP_FISCAL_HOST && process.env.SMTP_FISCAL_USER && process.env.SMTP_FISCAL_PASS) {
    return createSmtpTransporter('FISCAL_');
  }
  return createTransporter();
};

/**
 * Envia email de recuperação de senha
 * 
 * @param to - Email do destinatário
 * @param resetToken - Token de recuperação
 * @param userName - Nome do usuário (opcional)
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string,
  userName?: string
): Promise<void> => {
  const transporter = createTransporter();
  
  // URL base do frontend (pode ser configurada via env)
  const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contato@s3eengenharia.com.br',
    to,
    subject: 'Recuperação de Senha - S3E System PRO',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background: #5568d3;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Recuperação de Senha</h1>
          <p>S3E System PRO</p>
        </div>
        <div class="content">
          <p>Olá${userName ? `, ${userName}` : ''}!</p>
          
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no S3E System PRO.</p>
          
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Redefinir Senha</a>
          </div>
          
          <p>Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-size: 12px;">
            ${resetLink}
          </p>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Este link expira em <strong>1 hora</strong></li>
              <li>Se você não solicitou esta recuperação, ignore este email</li>
              <li>Não compartilhe este link com ninguém</li>
            </ul>
          </div>
          
          <p>Se você não solicitou esta recuperação, pode ignorar este email com segurança.</p>
          
          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} S3E Engenharia. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Recuperação de Senha - S3E System PRO
      
      Olá${userName ? `, ${userName}` : ''}!
      
      Recebemos uma solicitação para redefinir a senha da sua conta.
      
      Clique no link abaixo para criar uma nova senha:
      ${resetLink}
      
      Este link expira em 1 hora.
      
      Se você não solicitou esta recuperação, ignore este email.
      
      © ${new Date().getFullYear()} S3E Engenharia.
    `,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email de recuperação enviado para: ${to}`);
    } else {
      // Em desenvolvimento, apenas logar
      console.log('📧 [DEV MODE] Email de recuperação de senha:');
      console.log(`   Para: ${to}`);
      console.log(`   Link: ${resetLink}`);
      console.log(`   Token: ${resetToken.substring(0, 20)}...`);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email de recuperação:', error);
    // Em desenvolvimento, ainda logar mesmo se falhar
    if (!transporter) {
      console.log('📧 [DEV MODE] Email de recuperação de senha:');
      console.log(`   Para: ${to}`);
      console.log(`   Link: ${resetLink}`);
    }
    // Não lançar erro para não expor informações sensíveis
    // O email pode falhar mas o token ainda é válido
  }
};

/**
 * Envia email de notificação de alteração de dados do usuário
 * 
 * @param to - Email do destinatário
 * @param userName - Nome do usuário
 * @param changes - Objeto com os campos alterados
 * @param changedBy - Nome do usuário que fez a alteração (opcional)
 */
export const sendUserDataChangeEmail = async (
  to: string,
  userName: string,
  changes: Record<string, { old: any; new: any }>,
  changedBy?: string
): Promise<void> => {
  const transporter = createTransporter();
  
  // URL base do frontend
  const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  const loginLink = `${frontendUrl}/login`;

  // Criar lista de alterações formatada
  const changesList = Object.entries(changes)
    .map(([field, values]) => {
      const fieldName = field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${fieldName}</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${values.old || '(vazio)'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">→</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${values.new || '(vazio)'}</td>
        </tr>
      `;
    })
    .join('');

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@s3eengenharia.com.br',
    to,
    subject: 'Alteração de Dados - S3E System PRO',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background: #5568d3;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 4px;
            overflow: hidden;
          }
          th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 Alteração de Dados</h1>
          <p>S3E System PRO</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${userName}</strong>!</p>
          
          <p>Informamos que os seguintes dados da sua conta foram alterados${changedBy ? ` por <strong>${changedBy}</strong>` : ''}:</p>
          
          <table>
            <thead>
              <tr>
                <th>Campo</th>
                <th>Valor Anterior</th>
                <th></th>
                <th>Novo Valor</th>
              </tr>
            </thead>
            <tbody>
              ${changesList}
            </tbody>
          </table>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Se você não autorizou esta alteração, entre em contato com o administrador imediatamente</li>
              <li>Verifique se você ainda consegue acessar sua conta normalmente</li>
              <li>Em caso de dúvidas, entre em contato com o suporte</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${loginLink}" class="button">Acessar Sistema</a>
          </div>
          
          <p>Se você autorizou esta alteração, pode ignorar este email.</p>
          
          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} S3E Engenharia. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Alteração de Dados - S3E System PRO
      
      Olá, ${userName}!
      
      Informamos que os seguintes dados da sua conta foram alterados${changedBy ? ` por ${changedBy}` : ''}:
      
      ${Object.entries(changes)
        .map(([field, values]) => {
          const fieldName = field.replace(/([A-Z])/g, ' $1').trim();
          return `${fieldName}: ${values.old || '(vazio)'} → ${values.new || '(vazio)'}`;
        })
        .join('\n')}
      
      Se você não autorizou esta alteração, entre em contato com o administrador imediatamente.
      
      Acesse o sistema: ${loginLink}
      
      © ${new Date().getFullYear()} S3E Engenharia.
    `,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email de alteração de dados enviado para: ${to}`);
    } else {
      // Em desenvolvimento, apenas logar
      console.log('📧 [DEV MODE] Email de alteração de dados:');
      console.log(`   Para: ${to}`);
      console.log(`   Usuário: ${userName}`);
      console.log(`   Alterações:`, changes);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email de alteração de dados:', error);
    // Em desenvolvimento, ainda logar mesmo se falhar
    if (!transporter) {
      console.log('📧 [DEV MODE] Email de alteração de dados:');
      console.log(`   Para: ${to}`);
      console.log(`   Usuário: ${userName}`);
      console.log(`   Alterações:`, changes);
    }
    // Não lançar erro para não interromper o fluxo
  }
};

/**
 * Envia email de notificação (Kanban, Financeiro, etc.)
 */
export const sendNotificationEmail = async (
  to: string,
  userName: string,
  titulo: string,
  mensagem: string
): Promise<void> => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contato@s3eengenharia.com.br',
    to,
    subject: `[S3E] ${titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Notificação - S3E System PRO</h2>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Olá, <strong>${userName}</strong>!</p>
          <p><strong>${titulo}</strong></p>
          <p>${mensagem}</p>
          <p style="margin-top: 24px; color: #666; font-size: 12px;">Este é um email automático. Acesse o sistema para mais detalhes.</p>
        </div>
      </body>
      </html>
    `,
    text: `Olá, ${userName}!\n\n${titulo}\n\n${mensagem}\n\nAcesse o sistema para mais detalhes.`,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Notificação enviada por e-mail para: ${to}`);
    } else {
      console.log('📧 [DEV MODE] Notificação:', { to, userName, titulo, mensagem });
    }
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail de notificação:', error);
  }
};

/**
 * Envia email com anexos (PDF, XML) - usado para envio de DANFE/NFS-e ao cliente.
 * Usa sempre o remetente fiscal (SMTP_FISCAL_* ou fallback SMTP_*).
 */
export const sendDocumentEmail = async (
  to: string,
  subject: string,
  bodyHtml: string,
  attachments: Array<{ filename: string; content: Buffer }>
): Promise<void> => {
  const transporter = createFiscalTransporter();
  const from =
    process.env.SMTP_FISCAL_FROM ||
    process.env.SMTP_FISCAL_USER ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'fiscal@s3eengenharia.com.br';

  const mailOptions = {
    from,
    to,
    subject,
    html: bodyHtml,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content
    }))
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email fiscal (anexos) enviado para: ${to}`);
    } else {
      console.log('📧 [DEV MODE] Email fiscal com anexos:', { to, subject, attachments: attachments.length });
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email fiscal com anexos:', error);
    throw error;
  }
};

/**
 * Testa a conexão com o servidor de email
 */
export const testEmailConnection = async (): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('⚠️  Email não configurado - usando modo desenvolvimento (console.log)');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Conexão com servidor de email verificada');
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar conexão de email:', error);
    return false;
  }
};

