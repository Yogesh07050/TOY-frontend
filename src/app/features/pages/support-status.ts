import { SupportStatus } from '../../core/models';
import { SUPPORT_CATEGORIES } from './content';

/**
 * How a ticket's state is spoken about, in one place.
 *
 * The customer's view and the support queue show the same five statuses and
 * would otherwise word them twice, which is how "Waiting on customer" ends up
 * meaning the opposite thing on the two screens that display it.
 */
export const STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  // Phrased from the reader's side on purpose. Support sees a queue; the
  // customer sees a question they have not answered yet.
  waiting_on_customer: 'Awaiting your reply',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** The badge class each status wears. Kept off colour alone by the label. */
export const STATUS_BADGES: Record<SupportStatus, string> = {
  open: 'badge-info',
  in_progress: 'badge-brand',
  waiting_on_customer: 'badge-warning',
  resolved: 'badge-success',
  closed: 'badge',
};

const CATEGORY_LABELS = new Map(SUPPORT_CATEGORIES.map((item) => [item.value, item.label]));

/**
 * A category's display name.
 *
 * Falls back to the stored value rather than to "Other": a ticket filed under
 * a category that has since been renamed or retired must still read back as
 * what it was, and silently relabelling old tickets would rewrite history to
 * match today's list.
 */
export const categoryLabel = (value: string): string => CATEGORY_LABELS.get(value) ?? value;
