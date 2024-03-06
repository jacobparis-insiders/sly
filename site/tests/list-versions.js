import fs from "fs"

const versions = await fetchSupportedVersions()

fs.writeFileSync("tests/versions.json", JSON.stringify(versions, null, 2))
console.log("versions.json has been updated.")

async function fetchSupportedVersions() {
  try {
    const data = await fetch("https://registry.npmjs.org/@sly-cli/sly").then(
      (response) => response.json()
    )

    return Object.keys(data.versions)
  } catch (error) {
    console.error("Error fetching versions:", error)
    process.exit(1)
  }
}
