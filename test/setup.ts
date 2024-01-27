export default function setup() {
  process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.log(`FAILED TO HANDLE PROMISE REJECTION`)
    throw reason
  })
}
