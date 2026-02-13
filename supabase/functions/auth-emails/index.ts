import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

/**
 * Auth Emails Edge Function
 * Sends beautifully themed transactional emails via Resend
 * Triggered by Supabase Auth Hook
 */

// --- Security utilities ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ALLOWED_HOSTS = ['innrvo.com', 'www.innrvo.com', 'localhost'];

function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// Remove v1,whsec_ prefix from the secret as required by standardwebhooks library
const rawSecret = Deno.env.get('AUTH_WEBHOOK_SECRET');
if (!rawSecret) {
  console.error('CRITICAL: AUTH_WEBHOOK_SECRET not configured - webhook signature verification disabled');
}
const HOOK_SECRET = rawSecret ? rawSecret.replace('v1,whsec_', '') : '';
const FROM_EMAIL = 'Innrvo <noreply@innrvo.com>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ygweconeysctxpjjnehy.supabase.co';

// Supabase Auth Hook payload format
interface AuthHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

// Brand colors
const COLORS = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  secondary: '#A78BFA',
  accent: '#F5F3FF',
  text: '#1F2937',
  textLight: '#6B7280',
  white: '#FFFFFF',
  background: '#FAF5FF',
};

function getBaseTemplate(content: string, preheader: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Innrvo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${COLORS.background};">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto;">
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); border-radius: 16px; padding: 16px 24px;">
                <span style="font-size: 28px; font-weight: 700; color: ${COLORS.white}; letter-spacing: -0.5px;">innrvo</span>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${COLORS.white}; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                <tr>
                  <td style="padding: 48px 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.textLight};">Your journey to inner peace starts here</p>
              <p style="margin: 0; font-size: 12px; color: ${COLORS.textLight};">© ${new Date().getFullYear()} Innrvo. All rights reserved.</p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: ${COLORS.textLight};">
                <a href="https://innrvo.com/privacy" style="color: ${COLORS.primary}; text-decoration: none;">Privacy Policy</a>
                &nbsp;•&nbsp;
                <a href="https://innrvo.com/terms" style="color: ${COLORS.primary}; text-decoration: none;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function getButton(text: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
      <tr>
        <td style="border-radius: 12px; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); box-shadow: 0 4px 14px 0 rgba(124, 58, 237, 0.4);">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: ${COLORS.white}; text-decoration: none; border-radius: 12px;">${text}</a>
        </td>
      </tr>
    </table>
  `;
}

function buildVerificationUrl(tokenHash: string, type: string, redirectTo: string): string {
  return `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

function getSignupEmail(name: string, verifyUrl: string): { subject: string; html: string } {
  const firstName = escapeHtml(name?.split(' ')[0] || 'there');
  const content = `
    <div style="text-align: center; margin-bottom: 24px;"><span style="font-size: 48px;">🧘</span></div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${COLORS.text}; text-align: center;">Welcome to Innrvo</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">Hi ${firstName}! We're thrilled to have you join our community of mindful souls seeking inner peace and clarity.</p>
    <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.text}; text-align: center;">Please confirm your email to begin your journey:</p>
    ${getButton('Confirm Email', verifyUrl)}
    <div style="background-color: ${COLORS.accent}; border-radius: 12px; padding: 20px; margin-top: 32px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;"><strong style="color: ${COLORS.text};">What's next?</strong><br>Create your first personalized meditation tailored to exactly how you're feeling.</p>
    </div>
    <p style="margin: 32px 0 0 0; font-size: 13px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
  `;
  return { subject: 'Welcome to Innrvo - Confirm Your Email ✨', html: getBaseTemplate(content, 'Confirm your email to start your meditation journey with Innrvo') };
}

function getPasswordResetEmail(name: string, verifyUrl: string): { subject: string; html: string } {
  const firstName = escapeHtml(name?.split(' ')[0] || 'there');
  const content = `
    <div style="text-align: center; margin-bottom: 24px;"><span style="font-size: 48px;">🔐</span></div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${COLORS.text}; text-align: center;">Reset Your Password</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">Hi ${firstName}, we received a request to reset your password. Click the button below to create a new one.</p>
    ${getButton('Reset Password', verifyUrl)}
    <div style="background-color: ${COLORS.accent}; border-radius: 12px; padding: 20px; margin-top: 32px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;"><strong style="color: ${COLORS.text};">🕐 This link expires in 1 hour</strong><br>For your security, this password reset link is only valid for 60 minutes.</p>
    </div>
    <p style="margin: 32px 0 0 0; font-size: 13px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">If you didn't request a password reset, please ignore this email.</p>
  `;
  return { subject: 'Reset Your Innrvo Password', html: getBaseTemplate(content, 'Reset your Innrvo password - this link expires in 1 hour') };
}

function getMagicLinkEmail(name: string, verifyUrl: string): { subject: string; html: string } {
  const firstName = escapeHtml(name?.split(' ')[0] || 'there');
  const content = `
    <div style="text-align: center; margin-bottom: 24px;"><span style="font-size: 48px;">✨</span></div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${COLORS.text}; text-align: center;">Your Magic Link</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">Hi ${firstName}! Click the button below to securely sign in to your Innrvo account.</p>
    ${getButton('Sign In to Innrvo', verifyUrl)}
    <div style="background-color: ${COLORS.accent}; border-radius: 12px; padding: 20px; margin-top: 32px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;"><strong style="color: ${COLORS.text};">🕐 This link expires in 10 minutes</strong><br>For your security, magic links are single-use and expire quickly.</p>
    </div>
    <p style="margin: 32px 0 0 0; font-size: 13px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">If you didn't request this link, you can safely ignore this email.</p>
  `;
  return { subject: 'Your Innrvo Magic Link ✨', html: getBaseTemplate(content, 'Sign in to Innrvo with your magic link') };
}

function getInviteEmail(name: string, verifyUrl: string): { subject: string; html: string } {
  const firstName = escapeHtml(name?.split(' ')[0] || 'there');
  const content = `
    <div style="text-align: center; margin-bottom: 24px;"><span style="font-size: 48px;">🎁</span></div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${COLORS.text}; text-align: center;">You've Been Invited!</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">Hi ${firstName}! You've been invited to join Innrvo - your personal AI meditation companion.</p>
    ${getButton('Accept Invitation', verifyUrl)}
    <div style="background-color: ${COLORS.accent}; border-radius: 12px; padding: 20px; margin-top: 32px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;"><strong style="color: ${COLORS.text};">What is Innrvo?</strong><br>Create personalized guided meditations tailored to exactly how you're feeling.</p>
    </div>
  `;
  return { subject: "You've Been Invited to Innrvo ✨", html: getBaseTemplate(content, "You've been invited to join Innrvo - accept your invitation") };
}

function getEmailChangeEmail(name: string, verifyUrl: string): { subject: string; html: string } {
  const firstName = escapeHtml(name?.split(' ')[0] || 'there');
  const content = `
    <div style="text-align: center; margin-bottom: 24px;"><span style="font-size: 48px;">📧</span></div>
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${COLORS.text}; text-align: center;">Confirm Email Change</h1>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">Hi ${firstName}, please confirm your email change by clicking the button below.</p>
    ${getButton('Confirm Email Change', verifyUrl)}
    <p style="margin: 32px 0 0 0; font-size: 13px; line-height: 1.6; color: ${COLORS.textLight}; text-align: center;">If you didn't request this change, please contact support immediately.</p>
  `;
  return { subject: 'Confirm Your New Email Address - Innrvo', html: getBaseTemplate(content, 'Confirm your email address change for Innrvo') };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Resend API error:', error);
    throw new Error(error.message || 'Failed to send email');
  }

  const data = await response.json();
  console.log('Email sent successfully:', data.id);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let verified: AuthHookPayload;

  // SECURITY: Require webhook signature verification
  if (!HOOK_SECRET) {
    console.error('Webhook rejected: AUTH_WEBHOOK_SECRET not configured');
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Webhook secret not configured' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const wh = new Webhook(HOOK_SECRET);
    verified = wh.verify(payload, headers) as AuthHookPayload;
  } catch (error) {
    console.error('Webhook verification failed:', error);
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: 'Invalid webhook signature' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { user, email_data } = verified;
  const { token_hash, redirect_to, email_action_type } = email_data;

  console.log('Processing email:', { type: email_action_type, email: user.email });

  try {
    const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const safeRedirect = redirect_to && isAllowedRedirect(redirect_to) ? redirect_to : 'https://innrvo.com';
    const verifyUrl = buildVerificationUrl(token_hash, email_action_type, safeRedirect);

    let emailContent: { subject: string; html: string };

    switch (email_action_type) {
      case 'signup':
        emailContent = getSignupEmail(name, verifyUrl);
        break;
      case 'recovery':
        emailContent = getPasswordResetEmail(name, verifyUrl);
        break;
      case 'magiclink':
        emailContent = getMagicLinkEmail(name, verifyUrl);
        break;
      case 'invite':
        emailContent = getInviteEmail(name, verifyUrl);
        break;
      case 'email_change':
      case 'email_change_new':
        emailContent = getEmailChangeEmail(name, verifyUrl);
        break;
      default:
        console.warn('Unknown email type:', email_action_type);
        emailContent = getSignupEmail(name, verifyUrl);
    }

    await sendEmail(user.email, emailContent.subject, emailContent.html);

    // Return empty object on success (required by Supabase)
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error instanceof Error ? error.message : 'Failed to send email',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
