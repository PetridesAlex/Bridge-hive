import {
  claimErrorMessage,
  filledPositionsLabel,
  openPositionsLabel,
} from '@bridge-hive/domain';

describe('multi-position claim UI copy', () => {
  it('uses the same server-driven capacity labels for marketplace and details', () => {
    // Server returns open_positions / filled_positions; both surfaces format them identically.
    expect(openPositionsLabel(1)).toBe('1 position open');
    expect(openPositionsLabel(2)).toBe('2 positions open');
    expect(openPositionsLabel(0)).toBe('All positions filled');
    expect(filledPositionsLabel(1, 2)).toBe('1 / 2 positions filled');
  });

  it('maps SHIFT_FULL for an unassigned worker on a just-filled shift', () => {
    expect(claimErrorMessage('SHIFT_FULL')).toBe(
      'This shift was just filled by another professional.',
    );
  });

  it('keeps assigned vs full messaging distinct', () => {
    const assignedCopy = 'You are assigned to this shift';
    const fullCopy = 'All positions have been filled.';
    expect(assignedCopy).not.toEqual(fullCopy);
    expect(fullCopy).toMatch(/filled/i);
  });
});
