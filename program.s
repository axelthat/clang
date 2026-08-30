.globl sum
sum:
    pushq %rbp
    movq %rsp, %rbp
    subq $80, %rsp

    movl %edi, -4(%rbp)
    movl %esi, -8(%rbp)
    movl %edx, -12(%rbp)
    movl %ecx, -16(%rbp)
    movl %r8d, -20(%rbp)
    movl %r9d, -24(%rbp)
    movl 16(%rbp), %r10d
    movl %r10d, -28(%rbp)
    movl 24(%rbp), %r10d
    movl %r10d, -32(%rbp)
    movl 32(%rbp), %r10d
    movl %r10d, -36(%rbp)
    movl 40(%rbp), %r10d
    movl %r10d, -40(%rbp)

    movl -4(%rbp), %r10d
    movl %r10d, -44(%rbp)
    movl -8(%rbp), %r10d
    addl %r10d, -44(%rbp)
    movl -44(%rbp), %r10d
    movl %r10d, -48(%rbp)
    movl -12(%rbp), %r10d
    addl %r10d, -48(%rbp)
    movl -48(%rbp), %r10d
    movl %r10d, -52(%rbp)
    movl -16(%rbp), %r10d
    addl %r10d, -52(%rbp)
    movl -52(%rbp), %r10d
    movl %r10d, -56(%rbp)
    movl -20(%rbp), %r10d
    addl %r10d, -56(%rbp)
    movl -56(%rbp), %r10d
    movl %r10d, -60(%rbp)
    movl -24(%rbp), %r10d
    addl %r10d, -60(%rbp)
    movl -60(%rbp), %r10d
    movl %r10d, -64(%rbp)
    movl -28(%rbp), %r10d
    addl %r10d, -64(%rbp)
    movl -64(%rbp), %r10d
    movl %r10d, -68(%rbp)
    movl -32(%rbp), %r10d
    addl %r10d, -68(%rbp)
    movl -68(%rbp), %r10d
    movl %r10d, -72(%rbp)
    movl -36(%rbp), %r10d
    addl %r10d, -72(%rbp)
    movl -72(%rbp), %r10d
    movl %r10d, -76(%rbp)
    movl -40(%rbp), %r10d
    addl %r10d, -76(%rbp)
    movl -76(%rbp), %eax
    jmp .Lreturn_sum
    movl $0, %eax
    jmp .Lreturn_sum

.Lreturn_sum:
    movq %rbp, %rsp
    popq %rbp
    ret

.globl main
main:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp

    movl $1, %edi
    movl $2, %esi
    movl $3, %edx
    movl $4, %ecx
    movl $5, %r8d
    movl $6, %r9d
    pushq $10
    pushq $9
    pushq $8
    pushq $7
    call sum
    addq $32, %rsp
    movl %eax, -4(%rbp)
    movl -4(%rbp), %eax
    jmp .Lreturn_main
    movl $0, %eax
    jmp .Lreturn_main

.Lreturn_main:
    movq %rbp, %rsp
    popq %rbp
    ret

.section .note.GNU-stack,"",@progbits
