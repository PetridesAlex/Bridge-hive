export type OrgMessagesLocale = 'en' | 'el';

const COPY = {
  en: {
    title: 'Messages',
    subtitle: 'Message workers after approved completed shifts.',
    searchPlaceholder: 'Search workers or messages',
    emptyInbox: 'No conversations yet',
    emptyInboxHint:
      'Conversations unlock after you approve a worker’s completed timesheet.',
    emptyThread: 'Select a conversation',
    emptyThreadHint: 'Choose a worker from the inbox to view messages.',
    composerPlaceholder: 'Write a message…',
    send: 'Send',
    retry: 'Retry',
    pending: 'Sending…',
    failed: 'Not sent',
    offline: 'You appear offline. Messages will retry when connected.',
    loading: 'Loading messages…',
    privacy:
      'Do not share patient information, login credentials, or bank details in messages.',
    unread: 'unread',
    you: 'You',
    staff: 'Organization',
    noAccess: 'Messaging is available to organization admins and schedulers.',
    notOperational: 'Messaging unlocks after the organization is active.',
  },
  el: {
    title: 'Μηνύματα',
    subtitle: 'Μηνύματα σε εργαζόμενους μετά από εγκεκριμένες ολοκληρωμένες βάρδιες.',
    searchPlaceholder: 'Αναζήτηση εργαζομένων ή μηνυμάτων',
    emptyInbox: 'Δεν υπάρχουν συνομιλίες ακόμη',
    emptyInboxHint:
      'Οι συνομιλίες ξεκλειδώνουν αφού εγκρίνετε το φύλλο ωρών ενός εργαζόμενου.',
    emptyThread: 'Επιλέξτε συνομιλία',
    emptyThreadHint: 'Επιλέξτε εργαζόμενο από τα εισερχόμενα για να δείτε μηνύματα.',
    composerPlaceholder: 'Γράψτε ένα μήνυμα…',
    send: 'Αποστολή',
    retry: 'Επανάληψη',
    pending: 'Αποστολή…',
    failed: 'Δεν στάλθηκε',
    offline: 'Φαίνεται ότι είστε εκτός σύνδεσης. Θα γίνει επανάληψη όταν συνδεθείτε.',
    loading: 'Φόρτωση μηνυμάτων…',
    privacy:
      'Μην κοινοποιείτε στοιχεία ασθενών, κωδικούς πρόσβασης ή τραπεζικά στοιχεία στα μηνύματα.',
    unread: 'μη αναγνωσμένα',
    you: 'Εσείς',
    staff: 'Οργανισμός',
    noAccess: 'Τα μηνύματα είναι διαθέσιμα σε διαχειριστές και προγραμματιστές.',
    notOperational: 'Τα μηνύματα ξεκλειδώνουν όταν ο οργανισμός είναι ενεργός.',
  },
} as const;

export type OrgMessagesCopy = {
  [K in keyof (typeof COPY)['en']]: string;
};

export function orgMessagesCopy(locale: OrgMessagesLocale = 'en'): OrgMessagesCopy {
  return COPY[locale] ?? COPY.en;
}
