class Observable {
  constructor(subscriber) {
    this.subscriber = subscriber
  }

  subscribe(observer) {
    const subscription = this.subscriber({
      next: (value) => observer.next?.(value),
      error: (err) => observer.error?.(err),
      complete: () => observer.complete?.(),
    })

    return {
      unsubscribe: () => {
        subscription?.()
      },
    }
  }
}

export function createFetchObservable({
  url,
  options,
}: {
  url: string
  options?: RequestInit
}) {
  return new Observable((subscriber) => {
    const controller = new AbortController()

    async function startFetch() {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        if (!response.ok)
          throw new Error(`Fetch failed: ${response.statusText}`)
        if (!response.body) throw new Error("No response body")

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            subscriber.complete()
            break
          }

          console.log("Raw chunk:", value) // Log
          const chunk = decoder.decode(value, { stream: true })
          console.log("Decoded chunk:", chunk)
          subscriber.next(chunk)
        }
      } catch (error) {
        subscriber.error(error)
      }
    }

    startFetch()

    return () => {
      controller.abort()
    }
  })
}
