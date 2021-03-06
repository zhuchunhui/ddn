/**
 * RootRouter接口
 * wangxm   2019-03-27
 */
import crypto from 'crypto';
import ed from 'ed25519';
import DdnUtils from '@ddn/utils';

class RootRouter {

    constructor(context) {
        Object.assign(this, context);
        this._context = context;
    }

    async put(req) {
        const body = req.body;
        const validateErrors = await this.ddnSchema.validate({
            type: "object",
            properties: {
                secret: {
                    type: "string",
                    minLength: 1
                },
                secondSecret: {
                    type: "string",
                    minLength: 1
                },
                publicKey: {
                    type: "string",
                    format: "publicKey"
                },
                multisigAccountPublicKey: {
                    type: "string",
                    format: "publicKey"
                }
            },
            required: ["secret", "secondSecret"]
        }, body);
        if (validateErrors) {
            throw new Error(validateErrors[0].message);
        }

        const hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
        const keypair = ed.MakeKeypair(hash);

        if (body.publicKey) {
            if (keypair.publicKey.toString('hex') != body.publicKey) {
                throw new Error("Invalid passphrase");
            }
        }

        return new Promise((resolve, reject) => {
            this.balancesSequence.add(async(cb) => {
                if (body.multisigAccountPublicKey &&
                    body.multisigAccountPublicKey != keypair.publicKey.toString('hex')) {

                    var account;
                    try
                    {
                        account = await this.runtime.account.getAccountByPublicKey(body.multisigAccountPublicKey);
                    }
                    catch (err)
                    {
                        return cb(err);
                    }

                    if (!account) {
                        return cb("Multisignature account not found");
                    }

                    if (!account.multisignatures || !account.multisignatures) {
                        return cb("Account does not have multisignatures enabled");
                    }

                    if (!account.multisignatures.includes(keypair.publicKey.toString('hex'))) {
                        return cb("Account does not belong to multisignature group");
                    }

                    if (account.second_signature || account.u_second_signature) {
                        return cb("Invalid second passphrase");
                    }

                    let requester;
                    try
                    {
                        requester = await this.runtime.account.getAccountByPublicKey(keypair.publicKey);
                    }
                    catch (err)
                    {
                        return cb(err);
                    }

                    if (!requester || !requester.publicKey) {
                        return cb("Invalid requester");
                    }

                    if (requester.second_signature && !body.secondSecret) {
                        return cb("Invalid second passphrase");
                    }

                    if (requester.publicKey == account.publicKey) {
                        return cb("Invalid requester");
                    }

                    var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
                    var second_keypair = ed.MakeKeypair(secondHash);

                    var transactions = [];
                    try {
                        var transaction = await this.runtime.transaction.create({
                            type: DdnUtils.assetTypes.SIGNATURE,
                            sender: account,
                            keypair,
                            requester: keypair,
                            second_keypair,
                        });
                        transactions = await this.runtime.transaction.receiveTransactions([transaction]);
                    } catch (e) {
                        return cb(e);
                    }
                    cb(null, transactions);
                } else {
                    var account;
                    try
                    {
                        account = await this.runtime.account.getAccountByPublicKey(keypair.publicKey.toString('hex'));
                    }
                    catch (err) {
                        return cb(err);
                    }

                    if (!account) {
                        return cb("Account not found");
                    }

                    if (account.second_signature && !body.secondSecret) {
                        return cb("Invalid second passphrase");
                    }

                    var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
                    var second_keypair = ed.MakeKeypair(secondHash);

                    var transactions = [];
                    try {
                        var transaction = await this.runtime.transaction.create({
                            type: DdnUtils.assetTypes.SIGNATURE,
                            sender: account,
                            keypair,
                            second_keypair
                        });
                        transactions = await this.runtime.transaction.receiveTransactions([transaction]);
                    } catch (e) {
                        return cb(e);
                    }
                    cb(null, transactions);
                }
            }, (err, transactions) => {
                if (err || !transactions || !transactions.length) {
                    return reject(err || "Create signature transactoin failed.");
                }

                resolve({success: true, transaction: transactions[0]});
            });
        });
    }

    async getFee(req) {
        //   DdnUtils.bignum update
        //   fee = 5 * constants.fixedPoint;
        let fee = DdnUtils.bignum.multiply(5, this.constants.fixedPoint);
        return {fee};
    }

}

export default RootRouter;
