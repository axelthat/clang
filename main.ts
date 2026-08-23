#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { Lexer } from "./lexer.ts"
import { Parser } from "./parser.ts"

function test() {
    const args = process.argv.slice(2)

    const stage = args[0]
    const path = args[1]

    if (!path) {
        console.error("Usage: ./main.ts <source-file>")
        process.exitCode = 1
    } else {
        const source = readFileSync(path, "utf8")

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
        }
    }
    // const lexer = new Lexer(`
    // int main( {
    //     return 0;
    // }
    //     `)
    // new Parser(lexer).parse()
}

test()
