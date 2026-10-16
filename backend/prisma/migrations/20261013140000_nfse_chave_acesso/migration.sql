-- Chave de acesso da NFS-e nacional (50 dígitos). Nula nas notas antigas da Pública.
ALTER TABLE "nfse" ADD COLUMN "chaveAcesso" TEXT;

CREATE UNIQUE INDEX "nfse_chaveAcesso_key" ON "nfse"("chaveAcesso");
