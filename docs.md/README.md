# XSDs NFS-e Pública/Itajaí v7.4

Coloque aqui os arquivos XSD fornecidos pela prefeitura/Pública Informática para
validação do XML da NFS-e.

**Arquivos que o backend procura (em ordem):**

1. `enviarLoteRpsEnvio.xsd`
2. `nfse_v7.xsd`

Se os XSDs tiverem outros nomes, renomeie para um dos acima ou edite
`backend/src/services/nfse-publica-validator.service.ts`.

Sem XSDs nesta pasta, o envio da NFS-e **não é bloqueado**; a validação XSD é
opcional.

Veja: `docs.md/NFS-E_XSD_E_DEPLOY_TRUENAS.md`
