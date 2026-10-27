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
