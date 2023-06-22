/**
 * Licensed under the MIT License.
 */

import { rippleBus } from "../core/RippleBus";

/**
 * Creates an immutable version of the given object or array.
 * @template T
 * @param {T} obj - The object or array to make immutable.
 * @returns {T} - The immutable version of the object or array.
 */
function createImmutableRipple<T extends object>(_obj: T, uniqueRoutingKey: number, withUpdate?: boolean): T {
  let changes = {} as any;
  let immutableMap = new Map<string, any>();
  let obj = _obj;

  function applyChanges(this: any, noEmits?: boolean) {
    Object.entries(changes).forEach(([key, value]) => {
      if (Array.isArray(obj)) {
        if (key === 'length') {
          obj.length = value as number;
        } else {
          obj[parseInt(key)] = value;
        }
      } else {
        if (value && typeof value === "object") {
          (value as any)?.__apply?.(true);
          (!(value as any)?.__apply) && ((value as any)?.__applyInternal?.(true));
        }
        (obj as any)[key] = value;
      }
    });

    changes = {};
    immutableMap.forEach((item: any) => {
      item?.__apply?.(true);
      (!(item as any)?.__apply) && ((item as any)?.__applyInternal?.(true));

    });
    immutableMap.clear();
    !noEmits && rippleBus.emit({eventId: uniqueRoutingKey});
  }

  function cancelChanges(this: any) {
    Object.entries(this._changes).forEach(([_key, value]) => {
      if (value && typeof value === "object") {
        (value as any)?.__cancel?.();
      }
    });
    changes = {};
    immutableMap.forEach((item: any) => {
      item?.__cancel?.();
    });
    immutableMap.clear();
  }

  const proxy = new Proxy(obj, {
    get: (target: any, prop) => {
      if (prop === "__isProxy") return true;
      if (prop === "__applyInternal") return applyChanges;
      if (prop === "__cancel") return cancelChanges;

      if (prop === "_changes") {
        return changes;
      }

      // First we try to get the value from the immutable map.
      const immutableValue = immutableMap.get(prop as string);
      if (immutableValue) return immutableValue;

      // then we try to get the value from the changes.
      // then we try from the target.
      let getValue = changes[prop] ?? target[prop];

      if ((typeof getValue === "object" && getValue !== null) || Array.isArray(getValue)) {
        // If the value is an object or array, we create an immutable version of it.
        const immutableValue = createImmutableRipple(getValue, uniqueRoutingKey, withUpdate);
        immutableMap.set(prop as string, immutableValue);
        return immutableValue;
      }

      return getValue;
    },
    set: (target, prop: string, value) => {

      // We check first if the prop belongs to the immutable map
			//  - If it does we check if the value is a proxy or not
			//      - If it is we set the value to the immutable map
			//      - If it is not we set the value to the changes object
			//        And we remove the prop from the immutable map
			if (immutableMap.has(prop)) {
				if (value && value.__isProxy) {
					immutableMap.set(prop, value);
				}
				else {
					changes[prop] = value;
					immutableMap.delete(prop);
				}
				return true;
			}

			// If the prop is not in the immutable map we check if it is in the changes object
			// If it is we set the value to the changes object
			let propNum = null;
			if (Array.isArray(target) && typeof prop === "string" && /^\d+$/.test(prop)) {
				propNum = parseInt(prop);
			}

			changes[propNum !== null && propNum !== void 0 ? propNum : prop] = value;
      return true;
    }
  }) as T;

  return proxy as unknown as T;
}

export const createRipple = <T extends object>(obj: T, uniqueRoutingKey: number) =>
  createImmutableRipple<T>(obj, uniqueRoutingKey, false) as T;

export const fullImmutable = <T>(source: T) => source as T & { __applyInternal: () => void, __cancel: () => void };