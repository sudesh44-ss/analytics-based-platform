import { Resend } from 'resend';

export interface AuditCompletedNotification {
  to: string;
  domain: string;
  overallScore: number;
  totalPages: number;
  issuesCount: number;
  auditId: string;
  appUrl?: string;
}

export interface SecurityAlertNotification {
  to: string;
  domain: string;
  ruleTitle: string;
  severity: string;
  recommendation: string;
  auditId: string;
  appUrl?: string;
}

export async function sendAuditCompletedEmail(
  payload: AuditCompletedNotification
): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'SiteScope <notifications@sitescope.io>';
  const appUrl = payload.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://sitescope.io';
  const reportUrl = `${appUrl}/audits/${payload.auditId}`;

  const scoreColor =
    payload.overallScore >= 80 ? '#10b981' : payload.overallScore >= 50 ? '#f59e0b' : '#ef4444';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SiteScope Audit Completed</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; }
        .header { text-align: center; margin-bottom: 24px; }
        .score-box { background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .score-num { font-size: 42px; font-weight: 800; color: ${scoreColor}; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; font-size: 20px;">Website Audit Completed</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Target: <strong>${payload.domain}</strong></p>
        </div>

        <div class="score-box">
          <div class="score-num">${payload.overallScore}/100</div>
          <div style="font-size: 13px; color: #64748b; font-weight: 600;">Overall Website Health Score</div>
        </div>

        <p style="font-size: 14px; line-height: 1.6;">
          Your automated SiteScope crawl has finished inspecting <strong>${payload.totalPages} pages</strong>. 
          We discovered <strong>${payload.issuesCount} actionable findings</strong> across SEO, Performance, Tech Health, and Security.
        </p>

        <div style="text-align: center;">
          <a href="${reportUrl}" class="btn">View Full Audit Report &rarr;</a>
        </div>

        <div class="footer">
          SiteScope — Website Analytics & Technical SEO Auditor SaaS<br>
          Automated diagnostic notification.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!apiKey || apiKey.includes('placeholder') || apiKey === 're_placeholder') {
    console.log(
      `[Resend Notice] Simulated email dispatch to ${payload.to}: Audit completed for ${payload.domain} (Score: ${payload.overallScore})`
    );
    return { success: true, id: 'simulated-resend-id' };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: `Audit Complete: ${payload.domain} — Health Score: ${payload.overallScore}/100`,
      html: htmlContent,
    });

    if (error) {
      console.warn(`[Resend Error] Failed to send audit email: ${error.message}`);
      return { success: false };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.warn(`[Resend Exception] ${err?.message || err}`);
    return { success: false };
  }
}

export async function sendSecurityAlertEmail(
  payload: SecurityAlertNotification
): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'SiteScope Security <security@sitescope.io>';
  const appUrl = payload.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://sitescope.io';
  const reportUrl = `${appUrl}/audits/${payload.auditId}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SiteScope Security Alert</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #fee2e2; padding: 32px; }
        .badge { background-color: #ef4444; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .btn { display: inline-block; background-color: #ef4444; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="badge">${payload.severity}</span>
        <h2 style="color: #b91c1c; margin-top: 8px;">Critical Issue Detected: ${payload.domain}</h2>
        <p style="font-size: 14px;"><strong>Issue: </strong>${payload.ruleTitle}</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px; font-size: 13px; margin: 16px 0;">
          <strong>Recommended Fix: </strong>${payload.recommendation}
        </div>
        <a href="${reportUrl}" class="btn">Review Findings in SiteScope &rarr;</a>
      </div>
    </body>
    </html>
  `;

  if (!apiKey || apiKey.includes('placeholder') || apiKey === 're_placeholder') {
    console.log(
      `[Resend Notice] Simulated security alert to ${payload.to}: ${payload.ruleTitle} on ${payload.domain}`
    );
    return { success: true, id: 'simulated-resend-id' };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: `🚨 [SiteScope Security] Critical finding on ${payload.domain}: ${payload.ruleTitle}`,
      html: htmlContent,
    });

    if (error) {
      console.warn(`[Resend Error] Failed to send security email: ${error.message}`);
      return { success: false };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.warn(`[Resend Exception] ${err?.message || err}`);
    return { success: false };
  }
}
