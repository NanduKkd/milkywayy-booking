const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

const TEMPLATE_ENV_KEYS = {
  login_otp: "TWILIO_CONTENT_SID_LOGIN_OTP",
  shoot_confirmation: "TWILIO_CONTENT_SID_SHOOT_CONFIRMATION",
  shoot_reminder: "TWILIO_CONTENT_SID_SHOOT_REMINDER",
  team_on_the_way: "TWILIO_CONTENT_SID_TEAM_ON_THE_WAY",
  team_arrived: "TWILIO_CONTENT_SID_TEAM_ARRIVED",
  shoot_rescheduled: "TWILIO_CONTENT_SID_SHOOT_RESCHEDULED",
  shoot_cancelled: "TWILIO_CONTENT_SID_SHOOT_CANCELLED",
  single_service_media_ready: "TWILIO_CONTENT_SID_SINGLE_SERVICE_MEDIA_READY",
  partial_media_upload: "TWILIO_CONTENT_SID_PARTIAL_MEDIA_UPLOAD",
  full_media_upload: "TWILIO_CONTENT_SID_FULL_MEDIA_UPLOAD",
};

const TEMPLATE_VARIABLE_ORDER = {
  login_otp: ["Code", "Expiry_Minutes"],
  shoot_confirmation: [
    "Property_Name",
    "Client_Name",
    "Shoot_Date",
    "Arrival_Window",
    "Dashboard_Manage_Booking",
  ],
  shoot_reminder: [
    "Property_Name",
    "Client_Name",
    "Shoot_Date",
    "Arrival_Window",
  ],
  team_on_the_way: ["Property_Name", "Arrival_Window"],
  team_arrived: ["Property_Name"],
  shoot_rescheduled: ["Property_Name", "Shoot_Date", "Arrival_Window"],
  shoot_cancelled: [
    "Property_Name",
    "Client_Name",
    "Shoot_Date",
    "Booking_Page",
  ],
  single_service_media_ready: ["Property_Name", "Client_Name"],
  partial_media_upload: ["Property_Name", "Client_Name", "Pending_Deliverable"],
  full_media_upload: ["Property_Name", "Client_Name"],
};

const TEMPLATES_FALLBACK = {
  login_otp: ({ Code, Expiry_Minutes }) =>
    [
      `${Code} is your verification code. For your security, do not share this code.`,
      "",
      `This code expires in ${Expiry_Minutes || "5"} minutes.`,
    ].join("\n"),

  shoot_confirmation: ({
    Property_Name,
    Client_Name,
    Shoot_Date,
    Arrival_Window,
    Dashboard_Manage_Booking,
  }) =>
    [
      `Booking Confirmed: ${Property_Name}`,
      "",
      Client_Name
        ? `Hi ${Client_Name}, your shoot is scheduled.`
        : "Your shoot is scheduled.",
      `Date: ${Shoot_Date}`,
      `Arrival Window: ${Arrival_Window}`,
      Dashboard_Manage_Booking
        ? `Manage Booking: ${Dashboard_Manage_Booking}`
        : null,
      "",
      "Please ensure the property is clean and access is ready.",
      "Thanks for booking with Milkywayy.",
    ]
      .filter(Boolean)
      .join("\n"),

  shoot_reminder: ({
    Property_Name,
    Client_Name,
    Shoot_Date,
    Arrival_Window,
  }) =>
    [
      `Shoot Reminder: ${Property_Name}`,
      "",
      Client_Name
        ? `Hi ${Client_Name}, a quick reminder that our team will arrive ${Shoot_Date} between ${Arrival_Window}.`
        : `A quick reminder that our team will arrive ${Shoot_Date} between ${Arrival_Window}.`,
      "Please ensure property access is ready.",
      "",
      "See you soon.",
    ].join("\n"),

  team_on_the_way: ({ Property_Name, Arrival_Window }) =>
    [
      "We're on our way!",
      "",
      `Property: ${Property_Name}`,
      `Estimated Arrival: ${Arrival_Window}`,
      "",
      "If you have parking or access instructions, please reply here.",
    ].join("\n"),

  team_arrived: ({ Property_Name }) =>
    [
      "We've arrived!",
      "",
      `Our team is at the location for your shoot at ${Property_Name}.`,
      "We'll begin shortly.",
    ].join("\n"),

  shoot_rescheduled: ({ Property_Name, Shoot_Date, Arrival_Window }) =>
    [
      "Booking Rescheduled",
      "",
      "Your shoot has been rescheduled.",
      `Property: ${Property_Name}`,
      `New date: ${Shoot_Date}`,
      `New arrival window: ${Arrival_Window}`,
      "",
      "You can view the latest booking details in your dashboard.",
    ].join("\n"),

  shoot_cancelled: ({ Property_Name, Client_Name, Shoot_Date, Booking_Page }) =>
    [
      `Shoot Cancelled: ${Property_Name}`,
      "",
      Client_Name
        ? `Hi ${Client_Name}, your shoot on ${Shoot_Date} has been cancelled.`
        : `Your shoot on ${Shoot_Date} has been cancelled.`,
      "",
      Booking_Page ? `You can rebook here: ${Booking_Page}` : null,
      "If you need help, just reply to this message.",
    ].join("\n"),

  single_service_media_ready: ({ Property_Name, Client_Name }) =>
    [
      "Media Ready",
      "",
      Client_Name
        ? `Hi ${Client_Name}, your media for ${Property_Name} is now ready.`
        : `Your media for ${Property_Name} is now ready.`,
      "",
      "You can view and download it from your dashboard.",
    ]
      .filter(Boolean)
      .join("\n"),

  partial_media_upload: ({ Property_Name, Client_Name, Pending_Deliverable }) =>
    [
      "Photos Ready",
      "",
      Client_Name
        ? `Hello ${Client_Name}, The photos for ${Property_Name} are now available.`
        : `The photos for ${Property_Name} are now available.`,
      "You can access them from your dashboard and start listing.",
      "",
      `We’re finalizing your ${Pending_Deliverable || "remaining deliverables"} and will notify you once it’s ready.`,
    ]
      .filter(Boolean)
      .join("\n"),

  full_media_upload: ({ Property_Name, Client_Name }) =>
    [
      Client_Name
        ? `Hi ${Client_Name}, everything for ${Property_Name} is now ready.`
        : `Everything for ${Property_Name} is now ready.`,
      "",
      "All Media Delivered",
      "",
      "You can view and download all files from your dashboard.",
    ]
      .filter(Boolean)
      .join("\n"),
};

const getTwilioAuthHeader = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
  return `Basic ${credentials}`;
};

const appendMessageSender = (payload) => {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (messagingServiceSid) {
    payload.append("MessagingServiceSid", messagingServiceSid);
    return { success: true, viaMessagingService: true };
  }

  if (from) {
    payload.append("From", formatWhatsAppNumber(from));
    return { success: true, viaMessagingService: false };
  }

  console.error("[WHATSAPP] Sender config missing");
  return { success: false, error: "Twilio sender configuration missing" };
};

const formatWhatsAppNumber = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  return `whatsapp:${trimmed}`;
};

const maskPhone = (value) => {
  if (!value) return "";
  const normalized = String(value).replace("whatsapp:", "");
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 4)}***${normalized.slice(-2)}`;
};

const toTwilioContentVariables = (templateName, variables) => {
  const order = TEMPLATE_VARIABLE_ORDER[templateName];
  if (!order) {
    return variables || {};
  }

  const normalized = {};
  order.forEach((key, idx) => {
    const slot = String(idx + 1);
    const value = variables?.[key];
    normalized[slot] = value == null ? "" : String(value);
  });

  return normalized;
};

export async function sendWhatsAppTemplate({ to, templateName, variables }) {
  const authHeader = getTwilioAuthHeader();
  if (!authHeader) {
    console.error("[WHATSAPP] Missing Twilio credentials");
    return { success: false, error: "Twilio credentials missing" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const contentSid = process.env[TEMPLATE_ENV_KEYS[templateName]];
  const toValue = formatWhatsAppNumber(to);

  if (!toValue) {
    console.error("[WHATSAPP] Recipient phone missing", { templateName });
    return { success: false, error: "Recipient phone missing" };
  }

  const body = TEMPLATES_FALLBACK[templateName]
    ? TEMPLATES_FALLBACK[templateName](variables)
    : "";

  const payload = new URLSearchParams();
  payload.append("To", toValue);
  const senderConfig = appendMessageSender(payload);
  if (!senderConfig.success) {
    return senderConfig;
  }

  if (contentSid) {
    const contentVariables = toTwilioContentVariables(templateName, variables);
    payload.append("ContentSid", contentSid);
    payload.append("ContentVariables", JSON.stringify(contentVariables));
  } else if (body) {
    payload.append("Body", body);
  } else {
    console.error("[WHATSAPP] No template configured", { templateName });
    return { success: false, error: "No template content configured" };
  }

  console.log("[WHATSAPP] Sending template", {
    templateName,
    to: maskPhone(toValue),
    viaMessagingService: senderConfig.viaMessagingService,
    hasContentSid: Boolean(contentSid),
  });

  const res = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[WHATSAPP] Send failed", {
      templateName,
      to: maskPhone(toValue),
      status: res.status,
      statusText: res.statusText,
      error: text || "Twilio send failed",
    });
    return { success: false, error: text || "Twilio send failed" };
  }

  const data = await res.json();
  console.log("[WHATSAPP] Send success", {
    templateName,
    to: maskPhone(toValue),
    sid: data?.sid,
    status: data?.status,
  });
  return { success: true, data };
}

export async function sendWhatsAppMessage({ to, body }) {
  const authHeader = getTwilioAuthHeader();
  if (!authHeader) {
    console.error("[WHATSAPP] Missing Twilio credentials");
    return { success: false, error: "Twilio credentials missing" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const toValue = formatWhatsAppNumber(to);
  const messageBody = String(body ?? "").trim();

  if (!toValue) {
    console.error("[WHATSAPP] Recipient phone missing for raw message");
    return { success: false, error: "Recipient phone missing" };
  }

  if (!messageBody) {
    console.error("[WHATSAPP] Message body missing", {
      to: maskPhone(toValue),
    });
    return { success: false, error: "Message body missing" };
  }

  const payload = new URLSearchParams();
  payload.append("To", toValue);
  payload.append("Body", messageBody);
  const senderConfig = appendMessageSender(payload);
  if (!senderConfig.success) {
    return senderConfig;
  }

  console.log("[WHATSAPP] Sending raw message", {
    to: maskPhone(toValue),
    viaMessagingService: senderConfig.viaMessagingService,
  });

  const res = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[WHATSAPP] Raw send failed", {
      to: maskPhone(toValue),
      status: res.status,
      statusText: res.statusText,
      error: text || "Twilio send failed",
    });
    return { success: false, error: text || "Twilio send failed" };
  }

  const data = await res.json();
  console.log("[WHATSAPP] Raw send success", {
    to: maskPhone(toValue),
    sid: data?.sid,
    status: data?.status,
  });
  return { success: true, data };
}
