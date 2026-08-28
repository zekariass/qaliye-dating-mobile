import { usePhoneOtp } from '../usePhoneOtp';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (fn: Function) => fn,
  useState: (initial: unknown) => {
    let val = initial;
    const set = (v: unknown) => {
      val = typeof v === 'function' ? (v as Function)(val) : v;
    };
    return [val, set];
  },
}));

const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  },
}));

type HookResult = ReturnType<typeof usePhoneOtp>;

function getHook(): HookResult {
  return (usePhoneOtp as unknown as () => HookResult)();
}

describe('usePhoneOtp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendCode', () => {
    it('calls signInWithOtp with normalized E.164 phone for 09... input', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const { sendCode } = getHook();
      await sendCode.mutateAsync('0912345678');
      expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: '+251912345678' });
    });

    it('calls signInWithOtp with normalized E.164 phone for 9... input', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const { sendCode } = getHook();
      await sendCode.mutateAsync('912345678');
      expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: '+251912345678' });
    });

    it('calls signInWithOtp with already-normalized +251... input', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const { sendCode } = getHook();
      await sendCode.mutateAsync('+251912345678');
      expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: '+251912345678' });
    });

    it('throws for invalid Ethiopian phone and does not call Supabase', async () => {
      const { sendCode } = getHook();
      await expect(sendCode.mutateAsync('+441234567890')).rejects.toThrow('invalid_ethiopian_phone');
      expect(mockSignInWithOtp).not.toHaveBeenCalled();
    });

    it('throws for non-251 country code', async () => {
      const { sendCode } = getHook();
      await expect(sendCode.mutateAsync('+12025551234')).rejects.toThrow('invalid_ethiopian_phone');
      expect(mockSignInWithOtp).not.toHaveBeenCalled();
    });

    it('throws when Supabase returns an error', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: new Error('Phone provider not configured') });
      const { sendCode } = getHook();
      await expect(sendCode.mutateAsync('0912345678')).rejects.toThrow('Phone provider not configured');
    });
  });

  describe('verifyCode', () => {
    it('calls verifyOtp with normalized phone, token, and type sms', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      const { verifyCode } = getHook();
      await verifyCode.mutateAsync({ phone: '0912345678', code: '123456' });
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        phone: '+251912345678',
        token: '123456',
        type: 'sms',
      });
    });

    it('calls verifyOtp with already-normalized E.164 phone', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      const { verifyCode } = getHook();
      await verifyCode.mutateAsync({ phone: '+251912345678', code: '654321' });
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        phone: '+251912345678',
        token: '654321',
        type: 'sms',
      });
    });

    it('throws for invalid phone during verify and does not call Supabase', async () => {
      const { verifyCode } = getHook();
      await expect(verifyCode.mutateAsync({ phone: 'invalid', code: '123456' })).rejects.toThrow(
        'invalid_ethiopian_phone',
      );
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it('throws when Supabase verifyOtp returns an error', async () => {
      mockVerifyOtp.mockResolvedValue({ error: new Error('Token has expired or is invalid') });
      const { verifyCode } = getHook();
      await expect(verifyCode.mutateAsync({ phone: '0912345678', code: '000000' })).rejects.toThrow(
        'Token has expired or is invalid',
      );
    });

    it('does NOT call signInWithOtp — verifyCode is independent of sendCode', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      const { verifyCode } = getHook();
      await verifyCode.mutateAsync({ phone: '0912345678', code: '123456' });
      expect(mockSignInWithOtp).not.toHaveBeenCalled();
    });
  });

  describe('independence from other auth methods', () => {
    it('has no side effects on mount — no Supabase calls', () => {
      getHook();
      expect(mockSignInWithOtp).not.toHaveBeenCalled();
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it('sendCode and verifyCode calls are entirely independent', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      mockVerifyOtp.mockResolvedValue({ error: null });
      const { sendCode, verifyCode } = getHook();

      await sendCode.mutateAsync('0912345678');
      expect(mockVerifyOtp).not.toHaveBeenCalled();

      await verifyCode.mutateAsync({ phone: '0912345678', code: '123456' });
      expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    });
  });
});
