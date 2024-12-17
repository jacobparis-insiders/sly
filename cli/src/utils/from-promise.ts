const controllerMap = new WeakMap()
const XSTATE_PROMISE_RESOLVE = "xstate.promise.resolve"
const XSTATE_PROMISE_REJECT = "xstate.promise.reject"
const XSTATE_STOP = "xstate.stop"
export function fromPromise(promiseCreator) {
  const logic = {
    config: promiseCreator,

    transition: (state, event, scope) => {
      if (state.status !== "active") {
        return state
      }

      scope.emit(event)

      switch (event.type) {
        case XSTATE_PROMISE_RESOLVE: {
          const resolvedValue = event.data
          return {
            ...state,
            status: "done",
            output: resolvedValue,
            input: undefined,
          }
        }
        case XSTATE_PROMISE_REJECT:
          return {
            ...state,
            status: "error",
            error: event.data,
            input: undefined,
          }
        case XSTATE_STOP: {
          controllerMap.get(scope.self)?.abort()
          return {
            ...state,
            status: "stopped",
            input: undefined,
          }
        }
        default: {
          return state
        }
      }
    },
    start: (state, { self, system, emit }) => {
      // TODO: determine how to allow customizing this so that promises
      // can be restarted if necessary
      if (state.status !== "active") {
        return
      }
      const controller = new AbortController()
      controllerMap.set(self, controller)
      const resolvedPromise = Promise.resolve(
        promiseCreator({
          input: state.input,
          system,
          self,
          signal: controller.signal,
          emit,
        }),
      )
      resolvedPromise.then(
        (response) => {
          if (self.getSnapshot().status !== "active") {
            return
          }
          controllerMap.delete(self)
          system._relay(self, self, {
            type: XSTATE_PROMISE_RESOLVE,
            data: response,
          })
        },
        (errorData) => {
          if (self.getSnapshot().status !== "active") {
            return
          }
          controllerMap.delete(self)
          system._relay(self, self, {
            type: XSTATE_PROMISE_REJECT,
            data: errorData,
          })
        },
      )
    },
    getInitialSnapshot: (_, input) => {
      return {
        status: "active",
        output: undefined,
        error: undefined,
        input,
      }
    },
    getPersistedSnapshot: (snapshot) => snapshot,
    restoreSnapshot: (snapshot) => snapshot,
  }
  return logic
}
