.globl main
main:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp

    movl $0, %r10d
    cmpl $0, %r10d
    je .Lconditional_else_0
    movl $2, -4(%rbp)
    jmp .Lconditional_end_1
.Lconditional_else_0:
    movl $3, -4(%rbp)
.Lconditional_end_1:
    movl -4(%rbp), %eax
    jmp .Lreturn_main
    movl $0, %eax
    jmp .Lreturn_main

.Lreturn_main:
    movq %rbp, %rsp
    popq %rbp
    ret

.section .note.GNU-stack,"",@progbits
