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
