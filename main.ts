#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { Codegen } from "./codegen.ts"
import { Tacky } from "./tacky.ts"
import { Validator } from "./validator.ts"

function test() {
    const args = process.argv.slice(2)

    let stage: string | undefined
    let location: string | undefined
    let compileOnly = false

    for (const argument of args) {
        if (argument === "-c") {
            compileOnly = true
        } else if (argument.startsWith("--")) {
            stage = argument
        } else if (location === undefined) {
            location = argument
        } else {
            throw new Error(`Unexpected argument: ${argument}`)
        }
    }

    if (!location) {
        console.error("Usage: ./main.ts <source-file>")
        process.exitCode = 1
    } else {
        const source = readFileSync(location, "utf8")
        switch (stage) {
            case "--lex": {
                const lexer = new Lexer(source)
                while (lexer.next().type !== "eof") {}
                break
            }

            case "--parse": {
                const parser = new Parser(new Lexer(source))
                parser.parse()
                break
            }

            case "--validate": {
                const validator = new Validator(
                    new Parser(new Lexer(source)).parse(),
                )
                validator.validate()
                break
            }

            case "--tacky": {
                const tacky = new Tacky(
                    new Validator(
                        new Parser(new Lexer(source)).parse(),
                    ).validate().program,
                )
                tacky.tackle()
                break
            }

            case "--codegen": {
                const codegen = new Codegen(
                    new Tacky(
                        new Validator(
                            new Parser(new Lexer(source)).parse(),
                        ).validate().program,
                    ).tackle(),
                )
                codegen.gen()
                break
            }

            default: {
                const codegen = new Codegen(
                    new Tacky(
                        new Validator(
                            new Parser(new Lexer(source)).parse(),
                        ).validate().program,
                    ).tackle(),
                )

                const assembly = codegen.gen()
                const parsed = path.parse(location)

                const assemblyPath = path.join(parsed.dir, `${parsed.name}.s`)
                writeFileSync(assemblyPath, assembly, "utf8")

                if (compileOnly) {
                    const objectPath = path.join(parsed.dir, `${parsed.name}.o`)
                    execFileSync("gcc", ["-c", assemblyPath, "-o", objectPath])
                } else {
                    const executablePath = path.join(parsed.dir, parsed.name)
                    execFileSync("gcc", [assemblyPath, "-o", executablePath])
                }

                break
            }
        }
    }
    // const lexer = new Lexer(`
    // int sum(int a, int b, int c, int d, int e, int f, int g, int h, int i, int j) {
    //     return a + b + c + d + e + f + g + h + i + j;
    // }

    // int main(void) {
    //     return sum(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    // }

    //     `)
    // // while (!lexer.isEOF()) {
    // //     console.log(lexer.next())
    // // }
    // const parser = new Parser(lexer)
    // // parser.parse()
    // // console.log(JSON.stringify(parser.parse(), null, 4))
    // // const symbols = new TypeChecker().check(parser.parse())
    // // console.log(JSON.stringify(Object.fromEntries(symbols), null, 4))
    // const validator = new Validator(parser.parse())
    // // const v = validator.validate()
    // // console.log(
    // //     JSON.stringify(
    // //         { ...v, symbols: Object.fromEntries(v.symbols) },
    // //         null,
    // //         4,
    // //     ),
    // // )
    // const tacky = new Tacky(validator.validate().program)
    // // console.log(JSON.stringify(tacky.tackle(), null, 4))
    // const codegen = new Codegen(tacky.tackle())
    // const data = codegen.gen()
    // writeFileSync("program.s", data, "utf8")
    // console.log(data)
}

test()
