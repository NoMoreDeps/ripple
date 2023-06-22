/// <reference types="@types/jest" />
import { createEventsIds, instanceTracker } from "../InternalIds";

describe('createEventsIds', () => {
  beforeEach(() => {
    instanceTracker.clear();
  });

  it('should replace all values of 0 with a new unique id', () => {
    const input = {
      foo: 0,
      bar: {
        baz: 0,
        qux: 2
      }
    };
    const output = createEventsIds(input);

    expect(output.foo).not.toBe(0);
    expect(output.bar.baz).not.toBe(0);
    expect(output.bar.qux).toBe(2);
  });

  it('should not replace any values that are not 0', () => {
    const input = {
      foo: 1,
      bar: {
        baz: 2,
        qux: 3
      }
    };
    const output = createEventsIds(input);

    expect(output.foo).toBe(1);
    expect(output.bar.baz).toBe(2);
    expect(output.bar.qux).toBe(3);
  });

  it('should be idempotent', () => {
    const input = {
      foo: 0,
      bar: {
        baz: 0,
        qux: 2
      }
    };
    const output = createEventsIds(input);
    const doubleOutput = createEventsIds(output);

    expect(output).toEqual(doubleOutput);
  });

  it('should add new unique ids to the instanceTracker', () => {
    const input = {
      foo: 0,
      bar: {
        baz: 0,
        qux: 2
      }
    };
    createEventsIds(input);
    expect(instanceTracker.size).toBe(0);
  });
});
