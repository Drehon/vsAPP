// tests/utils.test.js
const { add } = require('../src/sub-functions/utils');

describe('add function', () => {
  test('should correctly add two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('should correctly handle negative numbers', () => {
    expect(add(-2, -3)).toBe(-5);
  });
});
