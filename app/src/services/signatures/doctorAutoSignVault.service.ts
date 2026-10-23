// src/services/signatures/doctorAutoSignVault.service.ts
import forge from 'node-forge';
import {
  PDFDocument,
  PDFName,
  PDFHexString,
  PDFString,
  PDFArray,
  PDFNumber,
} from 'pdf-lib';

export interface IcpBrasilCertificateDetails {
  subjectCn: string;
  issuerCn: string;
  serialHex: string;
  thumbprintSha256: string;
  icpCpf?: string;
  icpCnpj?: string;
  notBeforeIso: string;
  notAfterIso: string;
  daysRemaining: number;
  isValidNow: boolean;
}

export interface PadesAutoSignOutput {
  certificateDetails: IcpBrasilCertificateDetails;
  pkcs7DetachedHex: string;
  padesPdfBytes: Uint8Array;
  padesPdfBase64: string;
  finalPdfSha256: string;
  signedAtUtc: string;
  signedAtBrt: string;
}

export class DoctorAutoSignVaultService {
  /**
   * Converte ArrayBuffer / Uint8Array para Base64 de forma segura em qualquer runtime
   */
  private static toBase64(bytes: ArrayBuffer | Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes as any).toString('base64');
    }
    const u8 = new Uint8Array(bytes);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)));
    }
    return btoa(binary);
  }

  /**
   * Converte Base64 para Uint8Array de forma segura em qualquer runtime
   */
  private static fromBase64(base64: string): Uint8Array {
    const clean = base64.replace(/^data:[^;]+;base64,/, '');
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(clean, 'base64'));
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Deriva uma chave AES-256-GCM de 256 bits a partir da variável de ambiente VAULT_MASTER_KEY
   */
  private static async deriveMasterAesKey(masterSecret: string): Promise<CryptoKey> {
    if (!masterSecret || masterSecret.trim().length < 32) {
      throw new Error(
        'VAULT_MASTER_KEY inválida: a chave mestra de criptografia do cofre deve ter no mínimo 32 caracteres (256 bits de entropia).'
      );
    }
    const rawHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(masterSecret)
    );
    return crypto.subtle.importKey('raw', rawHash, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  /**
   * Criptografa o binário Base64 do arquivo .pfx e a senha usando AES-256-GCM
   */
  static async encryptPfxAndPassword(params: {
    pfxBase64: string;
    password: string;
    masterSecret: string;
  }): Promise<{
    encryptedPfxBase64: string;
    encryptedPasswordBase64: string;
    ivHex: string;
  }> {
    const aesKey = await this.deriveMasterAesKey(params.masterSecret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const cleanPfx = params.pfxBase64.replace(/^data:[^;]+;base64,/, '');

    const encPfxBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(cleanPfx)
    );

    const encPassBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(params.password)
    );

    return {
      encryptedPfxBase64: this.toBase64(encPfxBuffer),
      encryptedPasswordBase64: this.toBase64(encPassBuffer),
      ivHex,
    };
  }

  /**
   * Descriptografa o .pfx e a senha em memória RAM exclusivamente no instante de assinar
   */
  static async decryptPfxAndPassword(params: {
    encryptedPfxBase64: string;
    encryptedPasswordBase64: string;
    ivHex: string;
    masterSecret: string;
  }): Promise<{ pfxBase64: string; password: string }> {
    const aesKey = await this.deriveMasterAesKey(params.masterSecret);
    const ivBytes = new Uint8Array(
      params.ivHex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) || []
    );

    const decPfxBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      aesKey,
      this.fromBase64(params.encryptedPfxBase64) as unknown as ArrayBuffer
    );

    const decPassBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      aesKey,
      this.fromBase64(params.encryptedPasswordBase64) as unknown as ArrayBuffer
    );

    return {
      pfxBase64: new TextDecoder().decode(decPfxBuffer),
      password: new TextDecoder().decode(decPassBuffer),
    };
  }

  /**
   * Extrai CPF (OID 2.16.76.1.3.1) e CNPJ (OID 2.16.76.1.3.3) da extensão SubjectAltName ICP-Brasil
   */
  private static extractIcpBrasilTaxIds(cert: forge.pki.Certificate): {
    icpCpf?: string;
    icpCnpj?: string;
  } {
    let icpCpf: string | undefined;
    let icpCnpj: string | undefined;

    try {
      const sanExt = cert.getExtension('subjectAltName') as any;
      if (sanExt && sanExt.value) {
        const rawBytes: string = sanExt.value;
        // No padrão ICP-Brasil, o OID 2.16.76.1.3.1 armazena DataNasc(8) + CPF(11)
        const cpfMatch = rawBytes.match(/\d{8}(\d{11})/);
        if (cpfMatch && cpfMatch[1]) {
          icpCpf = cpfMatch[1];
        }
        // O OID 2.16.76.1.3.3 armazena os 14 dígitos do CNPJ
        const cnpjMatch = rawBytes.match(/(\d{14})/);
        if (cnpjMatch && cnpjMatch[1]) {
          icpCnpj = cnpjMatch[1];
        }
      }

      // Fallback: Extrai CPF/CNPJ do próprio Common Name (Ex: "DRA ANA CARLA MORONG:54811772000132")
      const cnValue = String(cert.subject.getField('CN')?.value || '');
      const cnDigits = cnValue.split(':')[1]?.replace(/\D/g, '');
      if (cnDigits?.length === 11 && !icpCpf) icpCpf = cnDigits;
      if (cnDigits?.length === 14 && !icpCnpj) icpCnpj = cnDigits;
    } catch {
      // Continua silenciosamente caso a extensão tenha formato proprietário
    }

    return { icpCpf, icpCnpj };
  }

  /**
   * Faz o parse completo do arquivo PKCS#12 (.pfx/.p12), valida a senha e retorna
   * a chave privada RSA, o certificado principal X.509 e a cadeia completa da AC ICP-Brasil
   */
  static parseAndValidateIcpPfx(
    pfxBase64: string,
    password: string
  ): {
    details: IcpBrasilCertificateDetails;
    privateKey: forge.pki.rsa.PrivateKey;
    leafCert: forge.pki.Certificate;
    certificateChain: forge.pki.Certificate[];
  } {
    const cleanBase64 = pfxBase64.replace(/^data:[^;]+;base64,/, '');
    const pfxDer = forge.util.decode64(cleanBase64);
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);

    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
    } catch {
      throw new Error(
        'Senha incorreta ou arquivo .pfx/.p12 inválido. Verifique a senha do seu Certificado Digital ICP-Brasil.'
      );
    }

    // 1. Extrai a chave privada
    const shroudedBags =
      p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
        forge.pki.oids.pkcs8ShroudedKeyBag
      ] || [];
    const plainKeyBags =
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [];

    const privateKey = (shroudedBags[0]?.key || plainKeyBags[0]?.key) as
      | forge.pki.rsa.PrivateKey
      | undefined;

    if (!privateKey) {
      throw new Error(
        'Chave privada RSA não encontrada no arquivo .pfx. Certifique-se de exportar o certificado A1 com a chave privada incluída.'
      );
    }

    // 2. Extrai todos os certificados X.509 da cadeia
    const certBags =
      p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    const certificateChain = certBags
      .map((b) => b.cert)
      .filter((c): c is forge.pki.Certificate => Boolean(c));

    if (certificateChain.length === 0) {
      throw new Error('Nenhum certificado X.509 encontrado dentro do arquivo .pfx.');
    }

    // Identifica o certificado titular (aquele que não é Autoridade Certificadora BasicConstraints CA=true)
    const leafCert =
      certificateChain.find((c) => {
        const bc = c.getExtension('basicConstraints') as any;
        return !bc || !bc.cA;
      }) || certificateChain[0];

    const subjectCn = String(
      leafCert.subject.getField('CN')?.value || 'Dra. Ana Carla Morong'
    );
    const issuerCn = String(
      leafCert.issuer.getField('CN')?.value || 'Autoridade Certificadora ICP-Brasil'
    );
    const serialHex = leafCert.serialNumber.toUpperCase();

    // Calcula o Thumbprint SHA-256 do certificado X.509 em DER
    const certDerBytes = forge.asn1
      .toDer(forge.pki.certificateToAsn1(leafCert))
      .getBytes();
    const mdSha256 = forge.md.sha256.create();
    mdSha256.update(certDerBytes);
    const thumbprintSha256 = mdSha256.digest().toHex().toUpperCase();

    const { icpCpf, icpCnpj } = this.extractIcpBrasilTaxIds(leafCert);

    const now = new Date();
    const notBefore = leafCert.validity.notBefore;
    const notAfter = leafCert.validity.notAfter;
    const isValidNow = now >= notBefore && now <= notAfter;
    const daysRemaining = Math.floor(
      (notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      details: {
        subjectCn,
        issuerCn,
        serialHex,
        thumbprintSha256,
        icpCpf,
        icpCnpj,
        notBeforeIso: notBefore.toISOString(),
        notAfterIso: notAfter.toISOString(),
        daysRemaining,
        isValidNow,
      },
      privateKey,
      leafCert,
      certificateChain,
    };
  }

  /**
   * Executa a Assinatura Digital Qualificada PAdES / PKCS#7 automaticamente sobre o PDF
   */
  static async signPdfWithDoctorVaultCertificate(params: {
    pdfBytesToSign: Uint8Array;
    pfxBase64: string;
    password: string;
    documentTitle: string;
    verificationCode: string;
  }): Promise<PadesAutoSignOutput> {
    const { details, privateKey, leafCert, certificateChain } =
      this.parseAndValidateIcpPfx(params.pfxBase64, params.password);

    if (!details.isValidNow) {
      throw new Error(
        `O Certificado ICP-Brasil (${details.subjectCn}) está fora do prazo de validade (Expiração: ${new Date(
          details.notAfterIso
        ).toLocaleDateString('pt-BR')}).`
      );
    }

    const now = new Date();
    const signedAtUtc = now.toISOString();
    const signedAtBrt = now.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });

    // 1. Constrói o envelope CMS / PKCS#7 SignedData (Padrão ICP-Brasil SHA-256)
    const p7 = forge.pkcs7.createSignedData();

    let rawBinaryString = '';
    const chunk = 0x8000;
    for (let i = 0; i < params.pdfBytesToSign.length; i += chunk) {
      const slice = params.pdfBytesToSign.subarray(i, i + chunk);
      rawBinaryString += String.fromCharCode.apply(null, Array.from(slice));
    }
    p7.content = forge.util.createBuffer(rawBinaryString, 'raw');

    // Embute toda a cadeia ICP-Brasil (AC Raiz + Intermediárias + Certificado da Dra. Ana)
    for (const cert of certificateChain) {
      p7.addCertificate(cert);
    }

    p7.addSigner({
      key: privateKey,
      certificate: leafCert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: now as unknown as string,
        },
      ],
    });

    p7.sign({ detached: true });
    const pkcs7Der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const pkcs7DetachedHex = forge.util.bytesToHex(pkcs7Der).toUpperCase();

    // 2. Insere o dicionário /Type /Sig (PAdES / adbe.pkcs7.detached) e metadados no PDF
    const pdfDoc = await PDFDocument.load(params.pdfBytesToSign);
    const context = pdfDoc.context;

    const byteRangeArray = PDFArray.withContext(context);
    byteRangeArray.push(PDFNumber.of(0));
    byteRangeArray.push(PDFNumber.of(params.pdfBytesToSign.length));
    byteRangeArray.push(PDFNumber.of(params.pdfBytesToSign.length));
    byteRangeArray.push(PDFNumber.of(0));

    const signatureDictionary = context.obj({
      Type: PDFName.of('Sig'),
      Filter: PDFName.of('Adobe.PPKLite'),
      SubFilter: PDFName.of('adbe.pkcs7.detached'),
      Name: PDFString.of(details.subjectCn),
      Location: PDFString.of(
        'Tv. do Motorista, nº 82, Canto, Florianópolis - SC, CEP 88075-550'
      ),
      Reason: PDFString.of(
        `Assinatura Qualificada ICP-Brasil — ${params.documentTitle} (Código: ${params.verificationCode})`
      ),
      ContactInfo: PDFString.of('financeiro@draanamorong.com.br | (48) 98857-2882'),
      M: PDFString.fromDate(now),
      ByteRange: byteRangeArray,
      Contents: PDFHexString.of(pkcs7DetachedHex),
    });

    const sigRef = context.register(signatureDictionary);
    pdfDoc.catalog.set(PDFName.of('Perms'), context.obj({ DocMDP: sigRef }));

    pdfDoc.setTitle(`${params.documentTitle} [${params.verificationCode}]`);
    pdfDoc.setAuthor('Dra. Ana Carla Morong (CNPJ: 54.811.772/0001-32)');
    pdfDoc.setProducer('Motor Criptográfico PAdES ICP-Brasil — Dra. Ana Morong');
    pdfDoc.setKeywords([
      'ICP-Brasil',
      'PAdES',
      `Serial:${details.serialHex}`,
      `Thumbprint:${details.thumbprintSha256}`,
      `VerificationCode:${params.verificationCode}`,
    ]);

    const padesPdfBytes = await pdfDoc.save({ useObjectStreams: false });

    // 3. Calcula o Hash SHA-256 final do PDF selado
    const hashBuffer = await crypto.subtle.digest('SHA-256', padesPdfBytes as unknown as ArrayBuffer);
    const finalPdfSha256 = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const padesPdfBase64 = this.toBase64(padesPdfBytes);

    return {
      certificateDetails: details,
      pkcs7DetachedHex,
      padesPdfBytes,
      padesPdfBase64,
      finalPdfSha256,
      signedAtUtc,
      signedAtBrt,
    };
  }
}
