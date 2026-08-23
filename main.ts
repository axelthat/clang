#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { Lexer } from "./lexer.ts"

function test() {
    const args = process.argv.slice(2)

    const stage = args[0]
    const path = args[1]

    if (!path) {
        console.error("Usage: ./main.ts <source-file>")
        process.exitCode = 1
    } else {
        const source = readFileSync(path, "utf8")
        if (stage == "--lex") {
            const lexer = new Lexer(source)
            while (!lexer.isEOF()) {
                lexer.scan()
            }
        }
    }
}

test()
