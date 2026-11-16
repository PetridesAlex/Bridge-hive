export type OrgMessagesLocale = 'en' | 'el';

const COPY = {
  en: {
    title: 'Messages',
    subtitle:
      'Message workers after approved completed shifts. You can also delete messages you sent, or clear a chat for yourself.',
    searchPlaceholder: 'Search workers or messages',
    inboxLabel: 'Inbox',
    directMessage: 'Direct message',
    conversations: 'conversations',
    emptyInbox: 'No conversations yet',
    emptyInboxHint:
      'Conversations unlock after you approve a worker’s completed timesheet.',
    emptyThread: 'Select a conversation',
    emptyThreadHint: 'Choose a worker from the inbox to view messages.',
    composerPlaceholder: 'Message this worker…',
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
    insertEmoji: 'Insert emoji',
    emojiPickerTitle: 'Emoji',
    emojiSearch: 'Search emoji',
    react: 'React',
    clearReaction: 'Clear reaction',
    messageActions: 'Message actions',
    deleteMessage: 'Delete message',
    deleteMessageTitle: 'Delete this message?',
    deleteMessageBody:
      'The text is erased for you and for the worker, and cannot be restored. A "message deleted" note stays in the chat.',
    messageDeleted: 'This message was deleted',
    chatActions: 'Chat actions',
    deleteChat: 'Delete chat',
    deleteChatTitle: 'Delete this chat?',
    deleteChatBody:
      'This conversation and this worker are removed from your inbox and your earlier messages are cleared. Only you are affected: the worker and other staff keep their copy. A new message brings the chat back with new messages only.',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    deleting: 'Deleting…',
    deleteFailed: 'Could not delete. Please try again.',
    deleteUnavailable: 'Deleting is not available yet.',
  },
  el: {
    title: 'Μηνύματα',
    subtitle:
      'Μηνύματα σε εργαζόμενους μετά από εγκεκριμένες ολοκληρωμένες βάρδιες. Μπορείτε επίσης να διαγράψετε μηνύματα που στείλατε, ή να καθαρίσετε μια συνομιλία για εσάς.',
    searchPlaceholder: 'Αναζήτηση εργαζομένων ή μηνυμάτων',
    inboxLabel: 'Εισερχόμενα',
    directMessage: 'Άμεσο μήνυμα',
    conversations: 'συνομιλίες',
    emptyInbox: 'Δεν υπάρχουν συνομιλίες ακόμη',
    emptyInboxHint:
      'Οι συνομιλίες ξεκλειδώνουν αφού εγκρίνετε το φύλλο ωρών ενός εργαζόμενου.',
    emptyThread: 'Επιλέξτε συνομιλία',
    emptyThreadHint: 'Επιλέξτε εργαζόμενο από τα εισερχόμενα για να δείτε μηνύματα.',
    composerPlaceholder: 'Μήνυμα σε αυτόν τον εργαζόμενο…',
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
    insertEmoji: 'Εισαγωγή emoji',
    emojiPickerTitle: 'Emoji',
    emojiSearch: 'Αναζήτηση emoji',
    react: 'Αντίδραση',
    clearReaction: 'Αφαίρεση αντίδρασης',
    messageActions: 'Ενέργειες μηνύματος',
    deleteMessage: 'Διαγραφή μηνύματος',
    deleteMessageTitle: 'Διαγραφή αυτού του μηνύματος;',
    deleteMessageBody:
      'Το κείμενο διαγράφεται για εσάς και για τον εργαζόμενο και δεν μπορεί να επαναφερθεί. Στη συνομιλία μένει σημείωση «το μήνυμα διαγράφηκε».',
    messageDeleted: 'Αυτό το μήνυμα διαγράφηκε',
    chatActions: 'Ενέργειες συνομιλίας',
    deleteChat: 'Διαγραφή συνομιλίας',
    deleteChatTitle: 'Διαγραφή αυτής της συνομιλίας;',
    deleteChatBody:
      'Η συνομιλία και ο εργαζόμενος αφαιρούνται από τα εισερχόμενά σας και τα προηγούμενα μηνύματά σας διαγράφονται. Επηρεάζεστε μόνο εσείς: ο εργαζόμενος και τα άλλα στελέχη κρατούν το δικό τους αντίγραφο. Ένα νέο μήνυμα επαναφέρει τη συνομιλία μόνο με τα νέα μηνύματα.',
    cancel: 'Άκυρο',
    confirmDelete: 'Διαγραφή',
    deleting: 'Διαγραφή…',
    deleteFailed: 'Η διαγραφή απέτυχε. Δοκιμάστε ξανά.',
    deleteUnavailable: 'Η διαγραφή δεν είναι διαθέσιμη ακόμη.',
  },
} as const;

export type OrgMessagesCopy = {
  [K in keyof (typeof COPY)['en']]: string;
};

export function orgMessagesCopy(locale: OrgMessagesLocale = 'en'): OrgMessagesCopy {
  return COPY[locale] ?? COPY.en;
}
