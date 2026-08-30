export type Program = {
    type: "program"
    declarations: Declaration[]
}

export type Block = {
    type: "block"
    items: BlockItem[]
}

export type BlockItem =
    | {
          type: "declaration"
          declaration: Declaration
      }
    | {
          type: "statement"
          statement: Statement
      }

export type Declaration = FunctionDeclaration | VariableDeclaration

export type Parameter = string

export type FunctionDeclaration = {
    type: "functionDeclaration"
    name: string
    parameters: Parameter[]
    body: Block | null
}

export type VariableDeclaration = {
    type: "variableDeclaration"
    name: string
    init: Expression | null
}

export type Statement =
    | {
          type: "return"
          expression: Expression
      }
    | {
          type: "expression"
          expression: Expression
      }
    | {
          type: "if"
          condition: Expression
          then: Statement
          else: Statement | null
      }
    | {
          type: "compound"
          block: Block
      }
    | {
          type: "while"
          label: string | null
          condition: Expression
          body: Statement
      }
    | {
          type: "doWhile"
          label: string | null
          body: Statement
          condition: Expression
      }
    | {
          type: "for"
          label: string | null
          init: ForInit
          condition: Expression | null
          post: Expression | null
          body: Statement
      }
    | {
          type: "break"
          label: string | null
      }
    | {
          type: "continue"
          label: string | null
      }
    | {
          type: "null"
      }

export type ForInit =
    | {
          type: "declaration"
          declaration: VariableDeclaration
      }
    | {
          type: "expression"
          expression: Expression | null
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
    | {
          type: "variable"
          name: string
      }
    | {
          type: "assignment"
          left: Expression
          right: Expression
      }
    | {
          type: "conditional"
          condition: Expression
          then: Expression
          else: Expression
      }
    | {
          type: "functionCall"
          name: string
          args: Expression[]
      }

export type UnaryOperator = "complement" | "subtract" | "not"

export type BinaryOperator =
    // Arithmetic
    | "add"
    | "subtract"
    | "multiply"
    | "divide"
    | "remainder"

    // Shift
    | "lshift"
    | "rshift"

    // Relational
    | "lt"
    | "le"
    | "gt"
    | "ge"

    // Equality
    | "eq"
    | "ne"

    // Bitwise
    | "band"
    | "xor"
    | "bor"

    // Logical
    | "and"
    | "or"

export type BinaryCompoundOperator =
    // Arithmetic
    | "add_equal"
    | "subtract_equal"
    | "multiply_equal"
    | "divide_equal"
    | "remainder_equal"

    // Shift
    | "lshift_equal"
    | "rshift_equal"

    // Bitwise
    | "band_equal"
    | "xor_equal"
    | "bor_equal"
