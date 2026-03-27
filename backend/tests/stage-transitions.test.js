const { STAGE_TRANSITIONS, canTransitionStage } = require('../src/constants/domain');

describe('Deal Stage Transitions', () => {
  test('all declared stages have a transition map entry', () => {
    expect(Object.keys(STAGE_TRANSITIONS)).toEqual(
      expect.arrayContaining([
        'sourced',
        'screening',
        'site_visit',
        'loi',
        'due_diligence',
        'underwriting',
        'ic_review',
        'negotiation',
        'active',
        'closed',
        'dead',
      ])
    );
  });

  describe('forward transitions', () => {
    test('sourced -> screening', () => expect(canTransitionStage('sourced', 'screening')).toBe(true));
    test('screening -> site_visit', () => expect(canTransitionStage('screening', 'site_visit')).toBe(true));
    test('loi -> due_diligence', () => expect(canTransitionStage('loi', 'due_diligence')).toBe(true));
    test('due_diligence -> underwriting', () => expect(canTransitionStage('due_diligence', 'underwriting')).toBe(true));
    test('underwriting -> ic_review', () => expect(canTransitionStage('underwriting', 'ic_review')).toBe(true));
    test('ic_review -> negotiation', () => expect(canTransitionStage('ic_review', 'negotiation')).toBe(true));
    test('negotiation -> active', () => expect(canTransitionStage('negotiation', 'active')).toBe(true));
    test('active -> closed', () => expect(canTransitionStage('active', 'closed')).toBe(true));
  });

  describe('backward transitions', () => {
    test('screening -> sourced', () => expect(canTransitionStage('screening', 'sourced')).toBe(true));
    test('site_visit -> screening', () => expect(canTransitionStage('site_visit', 'screening')).toBe(true));
    test('due_diligence -> loi', () => expect(canTransitionStage('due_diligence', 'loi')).toBe(true));
    test('negotiation -> ic_review', () => expect(canTransitionStage('negotiation', 'ic_review')).toBe(true));
  });

  describe('dead / revive transitions', () => {
    test('any live stage can move to dead', () => {
      ['sourced', 'screening', 'site_visit', 'loi', 'due_diligence', 'underwriting', 'ic_review', 'negotiation', 'active'].forEach((stage) => {
        expect(canTransitionStage(stage, 'dead')).toBe(true);
      });
    });

    test('dead -> sourced', () => expect(canTransitionStage('dead', 'sourced')).toBe(true));
    test('dead -> screening', () => expect(canTransitionStage('dead', 'screening')).toBe(true));
    test('dead -> active should fail', () => expect(canTransitionStage('dead', 'active')).toBe(false));
  });

  describe('invalid transitions', () => {
    test('screening -> underwriting skips key diligence', () => {
      expect(canTransitionStage('screening', 'underwriting')).toBe(false);
    });

    test('loi -> active skips diligence and approvals', () => {
      expect(canTransitionStage('loi', 'active')).toBe(false);
    });

    test('closed -> sourced should fail', () => {
      expect(canTransitionStage('closed', 'sourced')).toBe(false);
    });

    test('same-stage transitions should fail', () => {
      expect(canTransitionStage('screening', 'screening')).toBe(false);
    });
  });
});
