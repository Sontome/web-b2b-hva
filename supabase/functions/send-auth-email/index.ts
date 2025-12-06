import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailPayload {
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const getEmailContent = (type: string, confirmLink: string, userName: string) => {
  const templates: Record<string, { subject: string; html: string }> = {
    signup: {
      subject: "Xác nhận đăng ký tài khoản - HanVietAir",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a5f;">HanVietAir</h1>
          </div>
          <h2 style="color: #333;">Xin chào ${userName || "bạn"},</h2>
          <p style="color: #666; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản tại HanVietAir. Vui lòng nhấn vào nút bên dưới để xác nhận địa chỉ email của bạn.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmLink}" style="background-color: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Xác nhận Email
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">
            Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 HanVietAir. All rights reserved.
          </p>
        </div>
      `,
    },
    recovery: {
      subject: "Đặt lại mật khẩu - HanVietAir",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a5f;">HanVietAir</h1>
          </div>
          <h2 style="color: #333;">Xin chào ${userName || "bạn"},</h2>
          <p style="color: #666; line-height: 1.6;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để đặt mật khẩu mới.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmLink}" style="background-color: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 HanVietAir. All rights reserved.
          </p>
        </div>
      `,
    },
    email_change: {
      subject: "Xác nhận thay đổi email - HanVietAir",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a5f;">HanVietAir</h1>
          </div>
          <h2 style="color: #333;">Xin chào ${userName || "bạn"},</h2>
          <p style="color: #666; line-height: 1.6;">
            Bạn đã yêu cầu thay đổi địa chỉ email. Nhấn vào nút bên dưới để xác nhận.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmLink}" style="background-color: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Xác nhận Email mới
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">
            Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 HanVietAir. All rights reserved.
          </p>
        </div>
      `,
    },
  };

  return templates[type] || templates.signup;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AuthEmailPayload = await req.json();
    console.log("Received auth email request:", JSON.stringify(payload, null, 2));

    const { user, email_data } = payload;
    const { token_hash, redirect_to, email_action_type } = email_data;

    // Build confirmation link
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const confirmLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    const userName = user.user_metadata?.full_name || "";
    const emailContent = getEmailContent(email_action_type, confirmLink, userName);

    console.log("Sending email to:", user.email);
    console.log("Email type:", email_action_type);
    console.log("Confirm link:", confirmLink);

    const { data, error } = await resend.emails.send({
      from: "HanVietAir <noreply@hanvietair.com>",
      to: [user.email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending auth email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
