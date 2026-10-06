export interface CadenceRuleDefinition {
  offset_days: number;
  direction: 'before' | 'on' | 'after';
  occurrence_key: string;
  stage_number: number;
  label: string;
}

export const DEFAULT_CADENCE: CadenceRuleDefinition[] = [
  {
    stage_number: 1,
    offset_days: 3,
    direction: 'before',
    occurrence_key: 'stage_1_3_days_before',
    label: '3 Days Before Due Date',
  },
  {
    stage_number: 2,
    offset_days: 0,
    direction: 'on',
    occurrence_key: 'stage_2_on_due_date',
    label: 'On Due Date',
  },
  {
    stage_number: 3,
    offset_days: 3,
    direction: 'after',
    occurrence_key: 'stage_3_3_days_overdue',
    label: '3 Days Overdue',
  },
  {
    stage_number: 4,
    offset_days: 7,
    direction: 'after',
    occurrence_key: 'stage_4_7_days_overdue',
    label: '7 Days Overdue',
  },
];

/**
 * Computes scheduled UTC ISO timestamp for a target calendar day at 09:00 AM local time.
 */
export function computeScheduledTime(
  targetDateStr: string, // YYYY-MM-DD
  userTimezone: string = 'Asia/Kolkata'
): string {
  const [year, month, day] = targetDateStr.split('-').map(Number);
  
  // Standard morning reminder window: 09:00:00 AM local
  let tzOffsetMinutes = 330; // Default Asia/Kolkata is UTC+5:30 (330 minutes)

  if (userTimezone.includes('UTC') || userTimezone.includes('GMT')) {
    tzOffsetMinutes = 0;
  } else if (userTimezone.includes('New_York') || userTimezone.includes('EST') || userTimezone.includes('EDT')) {
    tzOffsetMinutes = -300;
  } else if (userTimezone.includes('London') || userTimezone.includes('GMT')) {
    tzOffsetMinutes = 0;
  } else if (userTimezone.includes('Dubai')) {
    tzOffsetMinutes = 240;
  } else if (userTimezone.includes('Singapore')) {
    tzOffsetMinutes = 480;
  }

  // Target local 09:00:00 -> in UTC minutes: (9 * 60) - tzOffsetMinutes
  const localTargetMinutes = 9 * 60;
  const utcTargetMinutes = localTargetMinutes - tzOffsetMinutes;

  const dateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  dateUtc.setUTCMinutes(dateUtc.getUTCMinutes() + utcTargetMinutes);

  return dateUtc.toISOString();
}

/**
 * Shifts a YYYY-MM-DD date by offset days.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dObj = new Date(Date.UTC(y, m - 1, d));
  dObj.setUTCDate(dObj.getUTCDate() + days);
  return dObj.toISOString().split('T')[0];
}

export interface GeneratedReminderRule {
  channel: 'email' | 'whatsapp';
  offset_days: number;
  direction: 'before' | 'on' | 'after';
  occurrence_key: string;
  scheduled_for: string;
  status: 'pending' | 'cancelled' | 'skipped' | 'sent';
  enabled: boolean;
}

/**
 * Deterministically generates reminder schedule for an invoice for specified channels.
 * Maintains idempotency for each channel independently with unique occurrence keys:
 * e.g., stage_1_3_days_before_email, stage_1_3_days_before_whatsapp
 */
export function calculateReminderRules(
  dueDateStr: string,
  userTimezone: string = 'Asia/Kolkata',
  invoiceStatus: string = 'unpaid',
  channels: ('email' | 'whatsapp')[] = ['email']
): GeneratedReminderRule[] {
  const isPaid = invoiceStatus === 'paid';
  const targetChannels = channels.length > 0 ? channels : (['email'] as const);
  const rules: GeneratedReminderRule[] = [];

  for (const channel of targetChannels) {
    for (const cadence of DEFAULT_CADENCE) {
      let dayShift = 0;
      if (cadence.direction === 'before') {
        dayShift = -cadence.offset_days;
      } else if (cadence.direction === 'after') {
        dayShift = cadence.offset_days;
      }

      const targetDate = addDaysToDateString(dueDateStr, dayShift);
      const scheduledFor = computeScheduledTime(targetDate, userTimezone);
      const occurrenceKey = cadence.occurrence_key;

      rules.push({
        channel,
        offset_days: cadence.offset_days,
        direction: cadence.direction,
        occurrence_key: occurrenceKey,
        scheduled_for: scheduledFor,
        status: isPaid ? 'cancelled' : 'pending',
        enabled: !isPaid,
      });
    }
  }

  return rules;
}

/**
 * Recomputes pending rules when an invoice is marked unpaid.
 * Does NOT reset or re-send stages that already have recorded sent logs!
 */
export function recomputeRulesForUnpaid(
  dueDateStr: string,
  sentOccurrenceKeys: Set<string>,
  userTimezone: string = 'Asia/Kolkata',
  channels: ('email' | 'whatsapp')[] = ['email']
): GeneratedReminderRule[] {
  const freshRules = calculateReminderRules(dueDateStr, userTimezone, 'unpaid', channels);
  const now = new Date().toISOString();

  return freshRules.map((rule) => {
    // If this stage & channel occurrence was already sent previously, retain its sent status
    const channelSpecificKey = `${rule.occurrence_key}_${rule.channel}`;
    const wasSent = sentOccurrenceKeys.has(rule.occurrence_key) || sentOccurrenceKeys.has(channelSpecificKey);

    if (wasSent) {
      return {
        ...rule,
        status: 'sent',
        enabled: false,
      };
    }

    // If the scheduled time is already in the past, mark skipped to prevent flooding clients
    if (rule.scheduled_for < now) {
      return {
        ...rule,
        status: 'skipped',
        enabled: false,
      };
    }

    return {
      ...rule,
      status: 'pending',
      enabled: true,
    };
  });
}

