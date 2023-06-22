/// <reference types="@types/jest" />
import {createRipple, fullImmutable} from "../Immutable";


describe('createImmutable', () => {
  it('should create an immutable object', () => {
    let obj = {a: 1, b: {c: 2}};
    let immutableObj = createRipple(obj, 1);
    immutableObj.a = 2;
    immutableObj.b.c = 3;
    expect(obj).toEqual({a: 1, b: {c: 2}});
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual({a: 2, b: {c: 3}});


  });

  it('should cancel the changes', () => {
    let obj = {a: 1, b: {c: 2}};
    let immutableObj = createRipple(obj, 1);
    immutableObj.a = 2;
    immutableObj.b.c = 3;
    fullImmutable(immutableObj).__cancel();
    expect(obj).toEqual({a: 1, b: {c: 2}});
  });

  it('should handle array', () => {
    let obj = [1,2,3];
    let immutableObj = createRipple(obj, 1);
    immutableObj[0] = 10;
    immutableObj.push(4);
    immutableObj.length = 2;
    expect(obj).toEqual([1,2,3]);
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual([10,2]);
    fullImmutable(immutableObj).__cancel();
    expect(obj).toEqual([10,2]);
    immutableObj.length = 0;
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual([]);
  });

  it('should handle nested array', () => {
    let obj = {a: 1, b: [1,2,3]};
    let immutableObj = createRipple(obj, 1);
    immutableObj.b[0] = 10;
    immutableObj.b.push(4);
    immutableObj.b.length = 2;
    expect(obj).toEqual({a: 1, b: [1,2,3]});
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual({a: 1, b: [10,2]});
    fullImmutable(immutableObj).__cancel();
    expect(obj).toEqual({a: 1, b: [10,2]});
  });

  it('should handle nested object', () => {
    let obj = {a: {b: {c: 2}}};
    let immutableObj = createRipple(obj, 1);
    immutableObj.a.b.c = 3;
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual({a: {b: {c: 3}}});
    immutableObj.a.b.c = 4;
    fullImmutable(immutableObj).__cancel();
    expect(obj).toEqual({a: {b: {c: 3}}});
  });

  it('should apply changes', () => {
    let obj = {a: 1, b: {c: 2}};
    let immutableObj = createRipple(obj, 1);
    immutableObj.a = 2;
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual({a: 2, b: {c: 2}});
  });

  it('should propagate changes to nested proxied objects', () => {
    let obj = {a: {b: {c: 2}}} as any;
    let immutableObj = createRipple(obj, 1);
    immutableObj.a.b.c = 3;
    immutableObj.a.b = {d: 4};
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual({a: {b: {d: 4}}});
    immutableObj.a = {e: 5};
    fullImmutable(immutableObj).__cancel();
    expect(obj).toEqual({a: {b: {d: 4}}});
  });

  it("should be able to set a proxy as property", () => {
    let obj = {a: 1, b: {c:1}};
    let immutableObj = createRipple(obj, 1);
    let b = immutableObj.b;
    immutableObj.b = b;
    b.c = 2;
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual({a: 1, b: {c: 2}});
  });

  it("should be able to set a proxy without changes", () => {
    let obj = {a: 1, b: {c:1}};
    let immutableObj = createRipple(obj, 1);
    let b = immutableObj.b;
    immutableObj.b = createRipple({ c: 1 }, 1);
    fullImmutable(immutableObj).__applyInternal();
    expect(obj).toEqual({a: 1, b: {c: 1}});
  });

});
