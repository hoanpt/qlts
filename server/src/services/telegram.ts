/**
 * Telegram Bot Notification Service
 * Gửi thông báo báo hỏng thiết bị về group Telegram của kỹ thuật viên
 *
 * Cấu hình 2 biến môi trường trên Coolify:
 *   TELEGRAM_BOT_TOKEN  - Token từ @BotFather (VD: 7123456789:AAHxxxxx)
 *   TELEGRAM_CHAT_ID    - Chat ID của group (VD: -1002345678901)
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Gửi một tin nhắn văn bản tới group Telegram qua Bot API.
 * Hàm này không throw - nếu lỗi chỉ log ra console để không ảnh hưởng luồng chính.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[Telegram] TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được cấu hình — bỏ qua gửi thông báo.');
    return;
  }

  try {
    const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Telegram] Gửi thông báo thất bại:', response.status, err);
    } else {
      console.log('[Telegram] Đã gửi thông báo thành công tới group.');
    }
  } catch (err: any) {
    console.error('[Telegram] Lỗi khi gọi Telegram API:', err.message);
  }
}

/**
 * Định dạng tin nhắn báo hỏng thiết bị để gửi Telegram.
 */
export function formatMaintenanceNotification(data: {
  assetCode: string;
  assetName: string;
  departmentName: string;
  locationDetail?: string | null;
  issueDescription: string;
  requestedBy: string;
  priority: string;
  managingUnit?: string | null;
  contactPhone?: string | null;
  requestDate: Date;
}): string {
  const priorityEmoji: Record<string, string> = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🔴',
    URGENT: '🚨'
  };
  const priorityLabel: Record<string, string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    URGENT: 'Khẩn cấp'
  };
  const unitLabel: Record<string, string> = {
    DUOC: 'Khoa Dược (TBYT)',
    CNTT: 'Tổ CNTT',
    TCHC: 'Phòng TCHC'
  };

  const prio = data.priority || 'MEDIUM';
  const unit = data.managingUnit ? (unitLabel[data.managingUnit] || data.managingUnit) : 'Tổ CNTT';
  const date = data.requestDate.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const lines = [
    `🔧 <b>BÁO HỎNG THIẾT BỊ</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📦 <b>Thiết bị:</b> ${data.assetName}`,
    `🏷️ <b>Mã TB:</b> <code>${data.assetCode}</code>`,
    `🏥 <b>Bộ phận báo:</b> ${data.departmentName}`,
    data.locationDetail ? `📍 <b>Vị trí:</b> ${data.locationDetail}` : null,
    `⚠️ <b>Tình trạng:</b> ${data.issueDescription}`,
    `${priorityEmoji[prio] || '🟡'} <b>Mức độ:</b> ${priorityLabel[prio] || prio}`,
    `🔧 <b>Đơn vị tiếp nhận:</b> ${unit}`,
    `👤 <b>Người báo:</b> ${data.requestedBy}`,
    data.contactPhone ? `📞 <b>Điện thoại:</b> ${data.contactPhone}` : null,
    `🕐 <b>Thời gian:</b> ${date}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `<i>Vui lòng kiểm tra và xử lý kịp thời!</i>`
  ].filter(Boolean);

  return lines.join('\n');
}
