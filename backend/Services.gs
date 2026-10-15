var CalendarService = {
  getCalendar: function () {
    var calendarId = Config.get().CALENDAR_ID;

    if (calendarId) {
      var calendar = CalendarApp.getCalendarById(calendarId);
      if (!calendar) {
        throw Utils.appError("CALENDAR_NOT_FOUND", "Calendario nao encontrado. Verifique CALENDAR_ID.");
      }
      return calendar;
    }

    return CalendarApp.getDefaultCalendar();
  },

  getCalendarId: function () {
    return Config.get().CALENDAR_ID || "primary";
  },

  hasAdvancedCalendar: function () {
    return typeof Calendar !== "undefined" && Calendar.Events;
  },

  buildAdvancedEventResource: function (payload, start, end) {
    var guests = [];

    if (Config.get().SEND_CALENDAR_GUEST_INVITE && payload.patient && payload.patient.email) {
      guests.push({ email: payload.patient.email });
    }

    return {
      summary: this.buildCalendarTitle(payload),
      description: this.buildCalendarDescription(payload),
      start: {
        dateTime: start.toISOString(),
        timeZone: Config.get().TIMEZONE
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Config.get().TIMEZONE
      },
      attendees: guests,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "email", minutes: 24 * 60 }
        ]
      },
      colorId: payload.calendar_color_id || "2",
      extendedProperties: {
        private: {
          source: "controle_estoque_dra_ana",
          clinic_id: payload.clinic_id || "",
          appointment_id: payload.appointment_id || "",
          application_plan_id: payload.application_plan_id || "",
          patient_id: payload.patient && payload.patient.id ? payload.patient.id : ""
        }
      }
    };
  },

  createApplicationCalendarEvent: function (payload) {
    if (payload.features && payload.features.calendar === false) {
      return { skipped: true, reason: "calendar_disabled" };
    }

    var start = new Date(payload.application.scheduled_at);
    var duration = Utils.getDurationMinutes(payload);
    var end = new Date(start.getTime() + duration * 60000);

    if (this.hasAdvancedCalendar()) {
      var advancedEvent = Calendar.Events.insert(
        this.buildAdvancedEventResource(payload, start, end),
        this.getCalendarId(),
        { sendUpdates: Config.get().SEND_CALENDAR_GUEST_INVITE ? "all" : "none" }
      );

      return {
        event_id: advancedEvent.id,
        event_url: advancedEvent.htmlLink || "",
        html_link: advancedEvent.htmlLink || "",
        add_to_calendar_url: this.buildGoogleCalendarTemplateUrl(payload, start, end),
        created: true,
        advanced: true,
        start: start.toISOString(),
        end: end.toISOString()
      };
    }

    var calendar = this.getCalendar();
    var options = {
      description: this.buildCalendarDescription(payload)
    };

    if (Config.get().SEND_CALENDAR_GUEST_INVITE && payload.patient.email) {
      options.guests = payload.patient.email;
      options.sendInvites = true;
    }

    var event = calendar.createEvent(
      this.buildCalendarTitle(payload),
      start,
      end,
      options
    );

    return {
      event_id: event.getId(),
      event_url: "",
      add_to_calendar_url: this.buildGoogleCalendarTemplateUrl(payload, start, end),
      created: true,
      advanced: false,
      start: start.toISOString(),
      end: end.toISOString()
    };
  },

  updateApplicationCalendarEvent: function (payload) {
    if (payload.features && payload.features.calendar === false) {
      return { skipped: true, reason: "calendar_disabled", event_id: payload.calendar_event_id };
    }

    var start = new Date(payload.application.scheduled_at);
    var duration = Utils.getDurationMinutes(payload);
    var end = new Date(start.getTime() + duration * 60000);

    if (this.hasAdvancedCalendar()) {
      var updatedEvent = Calendar.Events.patch(
        this.buildAdvancedEventResource(payload, start, end),
        this.getCalendarId(),
        payload.calendar_event_id,
        { sendUpdates: Config.get().SEND_CALENDAR_GUEST_INVITE ? "all" : "none" }
      );

      return {
        event_id: updatedEvent.id,
        event_url: updatedEvent.htmlLink || "",
        html_link: updatedEvent.htmlLink || "",
        add_to_calendar_url: this.buildGoogleCalendarTemplateUrl(payload, start, end),
        updated: true,
        advanced: true,
        start: start.toISOString(),
        end: end.toISOString()
      };
    }

    var calendar = this.getCalendar();
    var event = calendar.getEventById(payload.calendar_event_id);

    if (!event) {
      throw Utils.appError("CALENDAR_EVENT_NOT_FOUND", "Evento nao encontrado no Google Calendar.");
    }

    event.setTitle(this.buildCalendarTitle(payload));
    event.setTime(start, end);
    event.setDescription(this.buildCalendarDescription(payload));

    return {
      event_id: event.getId(),
      event_url: "",
      add_to_calendar_url: this.buildGoogleCalendarTemplateUrl(payload, start, end),
      updated: true,
      advanced: false,
      start: start.toISOString(),
      end: end.toISOString()
    };
  },

  cancelApplicationCalendarEvent: function (payload) {
    if (payload.features && payload.features.calendar === false) {
      return { skipped: true, reason: "calendar_disabled", event_id: payload.calendar_event_id };
    }

    if (this.hasAdvancedCalendar()) {
      Calendar.Events.remove(
        this.getCalendarId(),
        payload.calendar_event_id,
        { sendUpdates: Config.get().SEND_CALENDAR_GUEST_INVITE ? "all" : "none" }
      );

      return {
        event_id: payload.calendar_event_id,
        cancelled: true,
        advanced: true
      };
    }

    var calendar = this.getCalendar();
    var event = calendar.getEventById(payload.calendar_event_id);

    if (event) {
      event.deleteEvent();
    }

    return {
      event_id: payload.calendar_event_id,
      cancelled: true,
      advanced: false
    };
  },

  getCalendarEvent: function (payload) {
    var eventId = payload.calendar_event_id || payload.event_id;

    if (this.hasAdvancedCalendar()) {
      var advancedEvent = Calendar.Events.get(this.getCalendarId(), eventId);
      if (!advancedEvent) {
        throw Utils.appError("CALENDAR_EVENT_NOT_FOUND", "Evento nao encontrado.");
      }

      return {
        calendar: {
          event_id: advancedEvent.id,
          title: advancedEvent.summary,
          status: advancedEvent.status,
          start: advancedEvent.start && (advancedEvent.start.dateTime || advancedEvent.start.date),
          end: advancedEvent.end && (advancedEvent.end.dateTime || advancedEvent.end.date),
          event_url: advancedEvent.htmlLink || "",
          html_link: advancedEvent.htmlLink || "",
          advanced: true
        }
      };
    }

    var calendar = this.getCalendar();
    var event = calendar.getEventById(eventId);

    if (!event) {
      throw Utils.appError("CALENDAR_EVENT_NOT_FOUND", "Evento nao encontrado.");
    }

    return {
      calendar: {
        event_id: event.getId(),
        title: event.getTitle(),
        status: "confirmed",
        start: event.getStartTime().toISOString(),
        end: event.getEndTime().toISOString(),
        event_url: "",
        advanced: false
      }
    };
  },

  // --- CORREÇÃO 6: Sincronização bidirecional Calendar → App ---
  // Retorna eventos do Google Calendar modificados após o timestamp `since`.
  // O frontend usa isso para detectar edições manuais feitas diretamente no Calendar
  // (ex: Dra. Ana altera horário ou cancela evento pelo site do Google Calendar),
  // garantindo que o SQLite local reflita o estado real do Calendar.
  //
  // Requer: Advanced Calendar Service habilitado no Apps Script.
  // Ação: "get_modified_calendar_events" | Parâmetros: { since: "2024-01-01T00:00:00Z" }
  getModifiedEvents: function (payload) {
    if (!this.hasAdvancedCalendar()) {
      throw Utils.appError(
        "ADVANCED_CALENDAR_NOT_ENABLED",
        "Habilite 'Google Calendar API' em Servicos Avancados do Apps Script para usar sincronizacao bidirecional."
      );
    }

    var since = payload.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // default: últimas 24h

    var result = Calendar.Events.list(this.getCalendarId(), {
      updatedMin: since,
      singleEvents: true,
      maxResults: 250,
      showDeleted: true, // inclui eventos cancelados/deletados
      fields: "items(id,summary,status,start,end,updated,extendedProperties)"
    });

    var events = (result.items || [])
      // Filtrar apenas eventos criados pelo nosso sistema
      .filter(function (ev) {
        return ev.extendedProperties &&
          ev.extendedProperties.private &&
          ev.extendedProperties.private.source === "controle_estoque_dra_ana";
      })
      .map(function (ev) {
        var priv = ev.extendedProperties.private || {};
        return {
          calendar_event_id: ev.id,
          appointment_id: priv.appointment_id || "",
          application_plan_id: priv.application_plan_id || "",
          patient_id: priv.patient_id || "",
          status: ev.status, // "confirmed", "cancelled"
          start: ev.start && (ev.start.dateTime || ev.start.date),
          end: ev.end && (ev.end.dateTime || ev.end.date),
          updated: ev.updated,
          title: ev.summary || ""
        };
      });

    return {
      since: since,
      count: events.length,
      events: events
    };
  },

  buildCalendarTitle: function (payload) {
    return "Aplicacao - " +
      payload.patient.name +
      " - " +
      payload.application.route_code;
  },

  buildCalendarDescription: function (payload) {
    var protocolName = payload.application.protocol_name || "Nao informado";

    return [
      "Aplicacao agendada pelo sistema Controle de Estoque - Dra. Ana Morong.",
      "",
      "Paciente: " + payload.patient.name,
      "Via: " + (payload.application.route_name || payload.application.route_code),
      "Protocolo: " + protocolName,
      "ID interno da aplicacao: " + payload.application_plan_id,
      "ID interno do agendamento: " + payload.appointment_id,
      "",
      "Evento criado automaticamente por integracao local."
    ].join("\n");
  },

  buildGoogleCalendarTemplateUrl: function (payload, start, end) {
    var title = this.buildCalendarTitle(payload);
    var description = this.buildCalendarDescription(payload);

    var dates =
      Utilities.formatDate(start, "UTC", "yyyyMMdd'T'HHmmss'Z'") +
      "/" +
      Utilities.formatDate(end, "UTC", "yyyyMMdd'T'HHmmss'Z'");

    var params = {
      action: "TEMPLATE",
      text: title,
      dates: dates,
      details: description,
      ctz: Config.get().TIMEZONE
    };

    var query = Object.keys(params)
      .map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

    return "https://calendar.google.com/calendar/render?" + query;
  }
};

var EmailService = {
  appointmentReminderDefinitions: [
    { type: "7_days_before", amount: 7, unit: "days" },
    { type: "1_day_before", amount: 1, unit: "days" },
    { type: "4_hours_before", amount: 4, unit: "hours" }
  ],

  send: function (to, subject, plainText, htmlBody) {
    try {
      MailApp.sendEmail({
        to: to,
        subject: subject,
        body: plainText,
        htmlBody: htmlBody,
        name: Config.get().EMAIL_FROM_NAME
      });

      return {
        sent: true,
        to: to,
        sent_at: Utils.nowIso()
      };
    } catch (err) {
      throw Utils.appError("EMAIL_SEND_FAILED", "Falha ao enviar e-mail: " + err.message);
    }
  },

  sendApplicationAppointmentEmail: function (payload, calendarResult) {
    var subject = "Confirmação da sua aplicação — " + Config.get().CLINIC_NAME;
    var html = Templates.applicationAppointmentEmail(payload, calendarResult);
    var text = Templates.applicationAppointmentText(payload, calendarResult);
    return this.send(payload.patient.email, subject, text, html);
  },

  sendApplicationUpdateEmail: function (payload, calendarResult) {
    var subject = "Atualização da sua aplicação — " + Config.get().CLINIC_NAME;
    var html = Templates.applicationUpdateEmail(payload, calendarResult);
    var text = "Seu agendamento foi atualizado para " + Templates.formatDateTime(payload.application.scheduled_at) + ".";
    return this.send(payload.patient.email, subject, text, html);
  },

  sendApplicationCancelEmail: function (payload) {
    var subject = "Cancelamento de agendamento — " + Config.get().CLINIC_NAME;
    var html = Templates.applicationCancelEmail(payload);
    var text = "Seu agendamento foi cancelado.";
    return this.send(payload.patient.email, subject, text, html);
  },

  sendCheckinEmail: function (checkin) {
    var subject = "Check-in pós-aplicação — " + Config.get().CLINIC_NAME;
    var html = Templates.checkinEmail(checkin);
    var text = "Olá, responda seu check-in: " + checkin.form_url;
    return this.send(checkin.patient_email, subject, text, html);
  },

  sendTestEmail: function (payload) {
    var to = payload.to || payload.email;
    var subject = "Teste de integração — " + Config.get().CLINIC_NAME;
    var html = Templates.testEmail();
    var result = this.send(to, subject, "Teste de integração realizado com sucesso.", html);

    return {
      email: result
    };
  },

  sendPatientReportEmail: function (payload) {
    var subject = payload.email_options.subject || ("Relatório de Aplicações — " + Config.get().CLINIC_NAME);
    var html = payload.email_options.html_body;
    var text = payload.email_options.text_body || "Acesse seu relatório no formato HTML.";
    var result = this.send(payload.patient.email, subject, text, html);
    return {
      email: result
    };
  },

  sendGenericEmail: function (payload) {
    var result = this.send(payload.to, payload.subject, "Acesse a versão HTML deste email.", payload.html_body);
    return {
      email: result
    };
  },

  scheduleAppointmentReminder: function (payload) {
    ScheduledRemindersRepository.create(payload);
    return {
      scheduled: true,
      scheduled_for: payload.scheduled_for
    };
  },

  scheduleApplicationAppointmentReminders: function (payload) {
    if (payload.features && payload.features.email === false) {
      return {
        scheduled: false,
        skipped: true,
        reason: "email_disabled",
        items: []
      };
    }

    if (!payload.patient || !payload.patient.email) {
      return {
        scheduled: false,
        skipped: true,
        reason: "patient_email_missing",
        items: []
      };
    }

    var scheduledAt = new Date(payload.application.scheduled_at);
    var now = new Date();
    var items = [];

    this.appointmentReminderDefinitions.forEach(function (definition) {
      var reminderDate = EmailService.calculateReminderDate(scheduledAt, definition);

      if (isNaN(reminderDate.getTime()) || reminderDate <= now) {
        return;
      }

      var reminder = {
        request_id: payload.request_id,
        clinic_id: payload.clinic_id,
        patient: payload.patient,
        appointment_id: payload.appointment_id,
        protocol_name: payload.application.protocol_name || "",
        appointment_scheduled_at: payload.application.scheduled_at,
        scheduled_for: reminderDate.toISOString(),
        reminder_type: definition.type
      };

      reminder.html_body = Templates.applicationReminderEmail(reminder);
      ScheduledRemindersRepository.create(reminder);

      items.push({
        reminder_type: definition.type,
        scheduled_for: reminder.scheduled_for
      });
    });

    return {
      scheduled: items.length > 0,
      items: items
    };
  },

  rescheduleApplicationAppointmentReminders: function (payload) {
    var cancelled = ScheduledRemindersRepository.cancelPendingByAppointment(payload.appointment_id);
    var scheduled = this.scheduleApplicationAppointmentReminders(payload);

    return {
      cancelled: cancelled,
      scheduled: scheduled.scheduled,
      items: scheduled.items || [],
      skipped: scheduled.skipped || false,
      reason: scheduled.reason || ""
    };
  },

  cancelApplicationAppointmentReminders: function (payload) {
    var cancelled = ScheduledRemindersRepository.cancelPendingByAppointment(payload.appointment_id);
    return {
      cancelled: cancelled
    };
  },

  sendScheduledAppointmentReminder: function (row) {
    var subject = this.buildAppointmentReminderSubject(row);
    var html = row.html_body || Templates.applicationReminderEmail(row);
    var text = Templates.applicationReminderText(row);
    return this.send(row.patient_email, subject, text, html);
  },

  buildAppointmentReminderSubject: function (row) {
    if (row.reminder_type === "7_days_before") return "Lembrete: sua aplicacao sera em 7 dias - " + Config.get().CLINIC_NAME;
    if (row.reminder_type === "1_day_before") return "Lembrete: sua aplicacao sera amanha - " + Config.get().CLINIC_NAME;
    if (row.reminder_type === "4_hours_before") return "Lembrete: sua aplicacao sera em 4 horas - " + Config.get().CLINIC_NAME;
    return "Lembrete de aplicacao - " + Config.get().CLINIC_NAME;
  },

  calculateReminderDate: function (scheduledAt, definition) {
    var ms = definition.unit === "hours"
      ? definition.amount * 60 * 60 * 1000
      : definition.amount * 24 * 60 * 60 * 1000;
    return new Date(scheduledAt.getTime() - ms);
  }
};

var CheckinService = {
  scheduleCheckin: function (payload) {
    var scheduledAt = new Date(payload.application.scheduled_at);
    var checkinDate = Utils.addDays(scheduledAt, Config.get().CHECKIN_DELAY_DAYS);
    var checkinRequestId = Utilities.getUuid();
    var checkinToken = Utilities.getUuid();

    var formUrl = this.buildCheckinFormUrl(checkinRequestId, checkinToken);

    CheckinRepository.create({
      created_at: Utils.nowIso(),
      checkin_request_id: checkinRequestId,
      checkin_token: checkinToken,
      request_id: payload.request_id,
      clinic_id: payload.clinic_id,
      patient_id: payload.patient.id,
      patient_name: payload.patient.name,
      patient_email: payload.patient.email,
      application_plan_id: payload.application_plan_id,
      procedure_id: payload.procedure_id || "",
      appointment_id: payload.appointment_id,
      scheduled_for: checkinDate.toISOString(),
      sent_at: "",
      response_received_at: "",
      status: "SCHEDULED",
      form_url: formUrl,
      last_error: ""
    });

    return {
      scheduled: true,
      checkin_request_id: checkinRequestId,
      scheduled_for: checkinDate.toISOString(),
      form_url: formUrl
    };
  },

  rescheduleCheckin: function (payload) {
    var row = CheckinRepository.findRequestByAppointment(payload.appointment_id);

    if (!row || row.status === "ANSWERED") {
      return {
        rescheduled: false
      };
    }

    var scheduledAt = new Date(payload.application.scheduled_at);
    var checkinDate = Utils.addDays(scheduledAt, Config.get().CHECKIN_DELAY_DAYS);

    row.scheduled_for = checkinDate.toISOString();
    row.status = "SCHEDULED";
    row.last_error = "";
    CheckinRepository.updateRequest(row);

    return {
      rescheduled: true,
      scheduled_for: checkinDate.toISOString(),
      checkin_request_id: row.checkin_request_id,
      form_url: row.form_url
    };
  },

  cancelScheduledCheckin: function (payload) {
    var row = CheckinRepository.findRequestByAppointment(payload.appointment_id);

    if (!row) {
      return {
        cancelled: false
      };
    }

    if (row.status !== "ANSWERED") {
      row.status = "CANCELLED";
      CheckinRepository.updateRequest(row);
    }

    return {
      cancelled: true,
      checkin_request_id: row.checkin_request_id
    };
  },

  sendCheckinForm: function (payload) {
    var row = CheckinRepository.findRequest(payload.checkin_request_id);

    if (!row) {
      throw Utils.appError("CHECKIN_REQUEST_NOT_FOUND", "Check-in não encontrado.");
    }

    if (row.status === "CANCELLED") {
      throw Utils.appError("CHECKIN_CANCELLED", "Check-in cancelado.");
    }

    var result = EmailService.sendCheckinEmail(row);

    row.status = "SENT";
    row.sent_at = Utils.nowIso();
    row.last_error = "";
    CheckinRepository.updateRequest(row);

    return {
      checkin: {
        sent: true,
        checkin_request_id: row.checkin_request_id,
        sent_at: row.sent_at,
        form_url: row.form_url
      },
      email: result
    };
  },

  // --- CORREÇÃO 5b: runCheckinTrigger otimizado com getObjectsWhere + batch ---
  // Antes: getObjects() carregava TODOS os checkins (histórico de anos).
  // Agora: apenas os SCHEDULED são carregados; as atualizações são gravadas em lote.
  runCheckinTrigger: function () {
    var scheduledRows = SheetsRepository.getObjectsWhere("checkin_requests", { status: "SCHEDULED" });
    var now = new Date();
    var updates = [];

    scheduledRows.forEach(function (row) {
      var scheduledFor = new Date(row.scheduled_for);
      if (isNaN(scheduledFor.getTime()) || scheduledFor > now) return;

      try {
        var result = EmailService.sendCheckinEmail(row);
        row.status = "SENT";
        row.sent_at = result.sent_at;
        row.last_error = "";
      } catch (err) {
        row.status = "FAILED";
        row.last_error = err.message;
      }

      updates.push(row);
    });

    // Batch: grava apenas as linhas que foram efetivamente modificadas
    updates.forEach(function (row) {
      CheckinRepository.updateRequest(row);
    });

    Logger.log("runCheckinTrigger: " + updates.length + " de " + scheduledRows.length + " checkins processados.");
  },

  renderCheckinForm: function (checkinRequestId, token) {
    var row = this.validateCheckinAccess(checkinRequestId, token);

    if (!row.ok) {
      return Templates.renderSimplePage("Link inválido", row.message, false);
    }

    if (row.data.status === "ANSWERED") {
      return Templates.renderSimplePage(
        "Check-in já respondido",
        "Este check-in já foi respondido. Obrigado.",
        true
      );
    }

    return HtmlService
      .createHtmlOutput(Templates.checkinForm(row.data))
      .setTitle("Check-in pós-aplicação")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  },

  validateCheckinAccess: function (checkinRequestId, token) {
    if (!checkinRequestId || !token) {
      return {
        ok: false,
        message: "Link incompleto."
      };
    }

    var row = CheckinRepository.findRequest(checkinRequestId);

    if (!row) {
      return {
        ok: false,
        message: "Check-in não encontrado."
      };
    }

    if (row.checkin_token !== token) {
      return {
        ok: false,
        message: "Token inválido."
      };
    }

    if (row.status === "CANCELLED") {
      return {
        ok: false,
        message: "Este check-in foi cancelado."
      };
    }

    return {
      ok: true,
      data: row
    };
  },

  submitCheckinForm: function (checkinRequestId, token, answers) {
    var access = this.validateCheckinAccess(checkinRequestId, token);

    if (!access.ok) {
      throw new Error(access.message);
    }

    var row = access.data;

    if (row.status === "ANSWERED") {
      return {
        ok: true,
        already_answered: true
      };
    }

    var responseId = Utilities.getUuid();

    CheckinRepository.saveResponse({
      submitted_at: Utils.nowIso(),
      response_id: responseId,
      checkin_request_id: row.checkin_request_id,
      clinic_id: row.clinic_id,
      patient_id: row.patient_id,
      patient_email: row.patient_email,
      application_plan_id: row.application_plan_id,
      procedure_id: row.procedure_id,
      appointment_id: row.appointment_id,
      feeling: answers.feeling || "",
      had_intercurrence: answers.had_intercurrence || "",
      local_discomfort: answers.local_discomfort || "",
      unexpected_symptoms: answers.unexpected_symptoms || "",
      wants_contact: answers.wants_contact || "",
      notes: answers.notes || "",
      synced: "FALSE"
    });

    row.status = "ANSWERED";
    row.response_received_at = Utils.nowIso();
    CheckinRepository.updateRequest(row);

    return {
      ok: true,
      response_id: responseId
    };
  },

  getCheckinResponses: function (payload) {
    var filters = payload.filters || {};
    var responses = CheckinRepository.listResponses(filters);

    return {
      responses: responses.map(function (r) {
        delete r._rowNumber;
        return r;
      })
    };
  },

  markCheckinSynced: function (payload) {
    var count = CheckinRepository.markResponsesSynced(payload.response_ids || []);

    return {
      updated_count: count
    };
  },

  buildCheckinFormUrl: function (checkinRequestId, token) {
    var base = ScriptApp.getService().getUrl();
    return base +
      "?page=checkin&checkin_request_id=" +
      encodeURIComponent(checkinRequestId) +
      "&token=" +
      encodeURIComponent(token);
  }
};

function submitCheckinForm(checkinRequestId, token, answers) {
  return CheckinService.submitCheckinForm(checkinRequestId, token, answers);
}

var DriveSignaturesService = {
  DRIVE_TREE_CONFIG: {
    ROOT_FOLDER: 'Dra Ana Morong',
    RECORDS_FOLDER: 'Prontuários',
    SIGNED_DOCS_SUBFOLDER: 'Documentos Assinados'
  },

  getOrCreateFolder: function (parentFolder, folderName) {
    var iterator = parentFolder.getFoldersByName(folderName);
    if (iterator.hasNext()) {
      return iterator.next();
    }
    return parentFolder.createFolder(folderName);
  },

  ensurePatientSignedDocsFolder: function (patientCpf, patientName) {
    var cleanCpf = String(patientCpf || '00000000000').replace(/\D/g, '');
    var cleanName = String(patientName || 'Paciente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    var patientFolderName = cleanCpf + '_' + cleanName;

    var rootFolder = this.getOrCreateFolder(DriveApp.getRootFolder(), this.DRIVE_TREE_CONFIG.ROOT_FOLDER);
    var prontuariosFolder = this.getOrCreateFolder(rootFolder, this.DRIVE_TREE_CONFIG.RECORDS_FOLDER);
    var patientFolder = this.getOrCreateFolder(prontuariosFolder, patientFolderName);
    var signedDocsFolder = this.getOrCreateFolder(patientFolder, this.DRIVE_TREE_CONFIG.SIGNED_DOCS_SUBFOLDER);

    return {
      patientFolder: patientFolder,
      signedDocsFolder: signedDocsFolder
    };
  },

  saveSignedDocumentToDrive: function (payload, requestId) {
    requestId = requestId || payload.request_id || Utilities.getUuid();

    // 1. Checa idempotência
    var existing = SignaturesLogRepository.findByRequestId(requestId);
    if (existing) {
      return existing;
    }

    // 2. Garante estrutura de pastas
    var folders = this.ensurePatientSignedDocsFolder(payload.patient_cpf, payload.patient_name);

    // 3. Define nome padronizado
    var dateStr = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
    var safeCode = String(payload.verification_code || payload.document_id || 'DOC').replace(/[^a-zA-Z0-9-]/g, '');
    var fileName = 'ASSINADO_' + dateStr + '_' + safeCode + '.pdf';

    // 4. Converte Base64 ou URL para Blob
    var pdfBlob;
    if (payload.signed_pdf_base64) {
      var cleanBase64 = String(payload.signed_pdf_base64).replace(/^data:application\/pdf;base64,/, '');
      var decodedBytes = Utilities.base64Decode(cleanBase64);
      pdfBlob = Utilities.newBlob(decodedBytes, 'application/pdf', fileName);
    } else if (payload.signed_file_url) {
      var response = UrlFetchApp.fetch(payload.signed_file_url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        throw Utils.appError('DOWNLOAD_FAILED', 'Falha ao baixar PDF assinado: HTTP ' + response.getResponseCode());
      }
      pdfBlob = response.getBlob().setName(fileName).setContentType('application/pdf');
    } else {
      throw Utils.appError('INVALID_PAYLOAD', 'Payload sem signed_pdf_base64 ou signed_file_url.');
    }

    // 5. Salva no Google Drive
    var driveFile = folders.signedDocsFolder.createFile(pdfBlob);
    driveFile.setDescription(
      'Documento: ' + (payload.document_title || '') +
      ' | Paciente: ' + (payload.patient_name || '') + ' (' + (payload.patient_cpf || '') + ')' +
      ' | SHA-256: ' + (payload.signed_sha256 || '')
    );

    var fileId = driveFile.getId();
    var fileUrl = driveFile.getUrl();
    var folderUrl = folders.signedDocsFolder.getUrl();

    // 6. Envio de e-mail ao paciente com cópia assinada
    var emailStatus = 'SEM_EMAIL';
    if (payload.patient_email && String(payload.patient_email).indexOf('@') !== -1) {
      try {
        this.sendPatientSignedPdfEmail({
          toEmail: payload.patient_email,
          patientName: payload.patient_name,
          documentTitle: payload.document_title,
          verificationCode: payload.verification_code,
          signedSha256: payload.signed_sha256,
          completedAtBrt: payload.completed_at_brt,
          pdfBlob: pdfBlob
        });
        emailStatus = 'ENVIADO';
      } catch (mailError) {
        emailStatus = 'ERRO: ' + (mailError && mailError.message ? mailError.message : String(mailError));
      }
    }

    // 7. Registra na planilha
    SignaturesLogRepository.log({
      requestId: requestId,
      documentId: payload.document_id,
      verificationCode: payload.verification_code,
      completedAtBrt: payload.completed_at_brt || Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
      patientName: payload.patient_name,
      patientCpf: payload.patient_cpf,
      patientEmail: payload.patient_email || '',
      documentTitle: payload.document_title,
      category: payload.category || 'TCLE',
      originalSha256: payload.original_sha256 || '',
      signedSha256: payload.signed_sha256 || '',
      fileId: fileId,
      fileUrl: fileUrl,
      folderUrl: folderUrl,
      emailStatus: emailStatus
    });

    return {
      file_id: fileId,
      file_url: fileUrl,
      folder_url: folderUrl,
      email_status: emailStatus
    };
  },

  sendPatientSignedPdfEmail: function (params) {
    var subject = 'Cópia de Documento Assinado: ' + (params.documentTitle || '') + ' — Dra. Ana Morong';
    var htmlBody = [
      '<div style="font-family: \'Segoe UI\', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">',
      '  <div style="background-color: #0f172a; padding: 22px 24px; color: #ffffff;">',
      '    <h2 style="margin: 0; font-size: 18px;">Clínica Dra. Ana Morong</h2>',
      '    <p style="margin: 4px 0 0; font-size: 12px; color: #34d399;">Certificação de Assinatura Eletrônica ICP-Brasil / Lei 14.063/2020</p>',
      '  </div>',
      '  <div style="padding: 24px;">',
      '    <p>Olá, <strong>' + (params.patientName || '') + '</strong>,</p>',
      '    <p>O documento <strong>' + (params.documentTitle || '') + '</strong> teve sua coleta de assinaturas concluída com sucesso em <strong>' + (params.completedAtBrt || '') + '</strong>.</p>',
      '    <p>Uma via original em formato PDF selada com o Manifesto de Auditoria e QR Code de verificação segue em anexo neste e-mail para seu arquivo pessoal.</p>',
      '    <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; font-size: 12px;">',
      '      <p style="margin: 0 0 6px;"><strong>Código Verificador:</strong> ' + (params.verificationCode || '') + '</p>',
      '      <p style="margin: 0; word-break: break-all;"><strong>Hash SHA-256 Final:</strong> ' + (params.signedSha256 || '') + '</p>',
      '    </div>',
      '    <p style="font-size: 11px; color: #64748b;">Documento assinado eletronicamente nos termos da Lei nº 14.063/2020 e MP nº 2.200-2/2001.</p>',
      '  </div>',
      '</div>'
    ].join('\n');

    MailApp.sendEmail({
      to: params.toEmail,
      subject: subject,
      body: 'Segue em anexo seu documento assinado.',
      name: 'Clínica Dra. Ana Morong',
      htmlBody: htmlBody,
      attachments: [params.pdfBlob]
    });
  }
};
