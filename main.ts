#!/usr/bin/env node

import { Lexer } from "./lexer.ts"

function test() {
    const lexer = new Lexer(`
int main() {
    return 123;
}
    `)
    while (!lexer.isEOF()) {
        console.log(lexer.scan())
    }
}

test()
