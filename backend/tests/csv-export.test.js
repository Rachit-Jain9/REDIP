describe('CSV Export Utilities', () => {
  const escapeCsvField = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const toCsvRow = (fields) => fields.map(escapeCsvField).join(',');

  describe('escapeCsvField', () => {
    test('should return empty string for null', () => {
      expect(escapeCsvField(null)).toBe('');
    });

    test('should return empty string for undefined', () => {
      expect(escapeCsvField(undefined)).toBe('');
    });

    test('should return string as-is when no special chars', () => {
      expect(escapeCsvField('hello')).toBe('hello');
    });

    test('should wrap field with commas in quotes', () => {
      expect(escapeCsvField('hello, world')).toBe('"hello, world"');
    });

    test('should escape double quotes', () => {
      expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    });

    test('should handle newlines', () => {
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });

    test('should convert numbers to strings', () => {
      expect(escapeCsvField(42)).toBe('42');
    });

    test('should convert floats to strings', () => {
      expect(escapeCsvField(3.14)).toBe('3.14');
    });

    test('should handle zero', () => {
      expect(escapeCsvField(0)).toBe('0');
    });

    test('should handle boolean', () => {
      expect(escapeCsvField(true)).toBe('true');
    });
  });

  describe('toCsvRow', () => {
    test('should join simple fields with commas', () => {
      expect(toCsvRow(['a', 'b', 'c'])).toBe('a,b,c');
    });

    test('should handle mixed types', () => {
      expect(toCsvRow(['name', 42, null, 'city'])).toBe('name,42,,city');
    });

    test('should escape fields that need it', () => {
      expect(toCsvRow(['Mumbai', 'Bandra, West', 155])).toBe('Mumbai,"Bandra, West",155');
    });

    test('should handle empty array', () => {
      expect(toCsvRow([])).toBe('');
    });
  });
});
