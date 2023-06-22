import { createRipples } from "../Ripple";
import * as React from "react";
import {act, fireEvent, render, waitFor} from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";

describe("createRipples", () => {
  it("should create a new Ripple", () => {
      const [useRipple, getRipple] = createRipples({
        state1: {
          a: 1,
        }
      });

      expect(getRipple).toBeDefined();
  });

  it("should create a new Ripple with initial state", () => {
    const [_rippleState, getRippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const state1 = getRippleState.updateState1();
    const state1Clone = getRippleState.updateState1();

    expect(state1(_ => { _.a = 2 }).a).toBe(2);
    expect(state1Clone(_ => "reset").a).toBe(1);
  });


  it("should remplace a ripple", () => {
    const [rippleState, getRippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const state1 = getRippleState.updateState1();

    const res = state1(_ => ({ a: 2 }));

    expect(res.a).toBe(2);
  });

  it("should create a hook", () => {
    const [rippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1] = rippleState.useState1();

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);
    expect(getByTestId("1")).toBeDefined();
  });

  it("should be updated using the hook", () => {
    const [rippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1, updateState1] = rippleState.useState1();

      React.useEffect(() => {
        state1.a = 2;
        updateState1();
      }, []);

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);
    expect(getByTestId("2")).toBeDefined();
  });


  it("should be updated using the external access", async () => {
    const [rippleState, getRippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1] = rippleState.useState1();
      console.log("refresh", state1.a);

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);
    expect(getByTestId("1")).toBeDefined();

    const state1 = getRippleState.updateState1();

    await act(async () => {
      state1(_ =>{ _.a = 2});
    });

    await waitFor(() => expect(getByTestId("2")).toBeDefined());
  });


  it("should be cancelled using the external access", async () => {
    const [rippleState, getRippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1] = rippleState.useState1();

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);
    expect(getByTestId("1")).toBeDefined();

    const state1 = getRippleState.updateState1();
    await act(() => {
      state1(_ =>{ _.a = 2});
    });

    await waitFor(() => expect(getByTestId("2")).toBeDefined());


    await act(() => {
      state1(_ => {
        _.a = 3;
        return "restore";
      });

    });

    await waitFor(() => expect(getByTestId("2")).toBeDefined());

  });

  it("should be cancelled using the hook", async () => {
    const [rippleState, getRippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1, updateState1] = rippleState.useState1();

      React.useEffect(() => {
        state1.a = 2;
        updateState1("restore");
      }, []);

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);
    expect(getByTestId("1")).toBeDefined();

    const state1 = getRippleState.updateState1();

    await act(async () => {
      state1(_ =>{ _.a = 2});
    });

    await waitFor(() => expect(getByTestId("2")).toBeDefined());

    await act(async () => {
      state1(_ => {
        _.a = 3;
        return "restore";
      })
    });

    await waitFor(() => expect(getByTestId("2")).toBeDefined());
  });

  it("should be reset using the hook", async () => {
    const [rippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1, updateState1] = rippleState.useState1();

      React.useEffect(() => {
        state1.a = 2;
        updateState1();
        updateState1("reset");
      }, []);

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);
    expect(getByTestId("1")).toBeDefined();

    await waitFor(() => expect(getByTestId("1")).toBeDefined());
  });

  it("should be replace using the hook", async () => {
    const [rippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1, updateState1] = rippleState.useState1();

      React.useEffect(() => {
       updateState1("replace", {a: 2});
      }, []);

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);

    await waitFor(() => expect(getByTestId("2")).toBeDefined(), {timeout: 1000});
  });

  it("should be reset instead of replace using the hook if teh replace value is not provided", async () => {
    const [rippleState] = createRipples({
      state1: {
        a: 1,
      }
    });

    const ReactCmp = () => {
      const [state1, updateState1] = rippleState.useState1();

      React.useEffect(() => {
        state1.a = 3;
        updateState1("replace");
      }, []);

      return <div data-testid={state1.a}>test</div>;
    }

    const { getByTestId } = render(<ReactCmp />);

    await waitFor(() => expect(getByTestId("1")).toBeDefined(), {timeout: 1000});
  });

  it("should return the ripple if no parameter is provided", async () => {
    const lake = createRipples({
      state1: {
        a: 1,
      }
    });

    const state1 = lake[1].updateState1();
    const ripple = state1();

    expect(state1).toBeDefined();
    expect(ripple).toBeDefined();
    expect(ripple.a).toBe(1);
  });

  it("should be able to use an external proxy after reset", async () => {
    const lake = createRipples({
      state1: {
        a: 1,
      }
    });

    let state1 = lake[1].updateState1();
    expect(state1().a).toBe(1);
    state1(_ => {_.a = 2});
    expect(state1().a).toBe(2);
    state1(_ => "reset");
    expect(state1().a).toBe(1);
    state1(_ => {_.a = 3});
    expect(state1().a).toBe(3);
    state1 = lake[1].updateState1();
    state1(_ => {_.a = 4});
    state1 = lake[1].updateState1();
    expect(state1().a).toBe(4);
  });

  it("Should sync properly at first dynamic call", async () => {


    const lake = createRipples({
      counter: { count: 0 }
    });

    const {useCounter} = lake[0];
    const services = lake[1];

    const MyComponent = () => {
      const [{ count }] = useCounter();

      return (
        <div>
          <p data-testid="countId">{count}</p>

          <button
          data-testid="increment"
            onClick={() => counterService.increment()}
          >Increment</button>

          <button
            data-testid="reset"
            onClick={() => counterService.reset()}
          >Reset</button>
        </div>
      );
    };

    class CounterService {

      get counter() {
        return services.updateCounter();
      }

      /**
       * Increment the counter
       * @returns {void}
       */
      increment() {
        this.counter(_ => { _.count++ });
      }

      /**
       * Decrement the counter
       * @returns {void}
       */
      reset() {
        this.counter(_ => "reset");
      }
    }

    const counterService = new CounterService();

    const { getByTestId } = render(<MyComponent />);
    expect(getByTestId("countId").textContent).toBe("0");

    fireEvent.click(getByTestId("increment"));
    expect(getByTestId("countId").textContent).toBe("1");


  });

});