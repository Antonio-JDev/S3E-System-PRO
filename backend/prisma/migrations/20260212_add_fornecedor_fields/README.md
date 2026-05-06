# Migration: add_fornecedor_fields

## Descrição

Adiciona colunas opcionais à tabela `fornecedores` para armazenar informações retornadas
pela BrasilAPI (CNPJ) utilizadas em faturamento e integração fiscal:

- `bairro` TEXT
- `cidade` TEXT
- `estado` TEXT
- `cep` TEXT
- `cnae_fiscal` INTEGER
- `codigo_municipio_ibge` INTEGER
- `situacao_cadastral` INTEGER

## Como aplicar

Esta migration foi gerada para ser aplicada pelo processo de migrações (Prisma).
Quando o container do backend subir, execute (ou verifique se o entrypoint já
executa) o comando:

```bash
npx prisma migrate deploy
```

ou, em ambiente de desenvolvimento:

```bash
npx prisma migrate dev --name add_fornecedor_fields
```

## Observações

- As instruções SQL usam `IF NOT EXISTS` para serem seguras em ambientes onde
  algumas colunas já existam.
-- Após aplicar, reinicie o backend se necessário.

