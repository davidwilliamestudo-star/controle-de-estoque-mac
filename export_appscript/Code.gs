function doPost(e) {
  return Api.handlePost(e);
}

function doGet(e) {
  return Api.handleGet(e);
}

var Api = {
  handlePost: function (e) {
    // --- CORREÇÃO 1: LockService para eliminar race condition de idempotência ---
    // Garante que apenas uma execução por vez processa o doPost, evitando que
    // múltiplas chamadas simultâneas com o mesmo request_id criem duplicatas
    // (ex: eventos duplicados no Calendar ou e-mails duplicados ao paciente).
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000); // aguarda até 30s pelo lock exclusivo
    } catch (lockErr) {
      return Response.error(
        "unknown", "unknown", "LOCK_TIMEOUT",
        "Servidor temporariamente ocupado. Tente novamente em instantes.",
        Utils.nowIso()
      );
    }

    var timestamp = Utils.nowIso();
    var payload = {};
    var requestId = Utilities.getUuid();
    var action = "unknown";

    try {
      payload = this.parseJsonBody(e);
      requestId = payload.request_id || requestId;
      payload.request_id = requestId;
      action = payload.action || "unknown";

      var auth = Auth.validate(e, payload);
      if (!auth.ok) {
        lock.releaseLock();
        return Response.error(requestId, action, "UNAUTHORIZED", "Não autorizado.", timestamp);
      }

      var validation = Validator.validate(payload);
      if (!validation.ok) {
        lock.releaseLock();
        return Response.error(requestId, action, validation.error_code || "INVALID_PAYLOAD", validation.message, timestamp);
      }

      var result = Router.route(payload);

      RequestLogRepository.log({
        request_id: requestId,
        action: action,
        clinic_id: payload.clinic_id || "",
        status: result.duplicate ? "DUPLICATE_SUCCESS" : "SUCCESS",
        entity_type: Router.entityType(action),
        entity_id: Router.entityId(payload),
        response_json: Utils.safeJson(result),
        error_code: "",
        error_message: ""
      });

      lock.releaseLock();
      return Response.success(requestId, action, result, timestamp);
    } catch (err) {
      var safeMessage = err && err.message ? err.message : "Erro interno.";
      ErrorRepository.log({
        request_id: requestId,
        action: action,
        error_code: err.error_code || "INTERNAL_ERROR",
        error_message: safeMessage,
        safe_context_json: ""
      });

      RequestLogRepository.log({
        request_id: requestId,
        action: action,
        clinic_id: payload.clinic_id || "",
        status: "ERROR",
        entity_type: Router.entityType(action),
        entity_id: Router.entityId(payload),
        response_json: "",
        error_code: err.error_code || "INTERNAL_ERROR",
        error_message: safeMessage
      });

      lock.releaseLock();
      return Response.error(requestId, action, err.error_code || "INTERNAL_ERROR", safeMessage, timestamp);
    }
  },

  handleGet: function (e) {
    try {
      var action = e.parameter.action;
      var page = e.parameter.page;

      if (action === "health_check") {
        return Response.rawJson({
          ok: true,
          action: "health_check",
          service: "apps_script",
          version: Config.get().APP_VERSION,
          timestamp: Utils.nowIso()
        });
      }

      if (page === "checkin") {
        var checkinRequestId = e.parameter.checkin_request_id;
        var token = e.parameter.token;
        return CheckinService.renderCheckinForm(checkinRequestId, token);
      }

      return Templates.renderSimplePage(
        "Endpoint inválido",
        "Essa URL não possui uma ação válida.",
        false
      );
    } catch (err) {
      return Templates.renderSimplePage(
        "Erro",
        "Não foi possível carregar esta página.",
        false
      );
    }
  },

  parseJsonBody: function (e) {
    if (!e || !e.postData || !e.postData.contents) {
      throw Utils.appError("INVALID_PAYLOAD", "Corpo da requisição ausente.");
    }

    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw Utils.appError("INVALID_JSON", "JSON inválido.");
    }
  }
};

var Router = {
  route: function (payload) {
    var action = payload.action;

    if (this.isIdempotentAction(action)) {
      var previous = RequestLogRepository.findSuccessfulByRequestId(payload.request_id, action);
      if (previous && previous.response_json) {
        var previousData = JSON.parse(previous.response_json);
        previousData.duplicate = true;
        return previousData;
      }
    }

    switch (action) {
      case "health_check":
        return {
          service: "apps_script",
          version: Config.get().APP_VERSION,
          status: "online"
        };

      case "create_application_appointment":
        return this.createApplicationAppointment(payload);

      case "update_application_appointment":
        return this.updateApplicationAppointment(payload);

      case "cancel_application_appointment":
        return this.cancelApplicationAppointment(payload);

      case "send_checkin_form":
        return CheckinService.sendCheckinForm(payload);

      case "get_checkin_responses":
        return CheckinService.getCheckinResponses(payload);

      case "mark_checkin_synced":
        return CheckinService.markCheckinSynced(payload);

      case "send_test_email":
        return EmailService.sendTestEmail(payload);

      case "get_calendar_event":
        return CalendarService.getCalendarEvent(payload);
        
      case "send_patient_application_report":
        return EmailService.sendPatientReportEmail(payload);

      case "send_generic_email":
        return EmailService.sendGenericEmail(payload);

      case "schedule_appointment_reminder":
        return EmailService.scheduleAppointmentReminder(payload);

      // --- CORREÇÃO 6: Sincronização bidirecional Calendar → App ---
      case "get_modified_calendar_events":
        return CalendarService.getModifiedEvents(payload);

      // --- ASSINATURAS DIGITAIS ICP-BRASIL & GOOGLE DRIVE ---
      case "save_signed_document_to_drive":
      case "saveSignedDocumentToDrive":
        return DriveSignaturesService.saveSignedDocumentToDrive(payload.payload || payload, payload.request_id);

      default:
        throw Utils.appError("INVALID_ACTION", "Ação não suportada: " + action);
    }
  },

  createApplicationAppointment: function (payload) {
    var calendar = CalendarService.createApplicationCalendarEvent(payload);
    var email = payload.features && payload.features.email === false
      ? { sent: false, skipped: true, reason: "email_disabled" }
      : EmailService.sendApplicationAppointmentEmail(payload, calendar);
    var checkin = payload.features && payload.features.checkin === false
      ? { scheduled: false, skipped: true, reason: "checkin_disabled" }
      : CheckinService.scheduleCheckin(payload);
    var reminders = payload.features && payload.features.email === false
      ? { scheduled: false, skipped: true, reason: "email_disabled", items: [] }
      : EmailService.scheduleApplicationAppointmentReminders(payload);

    CalendarEventsRepository.save({
      request_id: payload.request_id,
      clinic_id: payload.clinic_id,
      application_plan_id: payload.application_plan_id,
      appointment_id: payload.appointment_id,
      patient_id: payload.patient.id,
      patient_email: payload.patient.email,
      calendar_event_id: calendar.event_id || "",
      calendar_event_url: calendar.event_url || "",
      scheduled_at: payload.application.scheduled_at,
      status: "ACTIVE"
    });

    return {
      calendar: calendar,
      email: email,
      checkin: checkin,
      reminders: reminders
    };
  },

  updateApplicationAppointment: function (payload) {
    var calendar = CalendarService.updateApplicationCalendarEvent(payload);
    var email = payload.notify_patient === false || (payload.features && payload.features.email === false)
      ? { sent: false }
      : EmailService.sendApplicationUpdateEmail(payload, calendar);

    var checkin = payload.features && payload.features.checkin === false
      ? { rescheduled: false, skipped: true, reason: "checkin_disabled" }
      : CheckinService.rescheduleCheckin(payload);
    var reminders = payload.features && payload.features.email === false
      ? EmailService.cancelApplicationAppointmentReminders(payload)
      : EmailService.rescheduleApplicationAppointmentReminders(payload);

    return {
      calendar: calendar,
      email: email,
      checkin: checkin,
      reminders: reminders
    };
  },

  cancelApplicationAppointment: function (payload) {
    var calendar = CalendarService.cancelApplicationCalendarEvent(payload);
    var email = payload.notify_patient === true && !(payload.features && payload.features.email === false)
      ? EmailService.sendApplicationCancelEmail(payload)
      : { sent: false };

    var checkin = payload.features && payload.features.checkin === false
      ? { cancelled: false, skipped: true, reason: "checkin_disabled" }
      : CheckinService.cancelScheduledCheckin(payload);
    var reminders = EmailService.cancelApplicationAppointmentReminders(payload);

    return {
      calendar: calendar,
      email: email,
      checkin: checkin,
      reminders: reminders
    };
  },

  isIdempotentAction: function (action) {
    // --- CORREÇÃO 2: Proteção de idempotência estendida ---
    // Inclui ações de e-mail e lembretes para evitar duplicação por instabilidade de rede.
    // O LockService (Correção 1) + essa lista garantem que nenhuma ação seja executada
    // duas vezes mesmo com retentativas do frontend.
    return [
      "create_application_appointment",
      "update_application_appointment",
      "cancel_application_appointment",
      "send_checkin_form",
      "mark_checkin_synced",
      "send_patient_application_report",
      "send_generic_email",
      "schedule_appointment_reminder",
      "send_test_email"
    ].indexOf(action) !== -1;
  },

  entityType: function (action) {
    if (!action) return "";
    if (action.indexOf("appointment") !== -1) return "appointment";
    if (action.indexOf("checkin") !== -1) return "checkin";
    if (action.indexOf("calendar") !== -1) return "calendar";
    if (action.indexOf("email") !== -1) return "email";
    if (action.indexOf("report") !== -1) return "report";
    return "integration";
  },

  entityId: function (payload) {
    if (!payload) return "";
    return payload.appointment_id ||
      payload.application_plan_id ||
      payload.checkin_request_id ||
      payload.calendar_event_id ||
      "";
  }
};

var Auth = {
  validate: function (e, payload) {
    var expected = Config.get().APP_API_KEY;

    if (!expected) {
      return { ok: false, message: "APP_API_KEY não configurada." };
    }

    var provided = "";

    if (payload && payload.api_key) {
      provided = payload.api_key;
    } else if (e && e.parameter && e.parameter.api_key) {
      provided = e.parameter.api_key;
    }

    return {
      ok: provided === expected
    };
  }
};

var Validator = {
  validate: function (payload) {
    if (!payload.action) {
      return this.fail("INVALID_ACTION", "Ação não informada.");
    }

    if (!payload.request_id) {
      return this.fail("INVALID_PAYLOAD", "request_id obrigatório.");
    }

    switch (payload.action) {
      case "health_check":
        return this.ok();

      case "create_application_appointment":
        return this.validateCreateAppointment(payload);

      case "update_application_appointment":
        return this.validateUpdateAppointment(payload);

      case "cancel_application_appointment":
        return this.validateCancelAppointment(payload);

      case "send_checkin_form":
        if (!payload.checkin_request_id) return this.fail("INVALID_PAYLOAD", "checkin_request_id obrigatório.");
        return this.ok();

      case "get_checkin_responses":
        return this.ok();

      case "mark_checkin_synced":
        if (!payload.response_ids || !Array.isArray(payload.response_ids)) {
          return this.fail("INVALID_PAYLOAD", "response_ids obrigatório.");
        }
        return this.ok();

      case "send_test_email":
        if (!payload.to && !payload.email) return this.fail("INVALID_PAYLOAD", "to obrigatório.");
        return this.ok();

      case "get_calendar_event":
        if (!payload.calendar_event_id && !payload.event_id) {
          return this.fail("INVALID_PAYLOAD", "calendar_event_id obrigatório.");
        }
        return this.ok();
        
      case "send_patient_application_report":
        if (!payload.patient || !payload.patient.email) return this.fail("INVALID_PAYLOAD", "patient.email obrigatório.");
        if (!payload.email_options || !payload.email_options.html_body) return this.fail("INVALID_PAYLOAD", "email_options.html_body obrigatório.");
        return this.ok();

      case "send_generic_email":
        if (!payload.to) return this.fail("INVALID_PAYLOAD", "to obrigatório.");
        if (!payload.subject) return this.fail("INVALID_PAYLOAD", "subject obrigatório.");
        if (!payload.html_body) return this.fail("INVALID_PAYLOAD", "html_body obrigatório.");
        return this.ok();

      case "schedule_appointment_reminder":
        if (!payload.patient || !payload.patient.email) return this.fail("INVALID_PAYLOAD", "patient.email obrigatório.");
        if (!payload.appointment_id) return this.fail("INVALID_PAYLOAD", "appointment_id obrigatório.");
        if (!payload.scheduled_for) return this.fail("INVALID_PAYLOAD", "scheduled_for obrigatório.");
        return this.ok();

      case "get_modified_calendar_events":
        return this.ok();

      case "save_signed_document_to_drive":
      case "saveSignedDocumentToDrive":
        return this.ok();

      default:
        return this.fail("INVALID_ACTION", "Ação inválida.");
    }
  },

  validateCreateAppointment: function (p) {
    if (!p.clinic_id) return this.fail("INVALID_PAYLOAD", "clinic_id obrigatório.");
    if (!p.application_plan_id) return this.fail("INVALID_PAYLOAD", "application_plan_id obrigatório.");
    if (!p.appointment_id) return this.fail("INVALID_PAYLOAD", "appointment_id obrigatório.");
    if (!p.patient || !p.patient.id) return this.fail("INVALID_PAYLOAD", "patient.id obrigatório.");
    if (!p.patient.name) return this.fail("INVALID_PAYLOAD", "patient.name obrigatório.");
    if (!p.patient.email) return this.fail("PATIENT_EMAIL_REQUIRED", "Paciente sem e-mail cadastrado.");
    if (!p.application) return this.fail("INVALID_PAYLOAD", "application obrigatório.");
    if (!p.application.route_code) return this.fail("INVALID_PAYLOAD", "application.route_code obrigatório.");
    if (!p.application.route_name) return this.fail("INVALID_PAYLOAD", "application.route_name obrigatório.");
    if (!p.application.scheduled_at) return this.fail("INVALID_PAYLOAD", "application.scheduled_at obrigatório.");
    if (!Utils.isValidDate(p.application.scheduled_at)) return this.fail("INVALID_DATE", "Data inválida.");
    return this.ok();
  },

  validateUpdateAppointment: function (p) {
    if (!p.clinic_id) return this.fail("INVALID_PAYLOAD", "clinic_id obrigatório.");
    if (!p.application_plan_id) return this.fail("INVALID_PAYLOAD", "application_plan_id obrigatório.");
    if (!p.appointment_id) return this.fail("INVALID_PAYLOAD", "appointment_id obrigatório.");
    if (!p.calendar_event_id) return this.fail("INVALID_PAYLOAD", "calendar_event_id obrigatório.");
    if (!p.patient || !p.patient.email) return this.fail("PATIENT_EMAIL_REQUIRED", "Paciente sem e-mail cadastrado.");
    if (!p.application || !p.application.scheduled_at) return this.fail("INVALID_PAYLOAD", "application.scheduled_at obrigatório.");
    if (!Utils.isValidDate(p.application.scheduled_at)) return this.fail("INVALID_DATE", "Data inválida.");
    return this.ok();
  },

  validateCancelAppointment: function (p) {
    if (!p.clinic_id) return this.fail("INVALID_PAYLOAD", "clinic_id obrigatório.");
    if (!p.appointment_id) return this.fail("INVALID_PAYLOAD", "appointment_id obrigatório.");
    if (!p.calendar_event_id) return this.fail("INVALID_PAYLOAD", "calendar_event_id obrigatório.");
    return this.ok();
  },

  ok: function () {
    return { ok: true };
  },

  fail: function (errorCode, message) {
    return {
      ok: false,
      error_code: errorCode,
      message: message
    };
  }
};

var Response = {
  success: function (requestId, action, data, timestamp) {
    var response = {
      ok: true,
      request_id: requestId,
      action: action,
      timestamp: timestamp || Utils.nowIso()
    };

    Object.keys(data || {}).forEach(function (key) {
      response[key] = data[key];
    });

    return this.rawJson(response);
  },

  error: function (requestId, action, errorCode, message, timestamp) {
    return this.rawJson({
      ok: false,
      request_id: requestId,
      action: action,
      timestamp: timestamp || Utils.nowIso(),
      error_code: errorCode,
      message: message
    });
  },

  rawJson: function (obj) {
    return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }
};

var Utils = {
  nowIso: function () {
    return new Date().toISOString();
  },

  uuid: function () {
    return Utilities.getUuid();
  },

  appError: function (code, message) {
    var err = new Error(message);
    err.error_code = code;
    return err;
  },

  safeJson: function (obj) {
    return JSON.stringify(obj || {});
  },

  isValidDate: function (value) {
    var d = new Date(value);
    return !isNaN(d.getTime());
  },

  addDays: function (date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  },

  getDurationMinutes: function (payload) {
    return Number(
      payload &&
      payload.application &&
      payload.application.duration_minutes
        ? payload.application.duration_minutes
        : Config.get().DEFAULT_DURATION_MINUTES
    );
  }
};
