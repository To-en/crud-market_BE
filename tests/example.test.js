// ── imports: ไม่ต้อง (globals inject ให้) ──

describe('demo', () => {
  // ── hooks ──
  beforeAll(() => {});
  afterAll(() => {});
  beforeEach(() => {});
  afterEach(() => {});

  // ── basic ──
  it('adds', () => {
    expect(1 + 1).toBe(2);
  });

  // ── assertions ──
  it('assertions', () => {
    expect(a).toBe(b);
    expect(obj).toEqual({ a: 1 });
    expect(() => fn()).toThrow(/error msg/);
    expect(value).toBeTruthy();
    expect('hello').toMatch(/ell/);
  });

  // ── async ──
  it('async', async () => {
    const data = await fetchData();
    expect(data.status).toBe('ok');
  });

  // ── mocking ──
  it('mock', () => {
    const fn = jest.fn(() => 42);
    fn();
    expect(fn).toHaveBeenCalledTimes(1);
    jest.spyOn(obj, 'greet').mockReturnValue('mocked');
    jest.mock('./api');
  });
});