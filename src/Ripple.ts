import { createRipple, fullImmutable } from "./utils/Immutable";
import { useState, useEffect } from "react";
import { rippleBus } from "./core/RippleBus";
import { UuidV4 } from "./utils/UuidV4";

let globalRoutingKey = 0;
/**
 * Extracts keys from an object and generates corresponding type definitions with key names prefixed with "use".
 * @template T The type of the input object.
 * @param {T} obj The input object from which to extract keys.
 * @returns {RippleKeyExtractor<T>} An object with generated type definitions.
 */
type RippleKeyExtractor<T extends object> = {
  [K in keyof T as `use${Capitalize<string & K>}`]: ()
    => [ReturnType<typeof createRipple<T[K]>>, (action?: "restore" | "reset" | "replace", replaceValue?: T[K])
      => void];
};

/**
 * Extracts keys from an object and generates corresponding type definitions with key names prefixed with "get".
 * @template T The type of the input object.
 * @param {T} obj The input object from which to extract keys.
 * @returns {RippleUpdaterKeyExtractor<T>} An object with generated type definitions.
 */
type RippleUpdaterKeyExtractor<T extends object> = {
  [K in keyof T as `update${Capitalize<string & K>}`]: ()
    => (updateHandler ?: (ripple: ReturnType<typeof createRipple<T[keyof T]>>) => "restore" | "reset" | T[keyof T] | void)
      => ReturnType<typeof createRipple<T[keyof T]>>;
};

/**
 * Creates type definitions with normalized keys for an input object.
 * @template T The type of the input object.
 * @param {T} source The input object from which to create type definitions.
 * @returns {RippleKeyExtractor<T>} An object with generated type definitions.
 */
function _createRipples<T extends object>(source: T): [RippleKeyExtractor<T>, RippleUpdaterKeyExtractor<T>] {
  const useRipples: any     = {};
  const updateRipples: any  = {};
  const internalRepo        = new Map<number, any>();
  const internalInitialRepo = new Map<number, any>();
  const internalRippleRepo  = new Map<number, any>();

  for (const key in source) {
    const useKey    = `use${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    const updateKey = `update${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    internalRepo.set(globalRoutingKey, source[key]);
    internalInitialRepo.set(globalRoutingKey, JSON.parse(JSON.stringify(source[key])));

    useRipples[useKey] = ((_globalRoutingKey: number) => (() => {
      // TODO : Add consumerId to the rippleBus.
      let ripple: ReturnType<typeof createRipple<T[keyof T]>>;
      if (internalRippleRepo.has(_globalRoutingKey)) {
        ripple = internalRippleRepo.get(_globalRoutingKey);
        fullImmutable(ripple)?.__cancel?.();
      } else {
        ripple = createRipple(internalRepo.get(_globalRoutingKey), _globalRoutingKey);
        internalRippleRepo.set(_globalRoutingKey, ripple);
      }

      const [_rippleUpdateCounter, setRippleUpdateCounter] = useState(0);
      const [uniqueStateId] = useState(UuidV4());

      useEffect(() => {
        const rippleEventHandler = rippleBus.on<number, unknown>({eventId: _globalRoutingKey, callback: () => {
          setRippleUpdateCounter(_ => _ + 1);
        }});

        return () => {
          // TODO : Remove consumerId from the rippleBus.
          rippleEventHandler.off();
        }
      }, []);

      return [ripple, (action?: "restore" | "reset" | "replace", replaceValue?: T[keyof T]) => {
        if (action === "restore") {
          fullImmutable(ripple)?.__cancel?.();
        } else if (action === "reset") {
          // Reset the ripple.
          internalRepo.set(_globalRoutingKey, JSON.parse(JSON.stringify(internalInitialRepo.get(_globalRoutingKey))));
          internalRippleRepo.delete(_globalRoutingKey); // Delete the ripple.
          rippleBus.emit({eventId: _globalRoutingKey}); // Emit the ripple event.
        } else if (action === "replace") {
          // Replace the ripple, if the value is not defined we will reset instead.
          internalRepo.set(_globalRoutingKey, replaceValue ?? JSON.parse(JSON.stringify(internalInitialRepo.get(_globalRoutingKey))));
          internalRippleRepo.delete(_globalRoutingKey); // Delete the ripple.
          rippleBus.emit({eventId: _globalRoutingKey}); // Emit the ripple event.
        } else {
          (ripple as any)?.__applyInternal?.();
        }
      }];
    }))(globalRoutingKey);

    updateRipples[updateKey] = ((_globalRoutingKey: number) => {
      return () => {
        let ripple: ReturnType<typeof createRipple<T[keyof T]>>;

        const updateRipple = () => {
          if (internalRippleRepo.has(_globalRoutingKey)) {
            ripple = internalRippleRepo.get(_globalRoutingKey);
            fullImmutable(ripple)?.__cancel?.();
          } else {
            ripple = createRipple(internalRepo.get(_globalRoutingKey), _globalRoutingKey);
            internalRippleRepo.set(_globalRoutingKey, ripple);
          }
        }

        updateRipple();

        return (updateHandler?: (ripple: ReturnType<typeof createRipple<T[keyof T]>>) => "restore" | "reset" | T[keyof T] | void) => {
          if (!updateHandler) {
            updateRipple();
            return createRipple(internalRepo.get(_globalRoutingKey), _globalRoutingKey);
          }

          const res = updateHandler(ripple as ReturnType<typeof createRipple<T[keyof T]>>);
          switch (res) {
            case "restore":
              fullImmutable(ripple)?.__cancel?.();
              break;
            case "reset":
              // Reset the ripple.
              internalRepo.set(_globalRoutingKey, JSON.parse(JSON.stringify(internalInitialRepo.get(_globalRoutingKey))));
              internalRippleRepo.delete(_globalRoutingKey); // Delete the ripple.
              rippleBus.emit({eventId: _globalRoutingKey}); // Emit the ripple event.
              updateRipple();
              break;
            default:
              if(res !== undefined) {
                // Replace the ripple, if the value is not defined we will reset instead.
                internalRepo.set(_globalRoutingKey, JSON.parse(JSON.stringify(internalInitialRepo.get(_globalRoutingKey))));
                internalRippleRepo.delete(_globalRoutingKey); // Delete the ripple.
                rippleBus.emit({eventId: _globalRoutingKey}); // Emit the ripple event.
                updateRipple();
                return createRipple(res, _globalRoutingKey);
              }
              fullImmutable(ripple)?.__applyInternal?.();
              break;
          }
          return ripple as ReturnType<typeof createRipple<T[keyof T]>>;
        };
      }
    })(globalRoutingKey);
    globalRoutingKey++;
  }

  return [useRipples as RippleKeyExtractor<T>, updateRipples as RippleUpdaterKeyExtractor<T>];
}

export const createRipples = _createRipples;