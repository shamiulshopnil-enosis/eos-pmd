import { Injectable, Logger } from "@nestjs/common";

export interface OutboundEmail {
  to: string[];
  subject: string;
  body: string;
}

/**
 * Stub mailer. This prototype has no SMTP transport (sign-in one-time codes are
 * shown on screen / logged too), so a "sent" message is written to the server
 * log and echoed back to the caller for on-screen confirmation. Swap the body of
 * `send` for a real transport (nodemailer, Resend, …) when one is configured.
 */
@Injectable()
export class MailerService {
  private readonly log = new Logger("Mailer");

  async send(email: OutboundEmail): Promise<OutboundEmail> {
    this.log.log(
      "\n──────── EMAIL (stubbed — not actually delivered) ────────\n" +
        `To:      ${email.to.join(", ")}\n` +
        `Subject: ${email.subject}\n\n` +
        `${email.body}\n` +
        "─────────────────────────────────────────────────────────",
    );
    return email;
  }
}
