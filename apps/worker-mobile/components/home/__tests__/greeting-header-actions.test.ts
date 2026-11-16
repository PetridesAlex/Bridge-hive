import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..', '..', '..');

function source(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('GreetingHeader dashboard actions', () => {
  it('renders Messages → Notifications → Menu with real routes and unread props', () => {
    const header = source('components/home/GreetingHeader.tsx');
    const home = source('app/(tabs)/index.tsx');

    const messages = header.indexOf("router.push('/messages')");
    const notifications = header.indexOf("router.push('/profile/notifications')");
    const menu = header.indexOf('setMenuOpen(true)');
    expect(messages).toBeGreaterThan(-1);
    expect(notifications).toBeGreaterThan(-1);
    expect(menu).toBeGreaterThan(-1);
    expect(messages).toBeLessThan(notifications);
    expect(notifications).toBeLessThan(menu);

    expect(header).toContain('chatbubbles');
    expect(header).toContain('messageUnreadCount');
    expect(header).toContain('showMessages');
    expect(header).toContain("t('home.messagesA11y')");
    expect(header).toContain("t('home.notificationsA11y')");
    expect(header).toContain("t('home.menuA11y')");

    // Zero unread must not force a badge — badge only when count > 0.
    expect(header).toContain('const hasAlert = count > 0');
    expect(header).toMatch(/\{hasAlert \? \(/);

    expect(home).toContain('messageUnreadCount={messageUnreadCount}');
    expect(home).toContain('showMessages={!isAppReviewDemo}');
    expect(home).toContain('sumConversationUnread');
    expect(home).toContain('listMyMessagingConversations');
  });

  it('keeps Messages entry visible for authenticated workers with empty inboxes', () => {
    const header = source('components/home/GreetingHeader.tsx');
    expect(header).not.toMatch(/showMessages\s*=\s*.*conversation/i);
    expect(header).not.toMatch(/approved.*showMessages|showMessages.*approved/i);
    expect(header).toContain('showMessages = true');
  });
});
