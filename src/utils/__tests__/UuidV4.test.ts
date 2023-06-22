import { UuidV4 } from '../UuidV4'; // Replace './your-module' with the actual path to your module

describe('Unit Test for UUID_V4', () => {
  test('UUID_V4 should return a valid UUID v4 string', () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const uuid = UuidV4();
    expect(uuidPattern.test(uuid)).toBeTruthy();
  });

  test('UUID_V4 should generate a unique UUID each time it is called', () => {
    const uuid1 = UuidV4();
    const uuid2 = UuidV4();

    expect(uuid1).not.toBe(uuid2);
  });
});
