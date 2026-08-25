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

export type Expression =
    | {
          type: "constant"
          value: number
      }
    | {
          type: "unary"
          operator: UnaryOperator
          expression: Expression
      }
    | {
          type: "binary"
          operator: BinaryOperator
          left: Expression
          right: Expression
      }

export type UnaryOperator = "complement" | "negate"

export type BinaryOperator =
    | "add"
    | "negate"
    | "multiply"
    | "divide"
    | "remainder"
