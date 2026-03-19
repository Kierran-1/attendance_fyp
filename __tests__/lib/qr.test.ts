import { signQRToken, verifyQRToken, QRPayload } from '@/lib/qr';

describe('lib/qr', () => {
  const basePayload = {
    studentId: 'student-001',
    userId: 'user-cuid-123',
    sessionId: 'session-cuid-456',
  };

  describe('signQRToken', () => {
    it('returns a string containing exactly one dot separator', () => {
      const token = signQRToken(basePayload);
      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });
  });

  describe('verifyQRToken', () => {
    it('round-trips: sign then verify returns original payload fields', () => {
      const token = signQRToken(basePayload);
      const result: QRPayload = verifyQRToken(token);

      expect(result.studentId).toBe(basePayload.studentId);
      expect(result.userId).toBe(basePayload.userId);
      expect(result.sessionId).toBe(basePayload.sessionId);
      expect(typeof result.exp).toBe('number');
    });

    it('throws "Invalid signature" for a tampered token', () => {
      const token = signQRToken(basePayload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyQRToken(tampered)).toThrow('Invalid signature');
    });

    it('throws "Invalid signature" for a completely invalid token', () => {
      expect(() => verifyQRToken('notvalid')).toThrow('Invalid signature');
    });

    it('throws "Token expired" for a token whose exp is in the past', () => {
      const token = signQRToken(basePayload);

      // Advance Date.now by 61 seconds so the token appears expired
      const originalNow = Date.now;
      jest.spyOn(Date, 'now').mockReturnValue(originalNow() + 61_000);

      try {
        expect(() => verifyQRToken(token)).toThrow('Token expired');
      } finally {
        jest.spyOn(Date, 'now').mockRestore();
      }
    });
  });
});
