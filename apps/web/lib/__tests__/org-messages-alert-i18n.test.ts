import { orgMessagesCopy } from '../org-messages-i18n';

describe('org messages alert i18n', () => {
  it('provides matching English and Greek alert strings without message bodies', () => {
    const en = orgMessagesCopy('en');
    const el = orgMessagesCopy('el');
    expect(en.alertTitle).toBe('New message');
    expect(en.alertBody).toContain('{name}');
    expect(en.alertAction).toBe('View message');
    expect(el.alertTitle).toBe('Νέο μήνυμα');
    expect(el.alertBody).toContain('{name}');
    expect(el.alertAction).toBe('Προβολή μηνύματος');
    expect(en.alertBody.toLowerCase()).not.toContain('patient');
    expect(en.alertBody.toLowerCase()).not.toContain('bank');
  });
});
