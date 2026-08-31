-- CreateTable
CREATE TABLE "_EventoCalendarioToVeiculo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventoCalendarioToVeiculo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventoCalendarioToVeiculo_B_index" ON "_EventoCalendarioToVeiculo"("B");

-- AddForeignKey
ALTER TABLE "_EventoCalendarioToVeiculo" ADD CONSTRAINT "_EventoCalendarioToVeiculo_A_fkey" FOREIGN KEY ("A") REFERENCES "eventos_calendario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventoCalendarioToVeiculo" ADD CONSTRAINT "_EventoCalendarioToVeiculo_B_fkey" FOREIGN KEY ("B") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
