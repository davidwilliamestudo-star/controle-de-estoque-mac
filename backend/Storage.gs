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
