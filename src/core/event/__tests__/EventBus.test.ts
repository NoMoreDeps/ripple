import { EventBus } from '../EventBus';

describe('EventBus', () => {
	let eventBus: EventBus;
	let handler: jest.Mock;

	beforeEach(() => {
		eventBus = new EventBus();
		handler = jest.fn();
	});

	afterEach(() => {
		eventBus.clear();
	});

	test('on method should correctly add an event handler to the _events map', () => {
		const eventId = 1;
		const instanceId = 2;
		const subscription = eventBus.on({ eventId, callback: handler, instanceId });

		expect(eventBus["_events"].get(instanceId)?.get(eventId)?.size).toBe(1);
		expect(subscription.id).toBeGreaterThanOrEqual(0);
	});

	test('on method should correctly set the hasAllEvent flag if the eventId is the catch-all event', () => {
		const eventId = EventBus.CATCH_ALL_EVENT;
		const subscription = eventBus.on({ eventId, callback: handler });

		expect(eventBus["hasAllEvent"]).toBe(true);
		expect(subscription.id).toBeGreaterThanOrEqual(0);
	});

	test('on method should return an object with the correct id and off function', () => {
		const eventId = 1;
		const subscription = eventBus.on({ eventId, callback: handler });

		expect(subscription.id).toBeGreaterThanOrEqual(0);
		expect(subscription.off).toBeInstanceOf(Function);
	});

	test('emit method should correctly add the emit params to the emitStack', () => {
		const eventId = 1;
		const payload = { data: 'test' };
		eventBus.emit({ eventId, payload });

		expect(eventBus["emitStack"].length).toBe(0);
		expect(eventBus["emitStack"][0]).toEqual(undefined);
	});

	test('emit method should correctly emit events with the given payload and context', () => {
		const eventId = 1;
		const payload = { data: 'test' };
		const context = undefined;
		eventBus.on({ eventId, callback: handler });
		eventBus.emit({ eventId, payload, context });

		expect(handler).toHaveBeenCalledWith({ eventId, payload, context, instanceId: 0 });
	});

	test('emit method should correctly call the catch-all event handler', () => {
		const eventId = 1;
		const payload = { data: 'test' };
		const context = undefined;
		eventBus.on({ eventId: EventBus.CATCH_ALL_EVENT, callback: handler });
		eventBus.emit({ eventId, payload, context });

		expect(handler).toHaveBeenCalledWith({ eventId, payload, context, instanceId: 0 });
	});

	test('clear method should correctly clear the emitStack and _events map', () => {
		const eventId = 1;
		eventBus.on({ eventId, callback: handler });
		eventBus.emit({ eventId, payload: {} });
		eventBus.clear();

		expect(eventBus["_events"].size).toBe(0);
		expect(eventBus["emitStack"].length).toBe(0);
	});

	test('emit method should correctly handle single transaction', () => {
		const eventId = 1;
		const payload = { data: 'test' };
		const context = undefined;
		const handler = jest.fn();
		eventBus.on({ eventId, callback: handler });
		eventBus.emit({ eventId, payload, context, singleTransaction: true });

		expect(handler).toHaveBeenCalledWith({ eventId, payload, context, instanceId: 0 });
	});

	test('emit method should correctly handle prioritized emit', () => {
		const eventId = 1;
		const payload = { data: 'test' };
		const context = undefined;
		eventBus.on({ eventId, callback: handler });
		eventBus.emit({ eventId, payload, context, isPrioritizedOnStack: true });

		expect(eventBus["emitPriorityStack"].length).toBe(0);
		expect(eventBus["emitPriorityStack"][0]).toEqual(undefined);
	});

	test('off method should remove event from _events map', () => {
		const eventBus = new EventBus();
		const eventId = 1;
		const handler = jest.fn();
		const resEvt = eventBus.on({ eventId, callback: handler });
		resEvt.off();

		eventBus.emit({ eventId, payload: {} });

		expect(handler).not.toHaveBeenCalled();
	});

	test('emit method should prioritize events on the emit stack', () => {
		const eventBus = new EventBus();
		const eventPool = [] as number[];

		const handler1 = () => { eventBus.emit(emitParams2); eventPool.push(1); }
		const handler2 = () => { eventBus.emit(emitParams3); eventPool.push(2); }
		const handler3 = () => { eventPool.push(3); }
		let emitParams1 = { eventId: 1, payload: 'test1' };
		let emitParams2 = { eventId: 2, payload: 'test2', isPrioritizedOnStack: true };
		let emitParams3 = { eventId: 3, payload: 'test3', isPrioritizedOnStack: true };

		eventBus.on({ eventId: 1, callback: handler1 });
		eventBus.on({ eventId: 2, callback: handler2 });
		eventBus.on({ eventId: 3, callback: handler3 });

		eventBus.emit(emitParams1);

		expect(eventPool).toEqual([3, 2, 1]);

		emitParams2.isPrioritizedOnStack = false;
		emitParams3.isPrioritizedOnStack = false;

		eventPool.length = 0;

		eventBus.emit(emitParams1);

		expect(eventPool).toEqual([1, 2, 3]);
	});

	// Single transaction tests
	test('emit method should correctly handle single transaction', () => {
		const eventBus = new EventBus();

		const handler1 = jest.fn();
		const handler2 = jest.fn();

		eventBus.on({ eventId: 1, callback: handler1, instanceId: 1 });
		eventBus.on({ eventId: 1, callback: handler2, instanceId: 1 });

		eventBus.emit({
			eventId: 1,
			instanceId: 1,
			payload: {},
			singleTransaction: true
		});

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(0);
	});

	test('emit method should continue if transaction fails', () => {
		const eventBus = new EventBus();

		const handler1 = jest.fn();
		const handler2 = jest.fn();

		eventBus.on({ eventId: 1, callback: handler1, instanceId: 1 });
		eventBus.on({ eventId: 1, callback: handler2, instanceId: 1 });
		eventBus.on({ eventId: 2, callback: handler2 });

		eventBus.emit({
			eventId: 1,
			instanceId: 0,
			payload: {},
			singleTransaction: true
		});

		eventBus.emit({
			eventId: 2,
			payload: {},
		});

		expect(handler1).toHaveBeenCalledTimes(0);
		expect(handler2).toHaveBeenCalledTimes(1);
	});

	// Test once
	test('once method should correctly add the event to the _events map', () => {
		const eventBus = new EventBus();
		const eventId = 1;
		const handler = jest.fn();
		eventBus.on({ eventId, callback: handler, once: true });

		eventBus.emit({ eventId, payload: {} });
		eventBus.emit({ eventId, payload: {} });

		expect(handler).toHaveBeenCalledTimes(1);
	});

	test('once method should correctly add the event to the _events map for all events', () => {
		const eventBus = new EventBus();
		const eventId = 1;
		const handler = jest.fn();
		eventBus.on({ eventId: EventBus.CATCH_ALL_EVENT, callback: handler, once: true });

		eventBus.emit({ eventId, payload: {} });
		eventBus.emit({ eventId, payload: {} });

		expect(handler).toHaveBeenCalledTimes(1);
	});

	test('once method should correctly add the event to the _events map for single transaction', () => {
		const eventBus = new EventBus();
		const eventId = 1;
		const handler = jest.fn();
		eventBus.on({ eventId, callback: handler, once: true });

		eventBus.emit({ eventId, payload: {}, singleTransaction: true });
		eventBus.emit({ eventId, payload: {}, singleTransaction: true });

		expect(handler).toHaveBeenCalledTimes(1);
	});

});
