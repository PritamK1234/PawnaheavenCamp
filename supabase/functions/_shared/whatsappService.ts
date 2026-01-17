interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

interface ButtonAction {
  id: string;
  title: string;
}

interface InteractiveButton {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
}

export class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private isConfigured = false;

  constructor() {
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

    if (phoneNumberId && accessToken) {
      this.config = { phoneNumberId, accessToken };
      this.isConfigured = true;
    } else {
      console.warn("WhatsApp not configured. Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    }
  }

  private logMessage(type: string, to: string, payload: any) {
    console.log(`[WhatsApp ${type}] Would send to ${to}:`, JSON.stringify(payload, null, 2));
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/^\+/, ""),
      type: "text",
      text: { body: text },
    };

    if (!this.isConfigured) {
      this.logMessage("TEXT", to, payload);
      return true;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${this.config!.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config!.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("WhatsApp API error:", error);
        return false;
      }

      const result = await response.json();
      console.log("WhatsApp message sent:", result);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      return false;
    }
  }

  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: ButtonAction[]
  ): Promise<boolean> {
    const interactiveButtons: InteractiveButton[] = buttons.map((btn) => ({
      type: "reply",
      reply: {
        id: btn.id,
        title: btn.title,
      },
    }));

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/^\+/, ""),
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: interactiveButtons,
        },
      },
    };

    if (!this.isConfigured) {
      this.logMessage("INTERACTIVE", to, payload);
      return true;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${this.config!.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config!.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("WhatsApp API error:", error);
        return false;
      }

      const result = await response.json();
      console.log("WhatsApp interactive message sent:", result);
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp interactive message:", error);
      return false;
    }
  }

  extractButtonResponse(webhookPayload: any): { from: string; buttonId: string } | null {
    try {
      const entry = webhookPayload?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message || message.type !== "interactive") {
        return null;
      }

      const buttonReply = message.interactive?.button_reply;
      if (!buttonReply) {
        return null;
      }

      return {
        from: message.from,
        buttonId: buttonReply.id,
      };
    } catch (error) {
      console.error("Failed to extract button response:", error);
      return null;
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "villa_booking_verify_2025";

    if (mode === "subscribe" && token === verifyToken) {
      return challenge;
    }

    return null;
  }
}
