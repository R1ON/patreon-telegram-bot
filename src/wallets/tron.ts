import { User, Wallet } from '@prisma/client';
import { prisma } from '../prisma';
import { createECDH, ECDH } from 'crypto';

// @ts-ignore
import TronWeb from 'tronweb';

function generateAccount() {
    const ecdh = createECDH('secp256k1');
    ecdh.generateKeys();

    const privateKey = ecdh.getPrivateKey();
    const publicKey = ecdh.getPublicKey();

    const adress = TronWeb.utils.crypto.getAddressFromPriKey(privateKey);

    return {
        privateKey: privateKey.toString('hex').padStart(64, '0'),
        publicKey: publicKey.toString('hex').padStart(64, '0'),
        adress: {
            base58: TronWeb.utils.crypto.getBase58CheckAddress(adress),
            hex: Buffer.from(adress).toString('hex'),
        },
    };
}

export const TRON_CURRENCY = 'trx';

export async function getOrCreateWallet(user: User): Promise<string> {
    const wallet = await prisma.wallet.findFirst({
        where: {
            userId: user.id,
            currency: TRON_CURRENCY,
        },
    });

    if (wallet) {
        const adress = TronWeb.utils.crypto.getAddressFromPriKey(wallet.privateKey);

        return TronWeb.utils.crypto.getBase58CheckAddress(adress);
    }

    const { adress, privateKey } = generateAccount();

    await prisma.wallet.create({
        data: {
            currency: TRON_CURRENCY,
            user: {
                connect: {
                    id: user.id,
                }
            },
            adress: adress.hex,
            privateKey,
        },
    });

    return adress.base58;
}
