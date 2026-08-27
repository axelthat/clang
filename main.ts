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
    // const args = process.argv.slice(2)
    // let stage: string | undefined
    // let location: string | undefined
    // if (args[0]?.startsWith("--")) {
    //     stage = args[0]
    //     location = args[1]
    // } else {
    //     location = args[0]
    // }
    // if (!location) {
    //     console.error("Usage: ./main.ts <source-file>")
    //     process.exitCode = 1
    // } else {
    //     const source = readFileSync(location, "utf8")
    //     switch (stage) {
    //         case "--lex": {
    //             const lexer = new Lexer(source)
    //             while (lexer.next().type !== "eof") {}
    //             break
    //         }

    //         case "--parse": {
    //             const parser = new Parser(new Lexer(source))
    //             parser.parse()
    //             break
    //         }

    //         case "--validate": {
    //             const parser = new Parser(new Lexer(source))
    //             const validator = new Validator(parser.parse())
    //             validator.validate()
    //             break
    //         }

    //         case "--tacky": {
    //             const parser = new Parser(new Lexer(source))
    //             const validator = new Validator(parser.parse())
    //             const tacky = new Tacky(validator.validate())
    //             tacky.tackle()
    //             break
    //         }

    //         case "--codegen": {
    //             const parser = new Parser(new Lexer(source))
    //             const validator = new Validator(parser.parse())
    //             const tacky = new Tacky(validator.validate())
    //             const codegen = new Codegen(tacky.tackle())
    //             codegen.gen()
    //             break
    //         }

    //         default: {
    //             const parser = new Parser(new Lexer(source))
    //             const validator = new Validator(parser.parse())
    //             const tacky = new Tacky(validator.validate())
    //             const codegen = new Codegen(tacky.tackle())
    //             const assembly = codegen.gen()
    //             const parsed = path.parse(location)
    //             const assemblyPath = path.join(parsed.dir, `${parsed.name}.s`)
    //             const executablePath = path.join(parsed.dir, `${parsed.name}`)
    //             writeFileSync(assemblyPath, assembly, "utf8")
    //             execFileSync("gcc", [assemblyPath, "-o", executablePath])
    //             break
    //         }
    //     }
    // }
    const lexer = new Lexer(`
    int main(void) {
        return 0 ? 2 : 3;
    }
                            `)
    // while (!lexer.isEOF()) {
    //     console.log(lexer.next())
    // }
    const parser = new Parser(lexer)
    // // // // parser.parse()
    // console.log(JSON.stringify(parser.parse(), null, 4))
    const validator = new Validator(parser.parse())
    // console.log(JSON.stringify(validator.validate(), null, 4))
    const tacky = new Tacky(validator.validate())
    // console.log(JSON.stringify(tacky.tackle(), null, 4))
    const codegen = new Codegen(tacky.tackle())
    const data = codegen.gen()
    writeFileSync("program.s", data, "utf8")
    console.log(data)
}

test()
