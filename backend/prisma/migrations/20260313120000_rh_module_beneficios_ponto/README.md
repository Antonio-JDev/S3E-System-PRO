# Migration: Módulo RH (Benefícios, Ponto, Folha)

- **Enum** `TipoContratoFuncionario` (REGISTRADO, AUTONOMO).
- **Funcionarios**: colunas `salarioBase`, `valorHora`, `tipoContrato`.
- **Tabelas novas**: `beneficios`, `configuracoes_ponto`, `registros_ponto`,
  `_BeneficioToFuncionario`.

Será aplicada automaticamente ao subir o backend com `npx prisma migrate deploy`
(ex.: no Docker).
