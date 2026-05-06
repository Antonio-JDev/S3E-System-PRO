export enum VendaStatus {
    Pendente = 'Pendente',
    Concluida = 'Concluida',
    Cancelada = 'Cancelada',
    Faturado = 'Faturado', // NF/NFS-e emitida — efetuar cobrança
}

export enum ContaStatus {
    Pendente = 'Pendente',
    RecebidoParcial = 'Recebido Parcial',
    Pago = 'Pago',
    Atrasado = 'Atrasado',
    Cancelado = 'Cancelado',
}
