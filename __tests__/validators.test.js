/**
 * Unit Tests for Validators
 * Run with: npm test (requires Jest setup)
 */

import Validators from '../js/utils/validators.js';

describe('Validators', () => {
    describe('taskText', () => {
        test('should accept valid task text', () => {
            const result = Validators.taskText('Valid task');
            expect(result.valid).toBe(true);
        });

        test('should reject empty text', () => {
            const result = Validators.taskText('');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('cannot be empty');
        });

        test('should reject text over 500 characters', () => {
            const longText = 'a'.repeat(501);
            const result = Validators.taskText(longText);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('500 characters');
        });

        test('should reject potentially malicious content', () => {
            const result = Validators.taskText('<script>alert("xss")</script>');
            expect(result.valid).toBe(false);
        });
    });

    describe('duration', () => {
        test('should accept valid duration', () => {
            const result = Validators.duration(2.5);
            expect(result.valid).toBe(true);
        });

        test('should accept empty duration', () => {
            const result = Validators.duration('');
            expect(result.valid).toBe(true);
        });

        test('should reject negative duration', () => {
            const result = Validators.duration(-1);
            expect(result.valid).toBe(false);
        });

        test('should reject duration over 24 hours', () => {
            const result = Validators.duration(25);
            expect(result.valid).toBe(false);
        });

        test('should reject non-numeric duration', () => {
            const result = Validators.duration('abc');
            expect(result.valid).toBe(false);
        });
    });

    describe('date', () => {
        test('should accept valid date', () => {
            const result = Validators.date('2025-06-15');
            expect(result.valid).toBe(true);
        });

        test('should accept empty date', () => {
            const result = Validators.date('');
            expect(result.valid).toBe(true);
        });

        test('should reject invalid date', () => {
            const result = Validators.date('not-a-date');
            expect(result.valid).toBe(false);
        });

        test('should reject year outside valid range', () => {
            const result = Validators.date('2200-01-01');
            expect(result.valid).toBe(false);
        });
    });
});
