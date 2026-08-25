	.globl	main
main:
	movl	$2, -4(%rbp)
	movl	-4(%rbp), %eax
	subl	$1, %eax
	ret