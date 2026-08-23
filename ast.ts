export type Program = {
    type: "program"
    function: FunctionDefinition
}

export type FunctionDefinition = {
    type: "function"
    name: string
    body: Statement
}

export type Statement = {
    type: "return"
    expression: Expression
}

export type Expression = {
    type: "constant"
    value: number
}
