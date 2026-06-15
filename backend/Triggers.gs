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
