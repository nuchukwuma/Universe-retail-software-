// Turns a Nigerian phone number like 0803 123 4567 into 2348031234567,
// the format WhatsApp links need. Returns '' for an empty number.
export function toWhatsAppNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
}

// Builds a link that opens WhatsApp with a message ready to send.
// Without a phone number, WhatsApp asks who to send it to.
export function whatsAppLink(phone, text) {
  const number = toWhatsAppNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
