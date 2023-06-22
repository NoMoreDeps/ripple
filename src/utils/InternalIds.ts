import { TEmitParams } from "../core/event/EventBus";

let instanceIds = 0;
let eventIds    = 0;

export const getNextEventId    = () => ++eventIds;

type TInstanceTracker = {
  state       : number;
  eventBuffer : TEmitParams<unknown, unknown>[];
}
export const instanceTracker = new Map<number, TInstanceTracker>();


// Creates a function that takes a key values where the key is a string and the value is either a number, either the object itself
// Then return the same structure but for each final number, use the getNextInstanceId function to get a new number
// If the key value is different from 0, then it will not be replaced
// The function is idempotent
export type TEvent = {
  [key: string]: number | TEvent;
}

export const createEventsIds = <T extends TEvent>(obj: T): T => {
  const result: TEvent = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (typeof value === 'number') {
      result[key] = value === 0
      ? getNextEventId()
      : value;
    } else {
      result[key] = createEventsIds(value!);
    }
  }

  return result as T;
};
