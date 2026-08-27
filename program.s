.globl main
main:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp

    movl $1, -4(%rbp)
    movl $2, -8(%rbp)
    movl $4, -8(%rbp)
    movl -8(%rbp), %r10d
    movl %r10d, -4(%rbp)
    movl -4(%rbp), %eax
    jmp .Lreturn_main
    movl $0, %eax
    jmp .Lreturn_main

.Lreturn_main:
    movq %rbp, %rsp
    popq %rbp
    ret

.section .note.GNU-stack,"",@progbits
