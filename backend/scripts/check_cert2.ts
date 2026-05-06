import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import { PrismaClient } from '@prisma/client';
import { resolveCertificadoPath } from '../src/utils/certificadoPath.util';

const prisma = new PrismaClient();

async function main(){
  const empresaId = process.argv[2] || 'd6588e41-e964-4df6-9a63-d32df62a5964';
  console.log('Checking empresaId:', empresaId);
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id: empresaId } });
  if(!empresa){
    console.error('Empresa not found');
    process.exit(2);
  }
  console.log('Empresa CNPJ:', empresa.cnpj || empresa.cnpjFiscal || 'N/A');
  console.log('Cert path (db):', empresa.certificadoPath);

  const pfxPath = resolveCertificadoPath(empresa.certificadoPath || '');
  console.log('Resolved pfx path:', pfxPath);
  if(!pfxPath || !fs.existsSync(pfxPath)){
    console.error('PFX file not found at path');
    process.exit(3);
  }

  const pfxBinary = fs.readFileSync(pfxPath, { encoding: 'binary' });
  const pfxBuffer = Buffer.from(pfxBinary, 'binary');
  console.log('PFX size bytes:', pfxBuffer.length);

  const CryptoUtil = require('../src/utils/crypto.util').CryptoUtil;
  const senha = (empresa.certificadoSenha) ? CryptoUtil.decrypt(empresa.certificadoSenha) : '';
  console.log('Senha length (chars):', senha ? senha.length : 0);

  try{
    const p12Asn1 = forge.asn1.fromDer(pfxBinary);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha);
    let cert: any = null;
    for(const sc of p12.safeContents || []){
      for(const sb of sc.safeBags || []){
        if(sb.cert){ cert = sb.cert; break; }
      }
      if(cert) break;
    }
    if(!cert){ console.error('No cert found inside PFX'); process.exit(4); }
    const subject = cert.subject.attributes.map((a:any)=>({name:a.name, type:a.type, value:a.value}));
    console.log('Cert subject attrs:', subject);
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    console.log('Valid from:', notBefore);
    console.log('Valid to  :', notAfter);
    const now = new Date();
    console.log('Now       :', now);
    console.log('Expired? ', now > notAfter);
  }catch(err:any){
    console.error('Failed parsing PFX:', err && err.message ? err.message : err);
    process.exit(5);
  }
  process.exit(0);
}
main();
