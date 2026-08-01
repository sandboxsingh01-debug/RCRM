const axios = require('axios');
const db = require('../config/database');
require('dotenv').config();

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function fillTemplate(template, vars) {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '');
  }
  return msg;
}

async function isWhatsAppEnabled() {
  const row = await dbGet('SELECT setting_value FROM settings WHERE setting_key = ?', ['whatsapp_enabled']);
  return row?.setting_value === 'true';
}

async function getTemplate(name) {
  return dbGet('SELECT * FROM whatsapp_templates WHERE template_name = ? AND is_active = true', [name]);
}

async function sendWhatsApp({ customerId, mobileNumber, message, templateId, sentBy }) {
  const mobile = (mobileNumber || '').replace(/\s/g, '');
  if (!mobile) return { skipped: true, reason: 'no_mobile' };

  const enabled = await isWhatsAppEnabled();
  let status = 'logged';
  let response = null;

  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const apiUrl = process.env.WHATSAPP_API_URL;

  if (enabled && apiKey && phoneId && apiKey !== 'your-whatsapp-api-key') {
    try {
      const res = await axios.post(
        `${apiUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: mobile.replace(/\D/g, ''),
          type: 'text',
          text: { body: message }
        },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );
      status = 'sent';
      response = JSON.stringify(res.data);
    } catch (err) {
      status = 'failed';
      response = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('WhatsApp API error:', response);
    }
  } else {
    status = enabled ? 'simulated' : 'logged';
    console.log(`📱 WhatsApp [${status}] → ${mobile}: ${message.slice(0, 100)}${message.length > 100 ? '...' : ''}`);
  }

  await dbRun(
    'INSERT INTO whatsapp_logs (customer_id, mobile_number, message, template_id, status, response, sent_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [customerId, mobile, message, templateId || null, status, response, sentBy || null]
  );

  await dbRun(
    'INSERT INTO communications (customer_id, communication_type, subject, message, user_id) VALUES (?, ?, ?, ?, ?)',
    [customerId, 'whatsapp', 'Auto notification', message, sentBy || null]
  );

  return { status, message };
}

async function notifyNewCustomerTrainingSchedule(customerId, sentBy) {
  const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [customerId]);
  if (!customer) return { skipped: true, reason: 'customer_not_found' };

  const trainings = await dbAll(
    'SELECT day_number, training_title FROM training_schedule WHERE customer_id = ? ORDER BY day_number',
    [customerId]
  );

  const scheduleList = trainings.map((t) => `• Day ${t.day_number}: ${t.training_title}`).join('\n');
  const template = await getTemplate('new_customer_training');

  const message = template
    ? fillTemplate(template.message_template, {
        customer_name: customer.contact_person,
        company_name: customer.company_name,
        software_purchased: customer.software_purchased || 'N/A',
        training_schedule: scheduleList
      })
    : `Dear ${customer.contact_person},\n\nWelcome to our CRM! Your onboarding training schedule:\n\n${scheduleList}\n\nOur team will contact you to schedule each session.\n\nTeam CRM`;

  return sendWhatsApp({
    customerId,
    mobileNumber: customer.whatsapp_number || customer.mobile,
    message,
    templateId: template?.id,
    sentBy
  });
}

async function notifyCustomerStatusChange(customerId, newStatus, sentBy) {
  const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [customerId]);
  if (!customer) return { skipped: true, reason: 'customer_not_found' };

  const template = await getTemplate('customer_status_changed');
  const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

  const message = template
    ? fillTemplate(template.message_template, {
        customer_name: customer.contact_person,
        company_name: customer.company_name,
        status: statusLabel
      })
    : `Dear ${customer.contact_person},\n\nYour account status for ${customer.company_name} has been updated to: ${statusLabel}.\n\nFor queries, please contact our support team.\n\nTeam CRM`;

  return sendWhatsApp({
    customerId,
    mobileNumber: customer.whatsapp_number || customer.mobile,
    message,
    templateId: template?.id,
    sentBy
  });
}

async function notifyTrainingStatusChange(trainingId, newStatus, sentBy) {
  const training = await dbGet(
    `SELECT ts.*, c.contact_person, c.company_name, c.mobile, c.whatsapp_number, u.full_name AS trainer_name
     FROM training_schedule ts
     JOIN customers c ON ts.customer_id = c.id
     LEFT JOIN users u ON ts.trainer_id = u.id
     WHERE ts.id = ?`,
    [trainingId]
  );
  if (!training) return { skipped: true, reason: 'training_not_found' };

  const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
  let templateName = 'training_status_update';
  if (newStatus === 'scheduled') templateName = 'training_schedule';
  if (newStatus === 'completed') templateName = 'training_completed';

  const template = await getTemplate(templateName);
  const scheduledDate = training.scheduled_date
    ? new Date(training.scheduled_date).toLocaleDateString('en-IN')
    : 'To be confirmed';

  const message = template
    ? fillTemplate(template.message_template, {
        customer_name: training.contact_person,
        training_title: training.training_title,
        day_number: String(training.day_number),
        status: statusLabel,
        date: scheduledDate,
        time: '10:00 AM',
        trainer_name: training.trainer_name || 'Our training team'
      })
    : `Dear ${training.contact_person},\n\nTraining update — "${training.training_title}" (Day ${training.day_number}) is now: ${statusLabel}.${training.scheduled_date ? `\nScheduled: ${scheduledDate}` : ''}\n\nTeam CRM`;

  return sendWhatsApp({
    customerId: training.customer_id,
    mobileNumber: training.whatsapp_number || training.mobile,
    message,
    templateId: template?.id,
    sentBy
  });
}

module.exports = {
  sendWhatsApp,
  notifyNewCustomerTrainingSchedule,
  notifyCustomerStatusChange,
  notifyTrainingStatusChange,
  isWhatsAppEnabled
};
