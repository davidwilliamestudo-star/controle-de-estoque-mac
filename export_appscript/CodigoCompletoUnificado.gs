// ==========================================
// ARQUIVO: Config.gs
// ==========================================

var Config = {
  get: function () {
    var props = PropertiesService.getScriptProperties();

    return {
      APP_API_KEY: props.getProperty("APP_API_KEY") || "",
      CLINIC_NAME: props.getProperty("CLINIC_NAME") || "Clinica Dra. Ana Morong",
      CLINIC_EMAIL: props.getProperty("CLINIC_EMAIL") || "",
      CLINIC_PHONE: props.getProperty("CLINIC_PHONE") || "",
      CLINIC_ADDRESS: props.getProperty("CLINIC_ADDRESS") || "",
      CALENDAR_ID: props.getProperty("CALENDAR_ID") || "",
      SPREADSHEET_ID: props.getProperty("SPREADSHEET_ID") || "",
      TIMEZONE: props.getProperty("TIMEZONE") || "America/Sao_Paulo",
      DEFAULT_DURATION_MINUTES: Number(props.getProperty("DEFAULT_DURATION_MINUTES") || "60"),
      CHECKIN_DELAY_DAYS: Number(props.getProperty("CHECKIN_DELAY_DAYS") || "3"),
      APP_VERSION: props.getProperty("APP_VERSION") || "1.0.0",
      EMAIL_FROM_NAME: props.getProperty("EMAIL_FROM_NAME") || "Equipe Dra. Ana Morong",
      SEND_CALENDAR_GUEST_INVITE: props.getProperty("SEND_CALENDAR_GUEST_INVITE") === "true"
    };
  },

  setupInitialProperties: function () {
    var props = PropertiesService.getScriptProperties();
    var current = props.getProperties();

    var defaults = {
      CLINIC_NAME: current.CLINIC_NAME || "Clinica Dra. Ana Morong",
      TIMEZONE: current.TIMEZONE || "America/Sao_Paulo",
      DEFAULT_DURATION_MINUTES: current.DEFAULT_DURATION_MINUTES || "60",
      CHECKIN_DELAY_DAYS: current.CHECKIN_DELAY_DAYS || "3",
      APP_VERSION: current.APP_VERSION || "1.0.0",
      EMAIL_FROM_NAME: current.EMAIL_FROM_NAME || "Equipe Dra. Ana Morong",
      SEND_CALENDAR_GUEST_INVITE: current.SEND_CALENDAR_GUEST_INVITE || "false"
    };

    if (!current.APP_API_KEY) {
      defaults.APP_API_KEY = "dra-ana-morong";
    }

    if (!current.SPREADSHEET_ID) {
      try {
        var ss = SpreadsheetApp.create("Banco de Dados - Clinica Dra Ana Morong");
        defaults.SPREADSHEET_ID = ss.getId();
        Logger.log("Nova planilha criada automaticamente com sucesso!");
        Logger.log("URL da Planilha: " + ss.getUrl());
        Logger.log("ID da Planilha: " + ss.getId());
      } catch (e) {
        Logger.log("Aviso ao criar planilha automaticamente: " + e.message);
      }
    }

    props.setProperties(defaults, false);
  },

  assertSpreadsheetConfigured: function () {
    var id = this.get().SPREADSHEET_ID;
    if (!id) {
      var ss = SpreadsheetApp.create("Banco de Dados - Clinica Dra Ana Morong");
      var newId = ss.getId();
      PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", newId);
      Logger.log("Planilha criada automaticamente no assert: " + ss.getUrl());
      return newId;
    }
    return id;
  }
};

function setupInitialProperties() {
  Config.setupInitialProperties();
}

function setupAll() {
  Config.setupInitialProperties();
  SheetsRepository.setup();
  TriggerService.installCheckinTrigger();
  TriggerService.installAppointmentReminderTrigger();
  Logger.log("Setup concluido. Verifique as Script Properties e a planilha.");
}

var TriggerService = {
  installCheckinTrigger: function () {
    this.deleteCheckinTriggers();

    ScriptApp.newTrigger("runCheckinTrigger")
      .timeBased()
      .everyHours(1)
      .create();

    Logger.log("Trigger de check-in instalado para rodar a cada 1 hora.");
  },

  installAppointmentReminderTrigger: function () {
    deleteAppointmentReminderTriggers();

    ScriptApp.newTrigger("processScheduledReminders")
      .timeBased()
      .everyMinutes(15)
      .create();

    Logger.log("Trigger de lembretes de aplicacao instalado para rodar a cada 15 minutos.");
  },

  deleteCheckinTriggers: function () {
    var triggers = ScriptApp.getProjectTriggers();

    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "runCheckinTrigger") {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  }
};

function installCheckinTrigger() {
  TriggerService.installCheckinTrigger();
}

function deleteCheckinTriggers() {
  TriggerService.deleteCheckinTriggers();
}

function installAppointmentReminderTrigger() {
  TriggerService.installAppointmentReminderTrigger();
}

function deleteAppointmentRemindersTrigger() {
  deleteAppointmentReminderTriggers();
}

function runCheckinTrigger() {
  CheckinService.runCheckinTrigger();
}


// ==========================================
// ARQUIVO: Storage.gs
// ==========================================

var SHEET_HEADERS = {
  request_logs: [
    "timestamp",
    "request_id",
    "action",
    "clinic_id",
    "status",
    "entity_type",
    "entity_id",
    "response_json",
    "error_code",
    "error_message"
  ],

  scheduled_reminders: [
    "created_at",
    "request_id",
    "clinic_id",
    "patient_id",
    "patient_email",
    "patient_name",
    "appointment_id",
    "protocol_name",
    "scheduled_for",
    "reminder_type",
    "status",
    "sent_at",
    "html_body"
  ],

  calendar_events: [
    "timestamp",
    "request_id",
    "clinic_id",
    "application_plan_id",
    "appointment_id",
    "patient_id",
    "patient_email",
    "calendar_event_id",
    "calendar_event_url",
    "scheduled_at",
    "status"
  ],

  checkin_requests: [
    "created_at",
    "checkin_request_id",
    "checkin_token",
    "request_id",
    "clinic_id",
    "patient_id",
    "patient_name",
    "patient_email",
    "application_plan_id",
    "procedure_id",
    "appointment_id",
    "scheduled_for",
    "sent_at",
    "response_received_at",
    "status",
    "form_url",
    "last_error"
  ],

  checkin_responses: [
    "submitted_at",
    "response_id",
    "checkin_request_id",
    "clinic_id",
    "patient_id",
    "patient_email",
    "application_plan_id",
    "procedure_id",
    "appointment_id",
    "feeling",
    "had_intercurrence",
    "local_discomfort",
    "unexpected_symptoms",
    "wants_contact",
    "notes",
    "synced"
  ],

  errors: [
    "timestamp",
    "request_id",
    "action",
    "error_code",
    "error_message",
    "safe_context_json"
  ],

  signatures_log: [
    "timestamp",
    "request_id",
    "document_id",
    "verification_code",
    "completed_at_brt",
    "patient_name",
    "patient_cpf",
    "patient_email",
    "document_title",
    "category",
    "original_sha256",
    "signed_sha256",
    "drive_file_id",
    "drive_file_url",
    "drive_folder_url",
    "email_status"
  ]
};

var SheetsRepository = {
  setup: function () {
    Config.assertSpreadsheetConfigured();

    Object.keys(SHEET_HEADERS).forEach(function (sheetName) {
      var sheet = SheetsRepository.getSheet(sheetName);
      var headers = SHEET_HEADERS[sheetName];

      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      } else {
        var currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
        if (!currentHeaders || currentHeaders[0] === "") {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.setFrozenRows(1);
        }
      }
    });
  },

  getSpreadsheet: function () {
    Config.assertSpreadsheetConfigured();
    return SpreadsheetApp.openById(Config.get().SPREADSHEET_ID);
  },

  getSheet: function (sheetName) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = SHEET_HEADERS[sheetName];
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      }
    }

    return sheet;
  },

  appendObject: function (sheetName, obj) {
    var headers = SHEET_HEADERS[sheetName];
    var row = headers.map(function (h) {
      return obj[h] !== undefined && obj[h] !== null ? obj[h] : "";
    });

    this.getSheet(sheetName).appendRow(row);
  },

  getObjects: function (sheetName) {
    var sheet = this.getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 1) return [];

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var objects = [];

    for (var i = 1; i < values.length; i++) {
      var obj = {
        _rowNumber: i + 1
      };

      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[i][j];
      }

      objects.push(obj);
    }

    return objects;
  },

  // --- CORREÇÃO 5: Filtro eficiente sem criar objetos para todas as linhas ---
  // Ao contrário de getObjects() que materializa toda a planilha em memória,
  // getObjectsWhere() cria objetos apenas para as linhas que correspondem ao filtro.
  // Para planilhas com 1000+ registros históricos, reduz drasticamente a RAM usada
  // e o tempo de execução do trigger (de ~30s para ~2s com 2000 linhas).
  //
  // Suporta múltiplos filtros: { status: "SCHEDULED", clinic_id: "ana-morong" }
  getObjectsWhere: function (sheetName, filters) {
    var sheet = this.getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 1) return [];

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];

    // Mapear nome de coluna → índice para lookup O(1) por filtro
    var headerIndex = {};
    for (var h = 0; h < headers.length; h++) {
      headerIndex[headers[h]] = h;
    }

    // Validar que todas as colunas de filtro existem
    var filterKeys = Object.keys(filters);
    for (var k = 0; k < filterKeys.length; k++) {
      if (headerIndex[filterKeys[k]] === undefined) {
        Logger.log("getObjectsWhere: coluna '" + filterKeys[k] + "' nao encontrada em '" + sheetName + "'.");
        return [];
      }
    }

    var objects = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];

      // Verificar todos os filtros antes de criar o objeto
      var match = true;
      for (var fk = 0; fk < filterKeys.length; fk++) {
        var col = filterKeys[fk];
        if (String(row[headerIndex[col]]) !== String(filters[col])) {
          match = false;
          break;
        }
      }

      if (!match) continue;

      var obj = { _rowNumber: i + 1 };
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      objects.push(obj);
    }

    return objects;
  },


  updateObjectByRowNumber: function (sheetName, rowNumber, obj) {
    var headers = SHEET_HEADERS[sheetName];
    var row = headers.map(function (h) {
      return obj[h] !== undefined && obj[h] !== null ? obj[h] : "";
    });

    this.getSheet(sheetName).getRange(rowNumber, 1, 1, row.length).setValues([row]);
  }
};

function setupSpreadsheet() {
  SheetsRepository.setup();
}

var RequestLogRepository = {
  log: function (data) {
    try {
      SheetsRepository.appendObject("request_logs", {
        timestamp: Utils.nowIso(),
        request_id: data.request_id || "",
        action: data.action || "",
        clinic_id: data.clinic_id || "",
        status: data.status || "",
        entity_type: data.entity_type || "",
        entity_id: data.entity_id || "",
        response_json: data.response_json || "",
        error_code: data.error_code || "",
        error_message: data.error_message || ""
      });
    } catch (err) {
      Logger.log("Erro ao salvar request_logs: " + err.message);
    }
  },

  findSuccessfulByRequestId: function (requestId, action) {
    if (!requestId) return null;

    var logs = SheetsRepository.getObjects("request_logs");

    for (var i = logs.length - 1; i >= 0; i--) {
      if (
        logs[i].request_id === requestId &&
        logs[i].action === action &&
        String(logs[i].status).indexOf("SUCCESS") !== -1
      ) {
        return logs[i];
      }
    }

    return null;
  }
};

var ErrorRepository = {
  log: function (data) {
    try {
      SheetsRepository.appendObject("errors", {
        timestamp: Utils.nowIso(),
        request_id: data.request_id || "",
        action: data.action || "",
        error_code: data.error_code || "",
        error_message: data.error_message || "",
        safe_context_json: data.safe_context_json || ""
      });
    } catch (err) {
      Logger.log("Erro ao salvar errors: " + err.message);
    }
  }
};

var ScheduledRemindersRepository = {
  create: function (data) {
    var patient = data.patient || {};
    SheetsRepository.appendObject("scheduled_reminders", {
      created_at: Utils.nowIso(),
      request_id: data.request_id || "",
      clinic_id: data.clinic_id || "",
      patient_id: data.patient_id || patient.id || "",
      patient_email: data.patient_email || patient.email || "",
      patient_name: data.patient_name || patient.name || "",
      appointment_id: data.appointment_id || "",
      protocol_name: data.protocol_name || "",
      scheduled_for: data.scheduled_for || "",
      reminder_type: data.reminder_type || "3_days_before",
      status: "PENDING",
      sent_at: "",
      html_body: data.html_body || ""
    });
  },

  findPending: function () {
    var rows = SheetsRepository.getObjects("scheduled_reminders");
    return rows.filter(function (r) {
      return r.status === "PENDING";
    });
  },

  markAsSent: function (row, sentAt) {
    row.status = "SENT";
    row.sent_at = sentAt || Utils.nowIso();
    SheetsRepository.updateObjectByRowNumber("scheduled_reminders", row._rowNumber, row);
  },

  cancelPendingByAppointment: function (appointmentId) {
    if (!appointmentId) return 0;

    var rows = SheetsRepository.getObjects("scheduled_reminders");
    var count = 0;

    rows.forEach(function (row) {
      if (row.appointment_id === appointmentId && row.status === "PENDING") {
        row.status = "CANCELLED";
        SheetsRepository.updateObjectByRowNumber("scheduled_reminders", row._rowNumber, row);
        count++;
      }
    });

    return count;
  }
};

var CalendarEventsRepository = {
  save: function (data) {
    SheetsRepository.appendObject("calendar_events", {
      timestamp: Utils.nowIso(),
      request_id: data.request_id || "",
      clinic_id: data.clinic_id || "",
      application_plan_id: data.application_plan_id || "",
      appointment_id: data.appointment_id || "",
      patient_id: data.patient_id || "",
      patient_email: data.patient_email || "",
      calendar_event_id: data.calendar_event_id || "",
      calendar_event_url: data.calendar_event_url || "",
      scheduled_at: data.scheduled_at || "",
      status: data.status || ""
    });
  }
};

var CheckinRepository = {
  create: function (data) {
    SheetsRepository.appendObject("checkin_requests", data);
  },

  findRequest: function (checkinRequestId) {
    var rows = SheetsRepository.getObjects("checkin_requests");

    for (var i = 0; i < rows.length; i++) {
      if (rows[i].checkin_request_id === checkinRequestId) {
        return rows[i];
      }
    }

    return null;
  },

  findRequestByAppointment: function (appointmentId) {
    var rows = SheetsRepository.getObjects("checkin_requests");

    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].appointment_id === appointmentId) {
        return rows[i];
      }
    }

    return null;
  },

  updateRequest: function (row) {
    SheetsRepository.updateObjectByRowNumber("checkin_requests", row._rowNumber, row);
  },

  saveResponse: function (data) {
    SheetsRepository.appendObject("checkin_responses", data);
  },

  listResponses: function (filters) {
    var rows = SheetsRepository.getObjects("checkin_responses");
    filters = filters || {};

    return rows.filter(function (r) {
      if (filters.only_unsynced && String(r.synced).toUpperCase() === "TRUE") return false;
      if (filters.patient_id && r.patient_id !== filters.patient_id) return false;
      if (filters.application_plan_id && r.application_plan_id !== filters.application_plan_id) return false;
      if (filters.procedure_id && r.procedure_id !== filters.procedure_id) return false;
      return true;
    });
  },

  markResponsesSynced: function (responseIds) {
    var rows = SheetsRepository.getObjects("checkin_responses");
    var count = 0;

    rows.forEach(function (r) {
      if (responseIds.indexOf(r.response_id) !== -1) {
        r.synced = "TRUE";
        SheetsRepository.updateObjectByRowNumber("checkin_responses", r._rowNumber, r);
        count++;
      }
    });

    return count;
  }
};

var SignaturesLogRepository = {
  log: function (entry) {
    SheetsRepository.appendObject("signatures_log", {
      timestamp: Utils.nowIso(),
      request_id: entry.requestId || entry.request_id || Utilities.getUuid(),
      document_id: entry.documentId || entry.document_id || "",
      verification_code: entry.verificationCode || entry.verification_code || "",
      completed_at_brt: entry.completedAtBrt || entry.completed_at_brt || "",
      patient_name: entry.patientName || entry.patient_name || "",
      patient_cpf: entry.patientCpf || entry.patient_cpf || "",
      patient_email: entry.patientEmail || entry.patient_email || "",
      document_title: entry.documentTitle || entry.document_title || "",
      category: entry.category || "TCLE",
      original_sha256: entry.originalSha256 || entry.original_sha256 || "",
      signed_sha256: entry.signedSha256 || entry.signed_sha256 || "",
      drive_file_id: entry.fileId || entry.drive_file_id || "",
      drive_file_url: entry.fileUrl || entry.drive_file_url || "",
      drive_folder_url: entry.folderUrl || entry.drive_folder_url || "",
      email_status: entry.emailStatus || entry.email_status || "PENDENTE"
    });
  },

  findByRequestId: function (requestId) {
    if (!requestId) return null;
    var rows = SheetsRepository.getObjects("signatures_log");
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].request_id === requestId) {
        return {
          file_id: rows[i].drive_file_id,
          file_url: rows[i].drive_file_url,
          folder_url: rows[i].drive_folder_url,
          email_status: rows[i].email_status
        };
      }
    }
    return null;
  }
};


// ==========================================
// ARQUIVO: Templates.gs
// ==========================================

var Templates = {
  escape: function (value) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  formatDate: function (iso) {
    if (!iso) return "";
    return Utilities.formatDate(new Date(iso), Config.get().TIMEZONE, "dd/MM/yyyy");
  },

  formatTime: function (iso) {
    if (!iso) return "";
    return Utilities.formatDate(new Date(iso), Config.get().TIMEZONE, "HH:mm");
  },

  formatDateTime: function (iso) {
    if (!iso) return "";
    return Utilities.formatDate(new Date(iso), Config.get().TIMEZONE, "dd/MM/yyyy 'às' HH:mm");
  },

  baseEmail: function (content) {
    var clinic = Config.get();

    return '' +
      '<div style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,Helvetica,sans-serif;color:#111827;">' +
        '<div style="max-width:640px;margin:0 auto;padding:28px 16px;">' +
          '<div style="background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 12px 30px rgba(0,0,0,0.06);">' +
            '<div style="background:linear-gradient(135deg,#1A5347,#256b5d);padding:26px 30px;color:#FFFFFF;">' +
              '<div style="font-size:18px;font-weight:700;">' + this.escape(clinic.CLINIC_NAME) + '</div>' +
              '<div style="font-size:13px;opacity:.85;margin-top:4px;">Atendimento e acompanhamento</div>' +
            '</div>' +
            '<div style="padding:30px;">' +
              content +
            '</div>' +
          '</div>' +
          '<div style="font-size:12px;line-height:1.5;color:#6B7280;text-align:center;margin-top:18px;">' +
            'Este é um e-mail automático. Em caso de dúvida, entre em contato com a clínica pelos canais oficiais.<br>' +
            this.escape(clinic.CLINIC_NAME) +
          '</div>' +
        '</div>' +
      '</div>';
  },

  button: function (href, label, color) {
    return '' +
      '<div style="text-align:center;margin:28px 0;">' +
        '<a href="' + this.escape(href) + '" style="display:inline-block;background:' + (color || "#1A5347") + ';color:#FFFFFF;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700;font-size:14px;">' +
          this.escape(label) +
        '</a>' +
      '</div>';
  },

  applicationAppointmentEmail: function (payload, calendar) {
    var protocol = payload.application.protocol_name || "Não informado";
    var route = payload.application.route_name || payload.application.route_code;

    var content = '' +
      '<h1 style="margin:0 0 12px;font-size:24px;color:#1A5347;">Aplicação agendada</h1>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Olá, <strong>' + this.escape(payload.patient.name) + '</strong>.</p>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Sua aplicação foi agendada com sucesso.</p>' +

      '<div style="background:#FAFAFA;border:1px solid #E5E7EB;border-radius:14px;padding:18px;margin:22px 0;">' +
        '<div style="margin-bottom:8px;"><strong>Data:</strong> ' + this.formatDate(payload.application.scheduled_at) + '</div>' +
        '<div style="margin-bottom:8px;"><strong>Horário:</strong> ' + this.formatTime(payload.application.scheduled_at) + '</div>' +
        '<div style="margin-bottom:8px;"><strong>Via:</strong> ' + this.escape(route) + '</div>' +
        '<div><strong>Protocolo:</strong> ' + this.escape(protocol) + '</div>' +
      '</div>' +

      '<p style="font-size:14px;line-height:1.7;color:#6B7280;">Você receberá um check-in automático após alguns dias para informar como está se sentindo.</p>';

    if (calendar && calendar.add_to_calendar_url) {
      content += this.button(calendar.add_to_calendar_url, "Adicionar à minha agenda", "#1A5347");
    }

    return this.baseEmail(content);
  },

  applicationAppointmentText: function (payload, calendar) {
    return [
      "Olá, " + payload.patient.name + ".",
      "",
      "Sua aplicação foi agendada.",
      "Data: " + this.formatDate(payload.application.scheduled_at),
      "Horário: " + this.formatTime(payload.application.scheduled_at),
      "Via: " + (payload.application.route_name || payload.application.route_code),
      "Protocolo: " + (payload.application.protocol_name || "Não informado"),
      "",
      calendar && calendar.add_to_calendar_url ? "Adicionar à agenda: " + calendar.add_to_calendar_url : "",
      "",
      Config.get().CLINIC_NAME
    ].join("\n");
  },

  applicationUpdateEmail: function (payload, calendar) {
    var content = '' +
      '<h1 style="margin:0 0 12px;font-size:24px;color:#1A5347;">Agendamento atualizado</h1>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Olá, <strong>' + this.escape(payload.patient.name) + '</strong>.</p>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Seu agendamento foi atualizado.</p>' +
      '<div style="background:#FAFAFA;border:1px solid #E5E7EB;border-radius:14px;padding:18px;margin:22px 0;">' +
        '<div><strong>Novo horário:</strong> ' + this.formatDateTime(payload.application.scheduled_at) + '</div>' +
      '</div>';

    if (calendar && calendar.add_to_calendar_url) {
      content += this.button(calendar.add_to_calendar_url, "Adicionar nova data à agenda", "#1A5347");
    }

    return this.baseEmail(content);
  },

  applicationCancelEmail: function (payload) {
    var content = '' +
      '<h1 style="margin:0 0 12px;font-size:24px;color:#B91C1C;">Agendamento cancelado</h1>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Olá, <strong>' + this.escape(payload.patient.name) + '</strong>.</p>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Seu agendamento foi cancelado.</p>' +
      '<p style="font-size:14px;line-height:1.7;color:#6B7280;">Para reagendar, entre em contato com a clínica.</p>';

    return this.baseEmail(content);
  },

  applicationReminderEmail: function (row) {
    var protocol = row.protocol_name || "Nao informado";
    var appointmentDate = row.appointment_scheduled_at || row.appointment_date || row.scheduled_for;
    var content = '' +
      '<h1 style="margin:0 0 12px;font-size:24px;color:#1A5347;">Lembrete da sua aplica&ccedil;&atilde;o</h1>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Ola, <strong>' + this.escape(row.patient_name) + '</strong>.</p>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">' + this.escape(this.reminderLeadText(row.reminder_type)) + '</p>' +
      '<div style="background:#FAFAFA;border:1px solid #E5E7EB;border-radius:14px;padding:18px;margin:22px 0;">' +
        '<div style="margin-bottom:8px;"><strong>Data e horario:</strong> ' + this.formatDateTime(appointmentDate) + '</div>' +
        '<div><strong>Protocolo:</strong> ' + this.escape(protocol) + '</div>' +
      '</div>' +
      '<p style="font-size:14px;line-height:1.7;color:#6B7280;">Caso precise reagendar, entre em contato com a clinica o quanto antes.</p>';

    return this.baseEmail(content);
  },

  applicationReminderText: function (row) {
    var appointmentDate = row.appointment_scheduled_at || row.appointment_date || row.scheduled_for;
    return [
      "Ola, " + row.patient_name + ".",
      "",
      this.reminderLeadText(row.reminder_type),
      "Data e horario: " + this.formatDateTime(appointmentDate),
      "Protocolo: " + (row.protocol_name || "Nao informado"),
      "",
      "Caso precise reagendar, entre em contato com a clinica.",
      "",
      Config.get().CLINIC_NAME
    ].join("\n");
  },

  reminderLeadText: function (reminderType) {
    if (reminderType === "7_days_before") return "Passando para lembrar que sua aplicacao esta agendada para daqui a 7 dias.";
    if (reminderType === "1_day_before") return "Passando para lembrar que sua aplicacao sera amanha.";
    if (reminderType === "4_hours_before") return "Passando para lembrar que sua aplicacao sera em aproximadamente 4 horas.";
    return "Passando para lembrar da sua aplicacao agendada.";
  },

  checkinEmail: function (checkin) {
    var content = '' +
      '<h1 style="margin:0 0 12px;font-size:24px;color:#1A5347;">Como você está se sentindo?</h1>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Olá, <strong>' + this.escape(checkin.patient_name) + '</strong>.</p>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Estamos fazendo um check-in rápido após sua aplicação.</p>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">Clique no botão abaixo para responder.</p>' +
      this.button(checkin.form_url, "Responder check-in", "#B8A083") +
      '<div style="background:#FFFBEB;border-left:4px solid #F59E0B;border-radius:10px;padding:14px;margin-top:22px;color:#92400E;font-size:13px;line-height:1.6;">' +
        '<strong>Atenção:</strong> Este check-in não substitui atendimento médico. Em caso de sintomas importantes, piora do estado geral ou urgência, procure atendimento adequado ou entre em contato com a equipe pelos canais oficiais.' +
      '</div>';

    return this.baseEmail(content);
  },

  testEmail: function () {
    return this.baseEmail(
      '<h1 style="margin:0 0 12px;font-size:24px;color:#1A5347;">Teste de integração</h1>' +
      '<p style="font-size:15px;line-height:1.7;color:#374151;">O envio de e-mail pelo Apps Script está funcionando.</p>'
    );
  },
  
  renderSimplePage: function (title, message, success) {
    return HtmlService.createHtmlOutput(
      '<html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + this.escape(title) + '</title></head>' +
      '<body style="font-family:sans-serif;text-align:center;padding:50px 20px;color:#333;">' +
      '<div style="max-width:500px;margin:0 auto;padding:30px;border-radius:12px;border:1px solid #E5E7EB;box-shadow:0 10px 25px rgba(0,0,0,0.05);">' +
      '<h2 style="color:' + (success ? '#1A5347' : '#B91C1C') + ';">' + this.escape(title) + '</h2>' +
      '<p>' + this.escape(message) + '</p>' +
      '</div></body></html>'
    );
  },

  checkinForm: function (checkin) {
    var id = this.escape(checkin.checkin_request_id);
    var token = this.escape(checkin.checkin_token);
    var patient = this.escape(checkin.patient_name || "paciente");

    return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Check-in pós-aplicação</title>
  <style>
    body { margin: 0; padding: 24px; background: #F4F4F4; font-family: Arial, Helvetica, sans-serif; color: #111827; }
    .card { max-width: 680px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 18px; overflow: hidden; box-shadow: 0 14px 35px rgba(0,0,0,.08); }
    .hero { background: linear-gradient(135deg, #1A5347, #256b5d); color: #FFFFFF; padding: 28px; }
    .hero h1 { margin: 0; font-size: 24px; }
    .body { padding: 28px; }
    label { display: block; margin: 18px 0 8px; font-weight: 700; color: #374151; font-size: 14px; }
    select, textarea { width: 100%; border: 1px solid #D1D5DB; border-radius: 12px; padding: 12px; font-size: 15px; box-sizing: border-box; background: #FFFFFF; }
    textarea { min-height: 110px; resize: vertical; }
    button { margin-top: 24px; width: 100%; border: none; background: #1A5347; color: #FFFFFF; padding: 14px 18px; border-radius: 999px; font-weight: 800; cursor: pointer; font-size: 15px; }
    button:disabled { opacity: .65; cursor: wait; }
    .success { display: none; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <h1>Check-in pós-aplicação</h1>
      <p>Olá, ${patient}. Queremos saber como você está.</p>
    </div>
    <div class="body" id="formWrap">
      <form id="checkinForm">
        <label>Como você está se sentindo?</label>
        <select name="feeling" required>
          <option value="">Selecione...</option>
          <option value="Ótimo">Ótimo</option>
          <option value="Bem">Bem</option>
          <option value="Regular">Regular</option>
          <option value="Mal">Mal</option>
        </select>
        
        <label>Teve alguma intercorrência?</label>
        <select name="had_intercurrence" required>
          <option value="">Selecione...</option>
          <option value="Não">Não</option>
          <option value="Sim">Sim</option>
        </select>
        
        <label>Observações adicionais (Opcional)</label>
        <textarea name="notes" placeholder="Digite aqui..."></textarea>
        
        <button type="submit" id="btnSubmit">Enviar Respostas</button>
      </form>
    </div>
    <div id="successWrap" class="success">
      <h2 style="color: #1A5347;">Obrigado!</h2>
      <p>Suas respostas foram registradas.</p>
    </div>
  </div>
  <script>
    document.getElementById('checkinForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = document.getElementById('btnSubmit');
      btn.disabled = true;
      btn.innerText = 'Enviando...';
      
      var data = {
        feeling: document.querySelector('select[name="feeling"]').value,
        had_intercurrence: document.querySelector('select[name="had_intercurrence"]').value,
        notes: document.querySelector('textarea[name="notes"]').value
      };
      
      google.script.run
        .withSuccessHandler(function(res) {
          document.getElementById('formWrap').style.display = 'none';
          document.getElementById('successWrap').style.display = 'block';
        })
        .withFailureHandler(function(err) {
          alert("Ocorreu um erro: " + err.message);
          btn.disabled = false;
          btn.innerText = 'Enviar Respostas';
        })
        .submitCheckinForm('${id}', '${token}', data);
    });
  </script>
</body>
</html>`;
  }
};


// ==========================================
// ARQUIVO: Services.gs
// ==========================================

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

    // 1. Checa idempotência (tolerante a falhas de planilha para nunca bloquear Drive/E-mail)
    try {
      var existing = SignaturesLogRepository.findByRequestId(requestId);
      if (existing) {
        return existing;
      }
    } catch (idempErr) {
      Logger.log('Aviso ao consultar idempotencia signatures_log: ' + idempErr);
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

    // 7. Registra na planilha (tolerante a falhas de planilha)
    try {
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
    } catch (logErr) {
      Logger.log('Aviso ao gravar signatures_log: ' + logErr);
    }

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


// ==========================================
// ARQUIVO: Triggers.gs
// ==========================================

function createDailyReminderTrigger() {
  createAppointmentReminderTrigger();
}

function createAppointmentReminderTrigger() {
  deleteAppointmentReminderTriggers();

  ScriptApp.newTrigger("processScheduledReminders")
    .timeBased()
    .everyMinutes(15)
    .create();
}

function deleteAppointmentReminderTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processScheduledReminders") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function processScheduledReminders() {
  // --- CORREÇÃO 5c: Carregar apenas lembretes PENDING via getObjectsWhere ---
  // ScheduledRemindersRepository.findPending() carregava todos os registros e depois
  // filtrava em memória. Com getObjectsWhere, apenas os PENDING são lidos.
  var pendingRows = SheetsRepository.getObjectsWhere("scheduled_reminders", { status: "PENDING" });
  if (pendingRows.length === 0) return;

  var now = new Date();

  for (var i = 0; i < pendingRows.length; i++) {
    var row = pendingRows[i];
    var scheduledFor = new Date(row.scheduled_for);

    if (!isNaN(scheduledFor.getTime()) && scheduledFor <= now) {
      try {
        var result = EmailService.sendScheduledAppointmentReminder(row);
        ScheduledRemindersRepository.markAsSent(row, result.sent_at);
      } catch (e) {
        Logger.log("Erro ao enviar lembrete para " + row.patient_email + ": " + e.message);
      }
    }
  }
}


function buildFallbackReminderHtml(row) {
  return Templates.applicationReminderEmail(row);
}


// ==========================================
// ARQUIVO: Code.gs
// ==========================================

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
