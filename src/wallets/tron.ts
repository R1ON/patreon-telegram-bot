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

    const address = TronWeb.utils.crypto.getAddressFromPriKey(privateKey);

    return {
        privateKey: privateKey.toString('hex').padStart(64, '0'),
        publicKey: publicKey.toString('hex').padStart(64, '0'),
        address: {
            base58: TronWeb.utils.crypto.getBase58CheckAddress(address),
            hex: Buffer.from(address).toString('hex'),
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
        const address = TronWeb.utils.crypto.getAddressFromPriKey(
            Buffer.from(wallet.privateKey, 'hex')
        );

        return TronWeb.utils.crypto.getBase58CheckAddress(address);
    }

    const { address, privateKey } = generateAccount();

    await prisma.wallet.create({
        data: {
            currency: TRON_CURRENCY,
            user: {
                connect: {
                    id: user.id,
                }
            },
            address: address.hex,
            privateKey,
        },
    });

    return address.base58;
}
