import { Resend } from "resend";
import { env } from "@config/env";
import { logger } from "@config/logger";

let resend: Resend | null = null;

function getResend(): Resend {
    if (!resend) {
        if (!env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured. Email sending is only available in Cloud edition.');
        }
        resend = new Resend(env.RESEND_API_KEY);
    }
    return resend;
}

export const sendVerificationEmail = async (email: string, token: string) => {
    const verifyLink = `${env.FRONTEND_URL}/auth/verify-email/${token}`;

    await getResend().emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: email,
        subject: "Подтверждение Email",
        html: `<p>Нажмите <a href="${verifyLink}">здесь</a>, чтобы подтвердить ваш email.</p>`,
    });

    logger.info(`Email отправлен на ${email}`);
};

export const sendInvitationEmail = async (
    email: string, 
    token: string, 
    teamName: string, 
    invitedBy: string
) => {
    const inviteLink = `${env.FRONTEND_URL}/teams/accept-invite/${token}`;

    await getResend().emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: email,
        subject: `Приглашение в команду ${teamName}`,
        html: `<p>Пользователь ${invitedBy} пригласил вас в команду ${teamName}.</p>
               <p>Нажмите <a href="${inviteLink}">здесь</a>, чтобы принять приглашение.</p>`,
    });

    logger.info(`Письмо с приглашением отправлено на ${email}`);
};
