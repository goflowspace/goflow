import {pluralizeRussian, pluralizeWithI18n} from '../pluralization';

describe('pluralizeRussian', () => {
  const one = 'узел';
  const few = 'узла';
  const many = 'узлов';

  test('should return "one" form for 1', () => {
    expect(pluralizeRussian(1, one, few, many)).toBe(one);
  });

  test('should return "one" form for 21', () => {
    expect(pluralizeRussian(21, one, few, many)).toBe(one);
  });

  test('should return "one" form for 101', () => {
    expect(pluralizeRussian(101, one, few, many)).toBe(one);
  });

  test('should return "few" form for 2', () => {
    expect(pluralizeRussian(2, one, few, many)).toBe(few);
  });

  test('should return "few" form for 3', () => {
    expect(pluralizeRussian(3, one, few, many)).toBe(few);
  });

  test('should return "few" form for 4', () => {
    expect(pluralizeRussian(4, one, few, many)).toBe(few);
  });

  test('should return "few" form for 22', () => {
    expect(pluralizeRussian(22, one, few, many)).toBe(few);
  });

  test('should return "few" form for 104', () => {
    expect(pluralizeRussian(104, one, few, many)).toBe(few);
  });

  test('should return "many" form for 0', () => {
    expect(pluralizeRussian(0, one, few, many)).toBe(many);
  });

  test('should return "many" form for 5', () => {
    expect(pluralizeRussian(5, one, few, many)).toBe(many);
  });

  test('should return "many" form for 10', () => {
    expect(pluralizeRussian(10, one, few, many)).toBe(many);
  });

  test('should return "many" form for 11', () => {
    expect(pluralizeRussian(11, one, few, many)).toBe(many);
  });

  test('should return "many" form for 12', () => {
    expect(pluralizeRussian(12, one, few, many)).toBe(many);
  });

  test('should return "many" form for 14', () => {
    expect(pluralizeRussian(14, one, few, many)).toBe(many);
  });

  test('should return "many" form for 111', () => {
    expect(pluralizeRussian(111, one, few, many)).toBe(many);
  });

  test('should return "many" form for 114', () => {
    expect(pluralizeRussian(114, one, few, many)).toBe(many);
  });

  test('should return "many" form for 25', () => {
    expect(pluralizeRussian(25, one, few, many)).toBe(many);
  });
});

describe('pluralizeWithI18n', () => {
  const t = jest.fn();

  beforeEach(() => {
    t.mockClear();
  });

  test('should use pluralizeRussian when translation is an object with forms', () => {
    const forms = {one: 'узел', few: 'узла', many: 'узлов'};
    t.mockReturnValue(forms);

    expect(pluralizeWithI18n(1, 'nodes', t)).toBe('узел');
    expect(pluralizeWithI18n(2, 'nodes', t)).toBe('узла');
    expect(pluralizeWithI18n(5, 'nodes', t)).toBe('узлов');
    expect(t).toHaveBeenCalledWith('nodes');
  });

  test('should return the translation as is if it is a simple string', () => {
    const simpleString = 'Nodes';
    t.mockReturnValue(simpleString);

    expect(pluralizeWithI18n(1, 'nodes', t)).toBe(simpleString);
    expect(pluralizeWithI18n(5, 'nodes', t)).toBe(simpleString);
  });

  test('should return the key if translation is not found', () => {
    t.mockReturnValue(null);
    expect(pluralizeWithI18n(1, 'untranslated_key', t)).toBe('untranslated_key');
  });
});
