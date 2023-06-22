 /**
 * @type TContext
 * @field eventId {number} The event id of the current dispatch
 * @field instanceId {number} The instance id of the current dispatch
 */
  type TContext<U> = {
    eventId: number;
    instanceId?: number;
  } & U;

  /**
   * @type THandlerCallback
   * @field event {TBusEvent} The event object
   * @description The callback function that will be called when the event is dispatched
   * */
  type THandlerCallback<T, U> = (event: TBusEvent<T, U>) => void | Promise<T>;

  /**
   * @type THandler
   * @field id {number} The unique event handler Id
   * @field callback {THandlerCallback} The callback function that will be called when the event is dispatched
   * @field once {boolean} If true, the handler will be removed after the first dispatch
   * @description The callback function that will be called when the event is dispatched
   */
  type THandler<T,U> = {
    id       : number;
    callback : THandlerCallback<T, U>;
    once     : boolean;
  };

  /**
   * Used when doing a full emit call withou t using the Emitter wrapper
   * @type TEmitParams
   */
  export type TEmitParams<T, U> = {
    /**
     * @field busStakOrder {TBusStackOrder?} If true, will stack the event to be processed with high priority in the stack
     */
    isPrioritizedOnStack  ?: boolean;
    singleTransaction     ?: boolean;
  } & TBusEvent<T, U>;

  /**
   * @type CancelEvent
   * @field id {string} The current unique event handler Id
   * @method off {() => boolean | void} Method used to cancel or clear the handler
   */
  export type CancelEvent = {
    id  : number;
    off : () => boolean | void;
  };

  /**
   * This type define the object used as a context of an event lifecycle
   * @type TBusEvent
   */
  export type TBusEvent<T, U> = {
    /**
     * @field eventName {string} The event name for the current dispatch
     */
    eventId: number;

    /**
     * @field instanceId {number} The instance id of the current dispatch
     * @default 0
     * @description If the event is dispatched from a class instance, the instance id will be used
     * in order to avoid conflicts with other instances
     * If the event is dispatched from a global context, the instance id will be 0
     * */
    instanceId?: number;
    /**
     * An object that can contains any information
     */
    context?: TContext<U>;
    /**
     * @field payload {T} A generic object that represent event data
     */
    payload?: T;
  };

  export class EventBus {
    static  CATCH_ALL_EVENT   = -1;
    private guidIndex         = 0;
    private _events           = new Map<number,(Map<number, (Map<number, THandler<unknown, unknown>>)>)>();
    private emitStack         = [] as TEmitParams<unknown, unknown>[];
    private emitStackIndex    = 0;
    private emitPriorityStack = [] as TEmitParams<unknown, unknown>[];
    private hasAllEvent       = false;

    on<T, U>({eventId, callback, once = false, instanceId = 0}:{eventId: number, callback: THandlerCallback<T, U>, once?: boolean, instanceId?: number}) {
      eventId === EventBus.CATCH_ALL_EVENT && (this.hasAllEvent = true);

      !this._events.has(instanceId)
        && this._events.set(instanceId, new Map<number, (Map<number, THandler<unknown, unknown>>)>());
      !this._events.get(instanceId)!.has(eventId)
        && this._events.get(instanceId)!.set(eventId, new Map<number, THandler<unknown, unknown>>());

      const fullHandler: THandler<unknown, unknown> = {
        id       : this.guidIndex++,
        callback : callback as THandlerCallback<unknown, unknown>,
        once
      };
      this._events.get(instanceId)!.get(eventId)!.set(fullHandler.id, fullHandler);

      return {
        id: fullHandler.id,
        off: () => this._events.get(instanceId)?.get(eventId)?.delete(fullHandler.id)
      };
    }

    emit<T, U>(emitParams: TEmitParams<T, U>) {
      if (emitParams?.isPrioritizedOnStack) {
        if (this.emitStack.length) {
          /*const current = this.emitStack.shift();
          this.emitStack.unshift(emitParams);
          this.emitStack.unshift(current!);*/
          this.emitPriorityStack.push(emitParams);
        } else {
          this.emitStack.push(emitParams);
        }
      } else {
        this.emitStack.push(emitParams);
      }

      if (this.emitStack.length > 1 || this.emitPriorityStack.length > 1) {
        return;
      }

      do {
        const nextEmitParam = this.emitPriorityStack.length
          ? this.emitPriorityStack.pop()!
          : this.emitStack[this.emitStackIndex++];

        const { eventId, payload, context, instanceId = 0, singleTransaction = false } = nextEmitParam!;

        const event = {
          eventId,
          instanceId,
          context,
          payload
        };

        if (singleTransaction) {
          const v = this._events.get(instanceId)?.get(eventId)?.get(0);
          if (!v) {
            continue;
          }
          v.callback(event);
          v.once && this._events.get(instanceId)!.get(eventId)?.delete(0);
        }
        else {
          this._events.get(instanceId)?.get(eventId)?.forEach((v, k, m) => {
            v.callback(event);
            v.once && m.delete(k);
          });
        }

        // Catch all event
        //TODO: creates a flag in order to avoid this check
        this.hasAllEvent && this._events.get(instanceId)!.get(EventBus.CATCH_ALL_EVENT)?.forEach((v, k, m) => {
          v.callback(event);
          v.once && m.delete(k);
        });

      } while (this.emitStack.length > this.emitStackIndex && !this.emitPriorityStack.length);
      this.emitStackIndex   = 0;
      this.emitStack.length = 0;
    }

    clear() {
      this.emitStack.length = 0;
      this._events.clear();
    }
  }

  export const evtBus = new EventBus();
