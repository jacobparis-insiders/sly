import { ansiToDiff } from "./ansi-to-diff"
import { describe, expect, test } from "vitest"

describe("ansiToDiff", () => {
  test("should strip ANSI escape codes", () => {
    const output =
      ansiToDiff(`[2m40 [0m   [1mconst[0m [1mInputOTPSlot[0m [1m=[0m [1mReact[0m.forwardRef[1m<[0m
[2m41 [0m       [1m<[0mdiv
[2m42 [0m         ref[1m=[0m{ref}
[2m43 [0m         className[1m=[0m{cn(
[91;1m44 [0m           [91m'[0m[91mrelative[0m[91m [0m[91mflex[0m[91m [0m[91mh[0m[91m-[0m[91m10[0m[91m [0m[91mw[0m[91m-[0m[91m10[0m[91m [0m[91mitems[0m[91m-[0m[91mcenter[0m[91m [0m[91mjustify[0m[91m-[0m[91mcenter[0m[91m [0m[91mborder[0m[91m-[0m[91my[0m[91m [0m[91mborder[0m[91m-[0m[91mr[0m[91m [0m[91mborder[0m[91m-[0m[91minput[0m[91m [0m[91mtext[0m[91m-[0m[91mbase[0m[91m [0m[91;1;4mmd[0m[91;1;4m:[0m[91;1;4mtext[0m[91;1;4m-[0m[91;1;4msm[0m [91mtransition[0m[91m-[0m[91mall[0m[91m [0m[91mfirst[0m[91m:[0m[91mrounded[0m[91m-[0m[91ml[0m[91m-[0m[91mmd[0m[91m [0m[91mfirst[0m[91m:[0m[91mborder[0m[91m-[0m[91ml[0m[91m [0m[91mlast[0m[91m:[0m[91mrounded[0m[91m-[0m[91mr[0m[91m-[0m[91mmd[0m[91m'[0m,
   [92;1m44 [0m        [92m'[0m[92mrelative[0m[92m [0m[92mflex[0m[92m [0m[92mh[0m[92m-[0m[92m10[0m[92m [0m[92mw[0m[92m-[0m[92m10[0m[92m [0m[92mitems[0m[92m-[0m[92mcenter[0m[92m [0m[92mjustify[0m[92m-[0m[92mcenter[0m[92m [0m[92mborder[0m[92m-[0m[92my[0m[92m [0m[92mborder[0m[92m-[0m[92mr[0m[92m [0m[92mborder[0m[92m-[0m[92minput[0m[92m [0m[92mtext[0m[92m-[0m[92mbase[0m[92m [0m[92mtransition[0m[92m-[0m[92mall[0m[92m [0m[92mfirst[0m[92m:[0m[92mrounded[0m[92m-[0m[92ml[0m[92m-[0m[92mmd[0m[92m [0m[92mfirst[0m[92m:[0m[92mborder[0m[92m-[0m[92ml[0m[92m [0m[92mlast[0m[92m:[0m[92mrounded[0m[92m-[0m[92mr[0m[92m-[0m[92mmd[0m [92;1;4mmd[0m[92;1;4m:[0m[92;1;4mtext[0m[92;1;4m-[0m[92;1;4msm[0m[92m'[0m,
   [2m45 [0m        isActive [1m&&[0m [95m'z-10 ring-2 ring-ring ring-offset-background'[0m,
   [2m46 [0m        className,
   [2m47 [0m      )}`)

    // Check that ANSI escape codes are stripped
    expect(output).not.toContain("\x1b[")
    expect(output).not.toMatch(/\[\d+(?:;\d+)*m/)
  })

  test("should replace entirely green lines with +", () => {
    const input = "\x1b[32mThis line is green\x1b[0m"
    const output = ansiToDiff(input)
    expect(output).toBe("+ This line is green")
  })

  test("should replace entirely red lines with -", () => {
    const input = "\x1b[31mThis line is red\x1b[0m"
    const output = ansiToDiff(input)
    expect(output).toBe("- This line is red")
  })

  test("should correctly handle full lines", () => {
    const input = "\x1b[32;1;4mThis is a full green line with underline\x1b[0m"
    const output = ansiToDiff(input)
    expect(output).toBe("+ [+ This is a full green line with underline +]")

    const input2 = "\x1b[31;1;4mThis is a full red line with underline\x1b[0m"
    const output2 = ansiToDiff(input2)
    expect(output2).toBe("- [- This is a full red line with underline -]")
  })

  test("diff markers go after the line number", () => {
    const input = "[2m40[0m \x1b[32mThis is a green line\x1b[0m"
    const output = ansiToDiff(input)
    expect(output).toBe("40 + This is a green line")

    const input2 = "[2m41[0m \x1b[31mThis is a red line\x1b[0m"
    const output2 = ansiToDiff(input2)
    expect(output2).toBe("41 - This is a red line")

    const input3 = "[2m42[0m This is a normal line"
    const output3 = ansiToDiff(input3)
    expect(output3).toBe("42   This is a normal line")
  })

  test("does big diff", () => {
    const input =
      "\n" +
      "\x1B[2m40 \x1B[0m   \x1B[1mconst\x1B[0m \x1B[1mInputOTPSlot\x1B[0m \x1B[1m=\x1B[0m \x1B[1mReact\x1B[0m.forwardRef\x1B[1m<\x1B[0m\n" +
      "\x1B[2m41 \x1B[0m       \x1B[1m<\x1B[0mdiv\n" +
      "\x1B[2m42 \x1B[0m         ref\x1B[1m=\x1B[0m{ref}\n" +
      "\x1B[2m43 \x1B[0m         className\x1B[1m=\x1B[0m{cn(\n" +
      "\x1B[91;1m44 \x1B[0m           \x1B[91m'\x1B[0m\x1B[91mrelative\x1B[0m\x1B[91m \x1B[0m\x1B[91mflex\x1B[0m\x1B[91m \x1B[0m\x1B[91mh\x1B[0m\x1B[91m-\x1B[0m\x1B[91m10\x1B[0m\x1B[91m \x1B[0m\x1B[91mw\x1B[0m\x1B[91m-\x1B[0m\x1B[91m10\x1B[0m\x1B[91m \x1B[0m\x1B[91mitems\x1B[0m\x1B[91m-\x1B[0m\x1B[91mcenter\x1B[0m\x1B[91m \x1B[0m\x1B[91mjustify\x1B[0m\x1B[91m-\x1B[0m\x1B[91mcenter\x1B[0m\x1B[91m \x1B[0m\x1B[91mborder\x1B[0m\x1B[91m-\x1B[0m\x1B[91my\x1B[0m\x1B[91m \x1B[0m\x1B[91mborder\x1B[0m\x1B[91m-\x1B[0m\x1B[91mr\x1B[0m\x1B[91m \x1B[0m\x1B[91mborder\x1B[0m\x1B[91m-\x1B[0m\x1B[91minput\x1B[0m\x1B[91m \x1B[0m\x1B[91mtext\x1B[0m\x1B[91m-\x1B[0m\x1B[91mbase\x1B[0m\x1B[91m \x1B[0m\x1B[91;1;4mmd\x1B[0m\x1B[91;1;4m:\x1B[0m\x1B[91;1;4mtext\x1B[0m\x1B[91;1;4m-\x1B[0m\x1B[91;1;4msm\x1B[0m \x1B[91mtransition\x1B[0m\x1B[91m-\x1B[0m\x1B[91mall\x1B[0m\x1B[91m \x1B[0m\x1B[91mfirst\x1B[0m\x1B[91m:\x1B[0m\x1B[91mrounded\x1B[0m\x1B[91m-\x1B[0m\x1B[91ml\x1B[0m\x1B[91m-\x1B[0m\x1B[91mmd\x1B[0m\x1B[91m \x1B[0m\x1B[91mfirst\x1B[0m\x1B[91m:\x1B[0m\x1B[91mborder\x1B[0m\x1B[91m-\x1B[0m\x1B[91ml\x1B[0m\x1B[91m \x1B[0m\x1B[91mlast\x1B[0m\x1B[91m:\x1B[0m\x1B[91mrounded\x1B[0m\x1B[91m-\x1B[0m\x1B[91mr\x1B[0m\x1B[91m-\x1B[0m\x1B[91mmd\x1B[0m\x1B[91m'\x1B[0m,\n" +
      "   \x1B[92;1m44 \x1B[0m        \x1B[92m'\x1B[0m\x1B[92mrelative\x1B[0m\x1B[92m \x1B[0m\x1B[92mflex\x1B[0m\x1B[92m \x1B[0m\x1B[92mh\x1B[0m\x1B[92m-\x1B[0m\x1B[92m10\x1B[0m\x1B[92m \x1B[0m\x1B[92mw\x1B[0m\x1B[92m-\x1B[0m\x1B[92m10\x1B[0m\x1B[92m \x1B[0m\x1B[92mitems\x1B[0m\x1B[92m-\x1B[0m\x1B[92mcenter\x1B[0m\x1B[92m \x1B[0m\x1B[92mjustify\x1B[0m\x1B[92m-\x1B[0m\x1B[92mcenter\x1B[0m\x1B[92m \x1B[0m\x1B[92mborder\x1B[0m\x1B[92m-\x1B[0m\x1B[92my\x1B[0m\x1B[92m \x1B[0m\x1B[92mborder\x1B[0m\x1B[92m-\x1B[0m\x1B[92mr\x1B[0m\x1B[92m \x1B[0m\x1B[92mborder\x1B[0m\x1B[92m-\x1B[0m\x1B[92minput\x1B[0m\x1B[92m \x1B[0m\x1B[92mtext\x1B[0m\x1B[92m-\x1B[0m\x1B[92mbase\x1B[0m\x1B[92m \x1B[0m\x1B[92mtransition\x1B[0m\x1B[92m-\x1B[0m\x1B[92mall\x1B[0m\x1B[92m \x1B[0m\x1B[92mfirst\x1B[0m\x1B[92m:\x1B[0m\x1B[92mrounded\x1B[0m\x1B[92m-\x1B[0m\x1B[92ml\x1B[0m\x1B[92m-\x1B[0m\x1B[92mmd\x1B[0m\x1B[92m \x1B[0m\x1B[92mfirst\x1B[0m\x1B[92m:\x1B[0m\x1B[92mborder\x1B[0m\x1B[92m-\x1B[0m\x1B[92ml\x1B[0m\x1B[92m \x1B[0m\x1B[92mlast\x1B[0m\x1B[92m:\x1B[0m\x1B[92mrounded\x1B[0m\x1B[92m-\x1B[0m\x1B[92mr\x1B[0m\x1B[92m-\x1B[0m\x1B[92mmd\x1B[0m \x1B[92;1;4mmd\x1B[0m\x1B[92;1;4m:\x1B[0m\x1B[92;1;4mtext\x1B[0m\x1B[92;1;4m-\x1B[0m\x1B[92;1;4msm\x1B[0m\x1B[92m'\x1B[0m,\n" +
      "   \x1B[2m45 \x1B[0m        isActive \x1B[1m&&\x1B[0m \x1B[95m'z-10 ring-2 ring-ring ring-offset-background'\x1B[0m,\n" +
      "   \x1B[2m46 \x1B[0m        className,\n" +
      "   \x1B[2m47 \x1B[0m      )}\n" +
      "\n"

    const output = ansiToDiff(input)
    expect(output).toMatchInlineSnapshot(`
      "40   const InputOTPSlot = React.forwardRef<
      41       <div
      42         ref={ref}
      43         className={cn(
      44 -         'relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-base [- md:text-sm -] transition-all first:rounded-l-md first:border-l last:rounded-r-md',
      44 +         'relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-base transition-all first:rounded-l-md first:border-l last:rounded-r-md [+ md:text-sm +]',
      45           isActive && 'z-10 ring-2 ring-ring ring-offset-background',
      46           className,
      47         )}"
    `)
  })

  test("should handle nested underlined sections", () => {
    const input = `
[91;1m15 [0m          [91m [0m[91;1;4mmd[0m[91;1;4m:[0m[91;1;4mtext[0m[91;1;4m-[0m[91;1;4msm[0m [91mring[0m[91m-[0m[91moffset[0m[91m-[0m[91mbackground[0m[91m [0m[91mfile[0m[91m:[0m[91mborder[0m[91m-[0m[91m0[0m[91m [0m[91mfile[0m[91m:[0m[91mbg[0m[91m-[0m[91mtransparent[0m[91m [0m[91mfile[0m[91m:[0m[91mtext[0m[91m-[0m[91mbase[0m[91m [0m[91;1;4mmd[0m[91;1;4m:[0m[91mfile[0m[91m:[0m[91;1;4mtext[0m[91;1;4m-[0m[91;1;4msm[0m [91;1;4mfile[0m[91;1;4m:[0m[91mfont[0m[91m-[0m[91mmedium[0m,
   [92;1m15 [0m       [92m [0m[92mring[0m[92m-[0m[92moffset[0m[92m-[0m[92mbackground[0m[92m [0m[92mfile[0m[92m:[0m[92mborder[0m[92m-[0m[92m0[0m[92m [0m[92mfile[0m[92m:[0m[92mbg[0m[92m-[0m[92mtransparent[0m[92m [0m[92mfile[0m[92m:[0m[92mtext[0m[92m-[0m[92mbase[0m[92m [0m[92mfile[0m[92m:[0m[92mfont[0m[92m-[0m[92mmedium[0m[92m [0m[92;1;4mmd[0m[92;1;4m:[0m[92;1;4mtext[0m[92;1;4m-[0m[92;1;4msm[0m [92;1;4mmd[0m[92;1;4m:[0m[92;1;4mfile[0m[92;1;4m:[0m[92;1;4mtext[0m[92;1;4m-[0m[92;1;4msm[0m[92m'[0m,
 `
    const output = ansiToDiff(input)
    expect(output).toMatchInlineSnapshot(`
      "15 -         [- [- md: -][- text-sm -] -] ring-offset-background [- file: -]border-0 file:bg-transparent file:text-base md:file:text-sm file:font-medium,
      15 +         ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium [+ md:text-sm +] [+ md:file:text-sm +]',"
    `)
  })

  test.only("test", () => {
    const input =
      "\n" +
      "\x1B[2m1 \x1B[0m   \x1B[1mimport\x1B[0m path \x1B[1mfrom\x1B[0m \x1B[95m'node:path'\x1B[0m\n" +
      "\x1B[2m2 \x1B[0m   \x1B[1mimport\x1B[0m fsExtra \x1B[1mfrom\x1B[0m \x1B[95m'fs-extra'\x1B[0m\n" +
      "\x1B[91;1m3 \x1B[0m   \x1B[1mimport\x1B[0m { afterAll, \x1B[91mafterEach\x1B[0m\x1B[91m,\x1B[0m \x1B[91mbeforeAll\x1B[0m } \x1B[1mfrom\x1B[0m \x1B[95m'vitest'\x1B[0m\n" +
      "\x1B[91;1m4 \x1B[0m   \x1B[91;1mimport\x1B[0m \x1B[91;1m{\x1B[0m \x1B[91mcleanupDb\x1B[0m \x1B[91;1m}\x1B[0m \x1B[91;1mfrom\x1B[0m \x1B[91m'#tests/db-utils.ts'\x1B[0m\n" +
      "\x1B[91;1m11 \x1B[0m   \x1B[91mbeforeAll\x1B[0m(\x1B[1masync\x1B[0m () \x1B[1m=>\x1B[0m {\n" +
      "\x1B[91;1m15 \x1B[0m   \x1B[91;3m// we *must* use dynamic imports here so the process.env.DATABASE_URL is set\x1B[0m\n" +
      "\x1B[91;1m16 \x1B[0m   \x1B[91;3m// before prisma is imported and initialized\x1B[0m\n" +
      "\x1B[91;1m17 \x1B[0m   \x1B[91mafterEach\x1B[0m\x1B[91;1m(\x1B[0m\x1B[91;1masync\x1B[0m \x1B[91;1m(\x1B[0m\x1B[91;1m)\x1B[0m \x1B[91;1m=>\x1B[0m \x1B[91;1m{\x1B[0m\n" +
      "\x1B[91;1m18 \x1B[0m     \x1B[91;1mawait\x1B[0m \x1B[91mcleanupDb\x1B[0m\x1B[91;1m(\x1B[0m\x1B[91;1m)\x1B[0m\n" +
      "\x1B[91;1m19 \x1B[0m   \x1B[91;1m}\x1B[0m\x1B[91;1m)\x1B[0m\n" +
      "   \x1B[92;1m3 \x1B[0m\x1B[1mimport\x1B[0m { afterAll, \x1B[92mbeforeEach\x1B[0m } \x1B[1mfrom\x1B[0m \x1B[95m'vitest'\x1B[0m\n" +
      "   \x1B[92;1m10 \x1B[0m\x1B[92mbeforeEach\x1B[0m(\x1B[1masync\x1B[0m () \x1B[1m=>\x1B[0m {\n" +
      "   \x1B[92;1m15 \x1B[0m  \x1B[92;3m// we *must* use dynamic imports here so the process.env.DATABASE_URL is set\x1B[0m\n" +
      "   \x1B[92;1m16 \x1B[0m  \x1B[92;3m// before prisma is imported and initialized\x1B[0m\n" +
      "   \x1B[2m17 \x1B[0m  \x1B[1mconst\x1B[0m { prisma } \x1B[1m=\x1B[0m \x1B[1mawait\x1B[0m \x1B[1mimport\x1B[0m(\x1B[95m'#app/utils/db.server.ts'\x1B[0m)\n" +
      "   \x1B[2m18 \x1B[0m  \x1B[1mawait\x1B[0m prisma.$disconnect()\n" +
      "   \x1B[2m19 \x1B[0m  \x1B[1mawait\x1B[0m fsExtra.remove(databasePath)\n" +
      "\n"

    const output = ansiToDiff(input)
    expect(output).toContain("1  import path from 'node:path'")
    // expect(output).toMatchInlineSnapshot(`
    //   "1   mport path from 'node:path'
    //   2   mport fsExtra from 'fs-extra'
    //   3 - mport { afterAll, afterEach, beforeAll } from 'vitest'
    //   4 - mport { cleanupDb } from '#tests/db-utils.ts'
    //   11 - beforeAll(async () => {
    //   15   // we *must* use dynamic imports here so the process.env.DATABASE_URL is set
    //   16   // before prisma is imported and initialized
    //   17 - afterEach(async () => {
    //   18 -   await cleanupDb()
    //   19 - })
    //   3 + mport { afterAll, beforeEach } from 'vitest'
    //   10 + beforeEach(async () => {
    //   15     // we *must* use dynamic imports here so the process.env.DATABASE_URL is set
    //   16     // before prisma is imported and initialized
    //   17     const { prisma } = await import('#app/utils/db.server.ts')
    //   18     await prisma.$disconnect()
    //   19     await fsExtra.remove(databasePath)"
    // `)
  })
})
