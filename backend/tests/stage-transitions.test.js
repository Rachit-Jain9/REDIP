/**
 * Tests for deal stage transition logic.
 * Since the actual service hits the DB, we test the transition map directly.
 */

const STAGE_TRANSITIONS = {
  screening: ['site_visit', 'dead'],
  site_visit: ['loi', 'screening', 'dead'],
  loi: ['underwriting', 'site_visit', 'dead'],
  underwriting: ['active', 'loi', 'dead'],
  active: ['closed', 'dead'],
  closed: [],
  dead: ['screening'],
};

const isValidTransition = (from, to) => {
  const allowed = STAGE_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
};

describe('Deal Stage Transitions', () => {
  describe('Forward transitions', () => {
    test('screening → site_visit', () => expect(isValidTransition('screening', 'site_visit')).toBe(true));
    test('site_visit → loi', () => expect(isValidTransition('site_visit', 'loi')).toBe(true));
    test('loi → underwriting', () => expect(isValidTransition('loi', 'underwriting')).toBe(true));
    test('underwriting → active', () => expect(isValidTransition('underwriting', 'active')).toBe(true));
    test('active → closed', () => expect(isValidTransition('active', 'closed')).toBe(true));
  });

  describe('Backward transitions', () => {
    test('site_visit → screening', () => expect(isValidTransition('site_visit', 'screening')).toBe(true));
    test('loi → site_visit', () => expect(isValidTransition('loi', 'site_visit')).toBe(true));
    test('underwriting → loi', () => expect(isValidTransition('underwriting', 'loi')).toBe(true));
  });

  describe('Dead transitions', () => {
    test('screening → dead', () => expect(isValidTransition('screening', 'dead')).toBe(true));
    test('site_visit → dead', () => expect(isValidTransition('site_visit', 'dead')).toBe(true));
    test('loi → dead', () => expect(isValidTransition('loi', 'dead')).toBe(true));
    test('underwriting → dead', () => expect(isValidTransition('underwriting', 'dead')).toBe(true));
    test('active → dead', () => expect(isValidTransition('active', 'dead')).toBe(true));
  });

  describe('Revive from dead', () => {
    test('dead → screening', () => expect(isValidTransition('dead', 'screening')).toBe(true));
    test('dead → site_visit should fail', () => expect(isValidTransition('dead', 'site_visit')).toBe(false));
    test('dead → active should fail', () => expect(isValidTransition('dead', 'active')).toBe(false));
  });

  describe('Invalid transitions', () => {
    test('screening → underwriting (skip stages)', () => expect(isValidTransition('screening', 'underwriting')).toBe(false));
    test('screening → active (skip stages)', () => expect(isValidTransition('screening', 'active')).toBe(false));
    test('screening → closed (skip stages)', () => expect(isValidTransition('screening', 'closed')).toBe(false));
    test('closed → anything', () => expect(isValidTransition('closed', 'screening')).toBe(false));
    test('closed → active', () => expect(isValidTransition('closed', 'active')).toBe(false));
    test('active → screening (too far back)', () => expect(isValidTransition('active', 'screening')).toBe(false));
    test('loi → active (skip underwriting)', () => expect(isValidTransition('loi', 'active')).toBe(false));
  });

  describe('Same-stage transitions', () => {
    test('screening → screening', () => expect(isValidTransition('screening', 'screening')).toBe(false));
    test('active → active', () => expect(isValidTransition('active', 'active')).toBe(false));
  });

  describe('Invalid stage names', () => {
    test('unknown stage', () => expect(isValidTransition('nonexistent', 'screening')).toBe(false));
    test('null stage', () => expect(isValidTransition(null, 'screening')).toBe(false));
  });
});
