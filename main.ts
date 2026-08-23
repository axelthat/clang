#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"
import { Codegen } from "./codegen.ts"

function test() {
    const args = process.argv.slice(2)

    let stage: string | undefined
    let location: string | undefined

    if (args[0]?.startsWith("--")) {
        stage = args[0]
        location = args[1]
    } else {
        location = args[0]
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

            case "--codegen": {
                const parser = new Parser(new Lexer(source))
                const codegen = new Codegen(parser.parse())
                codegen.gen()

                break
            }

            default: {
                const parser = new Parser(new Lexer(source))
                const codegen = new Codegen(parser.parse())
                const assembly = codegen.gen()

                const parsed = path.parse(location)
                const assemblyPath = path.join(parsed.dir, `${parsed.name}.s`)
                const executablePath = path.join(parsed.dir, `${parsed.name}`)

                writeFileSync(assemblyPath, assembly, "utf8")
                execFileSync("gcc", [assemblyPath, "-o", executablePath])

                break
            }
        }
    }
    //     const lexer = new Lexer(`
    // int	main	(	void)	{	return	0	;	}
    //         `)
    //     const parser = new Parser(lexer)
    //     // console.log(JSON.stringify(parser.parse(), null, 4))
    //     const codegen = new Codegen(parser.parse())
    //     const data = codegen.gen()
    //     // writeFileSync("program.s", data, "utf8")
    //     console.log(data)
}

test()
