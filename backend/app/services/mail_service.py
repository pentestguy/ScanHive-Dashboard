import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class MailService:

    @property
    def is_configured(self) -> bool:
        return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)

    def send(self, to_email: str, subject: str, text_body: str, html_body: str) -> bool:
        if not self.is_configured:
            return False

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = (
            f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            if settings.SMTP_FROM_NAME
            else settings.SMTP_FROM_EMAIL
        )
        message["To"] = to_email
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as client:
                if settings.SMTP_USE_TLS:
                    client.starttls()
                if settings.SMTP_USERNAME:
                    client.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                client.send_message(message)
            return True
        except Exception:
            logger.exception("Failed to send email to %s", to_email)
            return False

    def send_invitation(
        self,
        to_email: str,
        organization_name: str,
        invited_by_email: str,
        invite_link: str,
        expiry_days: int,
    ) -> bool:
        subject = f"You're invited to join {organization_name} on ScanHive"
        text_body = (
            f"{invited_by_email} invited you to join {organization_name} on ScanHive.\n\n"
            f"Accept your invitation:\n{invite_link}\n\n"
            f"This link expires in {expiry_days} days."
        )
        html_body = (
            f"<p>{invited_by_email} invited you to join <strong>{organization_name}</strong> on ScanHive.</p>"
            f'<p><a href="{invite_link}">Accept your invitation</a></p>'
            f"<p>This link expires in {expiry_days} days.</p>"
        )
        return self.send(to_email, subject, text_body, html_body)
