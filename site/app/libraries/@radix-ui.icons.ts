// RadixUI Icons class with getIndex and getItem methods

export default class Icons implements SlyLibrary {
  namespace = "radix-ui"
  library = "icons"

  getIndex() {
    return this.icons
  }

  getItem(name) {
    return this.icons.find((icon) => icon.name === name)
  }
}

interface SlyLibrary {
  getIndex(): unknown[]
  getItem(name: string): unknown
}
